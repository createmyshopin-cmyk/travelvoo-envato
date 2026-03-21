import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, "../src/app/admin/(shell)");

const flat = [
  ["dashboard", "AdminDashboard"],
  ["stays", "AdminStays"],
  ["rooms", "AdminRoomCategories"],
  ["bookings", "AdminBookings"],
  ["guest-contacts", "AdminGuestContacts"],
  ["leads", "AdminLeads"],
  ["coupons", "AdminCoupons"],
  ["calendar", "AdminCalendar"],
  ["ai-settings", "AdminAISettings"],
  ["media", "AdminMediaGallery"],
  ["reviews", "AdminReviews"],
  ["quotations", "AdminQuotations"],
  ["invoices", "AdminInvoices"],
  ["billing", "AdminBilling"],
  ["settings", "AdminSettings"],
  ["reels-stories", "AdminReelsStories"],
  ["analytics", "AdminAnalytics"],
  ["accounting", "AdminAccounting"],
  ["banner", "AdminBanner"],
  ["seo", "AdminSeo"],
];

const nested = [
  ["account/profile", "AdminAccountProfile"],
  ["account/domain", "AdminAccountDomain"],
  ["account/billing", "AdminAccountBilling"],
  ["account/usage", "AdminAccountUsage"],
];

function write(seg, comp) {
  const dir = path.join(base, seg);
  fs.mkdirSync(dir, { recursive: true });
  const body = `"use client";\nimport ${comp} from "@/spa-pages/admin/${comp}";\nexport default function Page() {\n  return <${comp} />;\n}\n`;
  fs.writeFileSync(path.join(dir, "page.tsx"), body);
}

for (const [s, c] of flat) write(s, c);
for (const [s, c] of nested) write(s, c);
console.log("admin pages written");
