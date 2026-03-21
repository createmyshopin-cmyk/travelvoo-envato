"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/hooks/useSiteSettings";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  }
}

const injectScript = (id: string, src: string, inline?: string) => {
  if (document.querySelector(`script[data-analytics="${id}"]`)) return;
  if (src) {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.setAttribute("data-analytics", id);
    document.head.appendChild(s);
  }
  if (inline) {
    const s = document.createElement("script");
    s.textContent = inline;
    s.setAttribute("data-analytics", `${id}-inline`);
    document.head.appendChild(s);
  }
};

const AnalyticsScripts = () => {
  const { settings } = useSiteSettings();
  const pathname = usePathname();

  useEffect(() => {
    if (!settings) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/saas-admin")) return;

    const { ga_id, fb_pixel_id, clarity_id } = settings as {
      ga_id?: string;
      fb_pixel_id?: string;
      clarity_id?: string;
    };

    if (ga_id) {
      injectScript(
        "ga4",
        `https://www.googletagmanager.com/gtag/js?id=${ga_id}`,
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga_id}',{send_page_view:false});`,
      );
    }

    if (fb_pixel_id) {
      injectScript(
        "fbpixel",
        "",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb_pixel_id}');`,
      );
    }

    if (clarity_id) {
      injectScript(
        "clarity",
        "",
        `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarity_id}");`,
      );
    }
  }, [settings, pathname]);

  useEffect(() => {
    if (!settings) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/saas-admin")) return;

    const { ga_id, fb_pixel_id } = settings as { ga_id?: string; fb_pixel_id?: string };
    const url = typeof window !== "undefined" ? `${pathname}${window.location.search}` : pathname;

    if (ga_id && window.gtag) {
      window.gtag("event", "page_view", { page_path: url });
    }
    if (fb_pixel_id && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, settings]);

  return null;
};

export default AnalyticsScripts;
