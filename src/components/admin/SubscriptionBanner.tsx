import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { AlertCircle, Clock, AlertTriangle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SubscriptionBanner() {
  const { loading, status, isExpired, isTrial, daysRemaining } = useSubscriptionGuard();
  const router = useRouter();

  if (loading) return null;

  // Suspended by super admin
  if (status === "suspended") {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 flex items-center justify-between rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <ShieldOff className="h-5 w-5" />
          <span className="font-medium">Your account has been suspended. Contact support for assistance.</span>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 flex items-center justify-between rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Your subscription has expired. Renew to continue using all features.</span>
        </div>
        <Button size="sm" variant="destructive" onClick={() => router.push("/admin/account/billing")}>
          Renew Now
        </Button>
      </div>
    );
  }

  if (isTrial && daysRemaining !== null && daysRemaining <= 7) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 flex items-center justify-between rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Trial ending in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}. Upgrade to keep your resort online.</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push("/admin/account/billing")}>
          Upgrade Plan
        </Button>
      </div>
    );
  }

  if (isTrial) {
    return (
      <div className="bg-primary/5 border border-primary/20 text-primary px-4 py-3 flex items-center justify-between rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">You&apos;re on a free trial{daysRemaining !== null ? ` — ${daysRemaining} days remaining` : ""}.</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.push("/admin/account/billing")}>
          View Plans
        </Button>
      </div>
    );
  }

  return null;
}
