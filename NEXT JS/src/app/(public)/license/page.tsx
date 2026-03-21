import { Suspense } from "react";
import { LicenseActivation } from "./LicenseActivation";

export const metadata = {
  title: "Activate license",
  description: "Verify your Envato purchase code",
};

export default function LicensePage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-muted-foreground">Loading…</div>}>
      <LicenseActivation />
    </Suspense>
  );
}
