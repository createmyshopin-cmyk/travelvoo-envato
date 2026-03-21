import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

export function useSaasAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        router.replace("/saas-admin/login");
        return;
      }

      setUser(session.user);

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "super_admin" as any,
      });

      if (error || !data) {
        setLoading(false);
        router.replace("/saas-admin/login");
        return;
      }

      setIsSuperAdmin(true);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsSuperAdmin(false);
        setUser(null);
        router.replace("/saas-admin/login");
      }
    });

    check();
    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/saas-admin/login");
  };

  return { loading, isSuperAdmin, user, signOut };
}
