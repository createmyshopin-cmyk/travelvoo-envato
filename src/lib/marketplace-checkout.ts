import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: (r: unknown) => void) => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function payForMarketplaceItem(
  marketplaceItemId: string,
  opts: {
    tenantName: string;
    email: string;
    phone: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
  }
) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    opts.onError("Not signed in");
    return;
  }

  const res = await fetch("/api/marketplace/create-order", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: marketplaceItemId }),
  });
  const data = (await res.json()) as {
    error?: string;
    order_id?: string;
    key_id?: string;
    amount?: number;
    currency?: string;
    item_name?: string;
  };

  if (!res.ok || !data.order_id || !data.key_id || data.amount == null) {
    opts.onError(data.error || "Could not start checkout");
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    opts.onError("Failed to load Razorpay");
    return;
  }

  const options = {
    key: data.key_id,
    amount: data.amount,
    currency: data.currency || "INR",
    order_id: data.order_id,
    name: "Marketplace",
    description: data.item_name || "Marketplace item",
    prefill: { name: opts.tenantName, email: opts.email, contact: opts.phone },
    theme: { color: "#6366f1" },
    handler: async (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const verify = await fetch("/api/marketplace/verify-payment", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          marketplace_item_id: marketplaceItemId,
        }),
      });
      const v = (await verify.json()) as { success?: boolean; error?: string };
      if (!verify.ok || !v.success) {
        opts.onError(v.error || "Verification failed");
        return;
      }
      opts.onSuccess();
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (r: unknown) => {
    const err = r as { error?: { description?: string } };
    opts.onError(err.error?.description || "Payment failed");
  });
  rzp.open();
}
