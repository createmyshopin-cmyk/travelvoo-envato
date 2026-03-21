import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, "../src/app/saas-admin/(shell)");

const routes = [
  ["dashboard", "SaasAdminDashboard"],
  ["tenants", "SaasAdminTenants"],
  ["plans", "SaasAdminPlans"],
  ["subscriptions", "SaasAdminSubscriptions"],
  ["transactions", "SaasAdminTransactions"],
  ["features", "SaasAdminFeatures"],
  ["domains", "SaasAdminDomains"],
  ["envato-licenses", "SaasAdminEnvatoLicenses"],
  ["analytics", "SaasAdminAnalytics"],
  ["ai-usage", "SaasAdminAIUsage"],
  ["announcements", "SaasAdminAnnouncements"],
  ["settings", "SaasAdminSettings"],
];

function write(seg, comp) {
  const dir = path.join(base, seg);
  fs.mkdirSync(dir, { recursive: true });
  const body = `"use client";\nimport ${comp} from "@/spa-pages/saas-admin/${comp}";\nexport default function Page() {\n  return <${comp} />;\n}\n`;
  fs.writeFileSync(path.join(dir, "page.tsx"), body);
}

for (const [s, c] of routes) write(s, c);
console.log("saas-admin pages written");
