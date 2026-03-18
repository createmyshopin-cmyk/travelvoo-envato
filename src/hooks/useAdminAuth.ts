import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves the current hostname to a tenant_id via the tenant_domains table.
 * Returns null when running on the root domain (no subdomain / localhost).
 */
export async function resolveTenantFromHostname(): Promise<string | null> {
  const hostname = window.location.hostname; // e.g. "acme.travelvoo.in" or "localhost"
  const parts = hostname.split(".");

  // On localhost or a single-segment host there is no subdomain
  if (parts.length < 2) return null;

  // Try matching by custom_domain first, then subdomain
  const { data: byCustom } = await supabase
    .from("tenant_domains")
    .select("tenant_id")
    .eq("custom_domain", hostname)
    .maybeSingle();

  if (byCustom?.tenant_id) return byCustom.tenant_id;

  // Extract the leftmost segment as a subdomain
  const subdomain = parts[0];

  const { data: bySub } = await supabase
    .from("tenant_domains")
    .select("tenant_id")
    .eq("subdomain", subdomain)
    .maybeSingle();

  return bySub?.tenant_id ?? null;
}

export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        navigate("/admin/login");
        return;
      }

      setUser(session.user);

      // Verify the user has the admin role
      const { data: hasRole, error: roleError } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (roleError || !hasRole) {
        setLoading(false);
        navigate("/admin/login");
        return;
      }

      // Resolve which tenant this subdomain belongs to
      const resolvedTenantId = await resolveTenantFromHostname();

      if (resolvedTenantId) {
        // Verify the logged-in user actually owns this tenant
        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("id")
          .eq("id", resolvedTenantId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!tenantRow) {
          // This user is an admin but NOT the owner of this specific subdomain
          await supabase.auth.signOut();
          setLoading(false);
          navigate("/admin/login");
          return;
        }

        setTenantId(resolvedTenantId);
      } else {
        // No subdomain (localhost / root domain).
        // Look up the tenant that belongs to THIS specific logged-in user.
        // Must match user_id exactly — never fall back to "first tenant in DB".
        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!tenantRow) {
          // Authenticated admin but no tenant found for their user_id (e.g. super_admin
          // with no personal tenant). Allow access but without a specific tenant scope.
          setTenantId(null);
        } else {
          setTenantId(tenantRow.id);
        }
      }

      setIsAdmin(true);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAdmin(false);
        setUser(null);
        setTenantId(null);
        navigate("/admin/login");
      }
    });

    checkAdmin();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return { loading, isAdmin, user, tenantId, signOut };
}
