"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatMoneyAmount,
  formatMoneyCompact,
  getStoredCurrencyCode,
  currencySymbol,
  type PlatformCurrencyCode,
} from "@/lib/currency";

const EVENT = "stay-platform-currency-change";

export type CurrencyContextValue = {
  code: PlatformCurrencyCode;
  format: (amount: number) => string;
  /** Shorter display for large numbers (e.g. calendar cells). */
  formatCompact: (amount: number) => string;
  symbol: string;
};

const defaultValue: CurrencyContextValue = {
  code: "USD",
  format: (n) => formatMoneyAmount(n, "USD"),
  formatCompact: (n) => formatMoneyCompact(n, "USD"),
  symbol: "$",
};

const CurrencyContext = createContext<CurrencyContextValue>(defaultValue);

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<PlatformCurrencyCode>(() => getStoredCurrencyCode());

  const applyCode = useCallback((next: string) => {
    const c = (["USD", "INR", "EUR", "GBP"].includes(next) ? next : "USD") as PlatformCurrencyCode;
    setCode(c);
  }, []);

  useEffect(() => {
    const onStorage = () => applyCode(getStoredCurrencyCode());
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent<string>).detail;
      if (typeof d === "string") applyCode(d);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, onCustom as EventListener);
    };
  }, [applyCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("saas_platform_settings")
        .select("setting_value")
        .eq("setting_key", "default_currency")
        .maybeSingle();
      const row = data as { setting_value?: string } | null;
      if (cancelled || !row?.setting_value) return;
      applyCode(row.setting_value);
      try {
        const raw = localStorage.getItem("saas_platform_settings");
        const obj = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          "saas_platform_settings",
          JSON.stringify({ ...obj, defaultCurrency: row.setting_value })
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyCode]);

  const value = useMemo<CurrencyContextValue>(() => {
    const format = (amount: number) => formatMoneyAmount(amount, code);
    const formatCompact = (amount: number) => formatMoneyCompact(amount, code);
    return { code, format, formatCompact, symbol: currencySymbol(code) };
  }, [code]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function dispatchPlatformCurrencyChange(code: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }));
}
