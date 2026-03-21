"use client";

import Link from "next/link";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";
import { useBranding } from "@/context/BrandingContext";

/** Public privacy policy for Meta App Review, GDPR-style transparency, and site footer. */
export default function PrivacyPolicy() {
  const { siteName } = useBranding();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StickyHeader />
      <main className="flex-1 px-4 md:px-6 lg:px-8 py-8 max-w-3xl mx-auto w-full">
        <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          Last updated: March 21, 2026 · Operated in connection with {siteName}
        </p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy describes how we collect, use, store, and protect personal information when you use
              our websites, booking and travel services, tenant dashboards, and related features (the “Services”).
              By using the Services, you agree to this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Who we are</h2>
            <p>
              The Services may be operated by {siteName} and its service providers. For data protection questions, use
              the contact details shown in your booking confirmation, on the site footer, or in your account area.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Account and identity:</strong> name, email address, phone number,
                and credentials when you register or log in.
              </li>
              <li>
                <strong className="text-foreground">Bookings and enquiries:</strong> travel dates, guest details,
                preferences, payment-related references (payments may be processed by third-party providers).
              </li>
              <li>
                <strong className="text-foreground">Technical data:</strong> IP address, device and browser type,
                approximate location, cookies, and similar technologies used for security and analytics.
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> messages you send us and, where you opt in,
                marketing preferences.
              </li>
              <li>
                <strong className="text-foreground">Meta / Instagram (optional features):</strong> if a business
                connects an Instagram or Facebook-related integration through our platform, Meta may process data
                according to their terms. We receive only what is necessary to provide messaging or automation features
                you enable (for example conversation metadata and identifiers required for replies).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. How we use information</h2>
            <p>We use personal information to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Provide, operate, and improve the Services;</li>
              <li>Process bookings, payments (via partners), and customer support;</li>
              <li>Send service-related notices and, where allowed, marketing (you can opt out);</li>
              <li>Detect fraud, abuse, and security incidents;</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Legal bases (where applicable)</h2>
            <p>
              Depending on your region, we rely on contract (providing the Services you request), legitimate interests
              (security and improvement), consent (cookies or marketing where required), or legal obligation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Sharing and subprocessors</h2>
            <p>
              We may share data with hosting providers, authentication services, payment processors, email delivery,
              analytics, and—only when you use integrated features—platforms such as Meta/Facebook/Instagram as
              required to deliver those features. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Retention</h2>
            <p>
              We keep information only as long as needed for the purposes above, including legal, accounting, and
              dispute resolution requirements, then delete or anonymise it where possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Your rights</h2>
            <p>
              Subject to applicable law, you may request access, correction, deletion, restriction, or portability of
              your personal data, and object to certain processing. Contact us to exercise these rights. You may also
              lodge a complaint with your local supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. International transfers</h2>
            <p>
              If data is processed in countries outside your own, we use appropriate safeguards where required by law
              (such as standard contractual clauses).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Children</h2>
            <p>The Services are not directed at children under 16 (or the minimum age in your jurisdiction).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. The “Last updated” date will change and continued use
              of the Services after changes constitutes acceptance where permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Contact</h2>
            <p>
              For privacy requests, contact us using the email or form provided on this website or in your account
              communications.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
