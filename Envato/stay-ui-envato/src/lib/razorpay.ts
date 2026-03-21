import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
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

interface CheckoutParams {
  tenantId: string;
  planId: string;
  planName: string;
  amount: number; // in rupees
  tenantName: string;
  email: string;
  phone: string;
  onSuccess: (txId: string) => void;
  onError: (error: string) => void;
}

export async function initiateRazorpayCheckout({
  tenantId, planId, planName, amount, tenantName, email, phone, onSuccess, onError,
}: CheckoutParams) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onError("Failed to load Razorpay SDK");
    return;
  }

  // Get auth session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    onError("Not authenticated");
    return;
  }

  // Create order via edge function
  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: { tenant_id: tenantId, plan_id: planId, amount, currency: "INR" },
  });

  if (error || !data?.order_id) {
    onError(error?.message || data?.error || "Failed to create order");
    return;
  }

  const options = {
    key: data.key_id,
    amount: data.amount,
    currency: data.currency,
    name: "StayFinder Platform",
    description: `${planName} Plan Subscription`,
    order_id: data.order_id,
    prefill: {
      name: tenantName,
      email,
      contact: phone,
    },
    theme: { color: "#6366f1" },
    handler: async (response: any) => {
      // Verify payment
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
        body: {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          tenant_id: tenantId,
          plan_id: planId,
          amount,
          currency: "INR",
        },
      });

      if (verifyError || !verifyData?.success) {
        onError(verifyError?.message || verifyData?.error || "Payment verification failed");
        return;
      }

      onSuccess(verifyData.transaction_id);
    },
    modal: {
      ondismiss: () => {
        // User closed the popup
      },
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.on("payment.failed", (response: any) => {
    onError(response.error?.description || "Payment failed");
  });
  razorpay.open();
}
