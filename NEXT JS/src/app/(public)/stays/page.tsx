"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Bottom nav “Explore” — scroll target on the home page (no dedicated listing route in v1). */
export default function StaysExplorePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/#stays");
  }, [router]);
  return <div className="min-h-[50vh] bg-background" aria-hidden />;
}
