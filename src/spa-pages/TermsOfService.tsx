"use client";

import Link from "next/link";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";
import { useBranding } from "@/context/BrandingContext";

/** Public terms of service for bookings, platform use, and Meta App Review. */
export default function TermsOfService() {
  const { siteName } = useBranding();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StickyHeader />
      <main className="flex-1 px-4 md:px-6 lg:px-8 py-8 max-w-3xl mx-auto w-full">
        <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          Last updated: March 21, 2026 · {siteName}
        </p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Agreement</h2>
            <p>
              These Terms of Service (“Terms”) govern your access to and use of our websites, mobile experiences,
              booking and travel-related services, business dashboards, and integrations we offer (collectively, the
              “Services”). By accessing or using the Services, you agree to these Terms and our{" "}
              <Link href="/privacy-policy" className="text-primary underline hover:no-underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Eligibility</h2>
            <p>
              You must be legally able to enter a binding contract in your jurisdiction. If you use the Services on
              behalf of a company, you represent that you have authority to bind that organization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Accounts</h2>
            <p>
              You are responsible for safeguarding login credentials and for activity under your account. Notify us
              promptly of unauthorized use. We may suspend or terminate accounts that violate these Terms or pose a
              security risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Bookings, pricing, and travel services</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                Listings, availability, prices, and descriptions are provided by us and/or partners and may change
                without notice until a booking is confirmed.
              </li>
              <li>
                A booking is subject to confirmation, supplier rules, and any terms shown at checkout or in your
                confirmation email.
              </li>
              <li>
                You are responsible for accurate guest information, travel documents, visas, insurance, and compliance
                with local laws.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Payments</h2>
            <p>
              Payments may be processed by us or third-party processors. You authorize charges for confirmed bookings
              and applicable taxes or fees. Refunds and chargebacks follow the cancellation policy and payment provider
              rules stated at the time of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Cancellations and changes</h2>
            <p>
              Cancellation, modification, and no-show rules depend on the specific rate, package, or supplier. Where
              shown, those policies form part of these Terms. Fees may apply.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Violate laws or third-party rights;</li>
              <li>Attempt to gain unauthorized access, scrape, overload, or disrupt the Services;</li>
              <li>Upload malware, spam, or misleading content;</li>
              <li>Misuse messaging or social integrations (including automated outreach that violates platform rules).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Third-party services and integrations</h2>
            <p>
              The Services may rely on third parties (e.g. payment, hosting, analytics, maps, or Meta/Facebook/Instagram
              when you enable related features). Their terms and privacy policies apply to your use of those services.
              We are not responsible for third-party sites or services we do not control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Intellectual property</h2>
            <p>
              Content on the Services (branding, software, text, images, layout) is owned by us or our licensors. You
              receive a limited, non-exclusive license to use the Services as intended. You may not copy, modify,
              distribute, or reverse engineer except as allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Disclaimers</h2>
            <p>
              The Services are provided “as is” and “as available.” To the fullest extent permitted by law, we
              disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not
              guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, we and our affiliates, suppliers, and partners will
              not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits,
              data, or goodwill. Our aggregate liability for claims arising from the Services is limited to the amount
              you paid us for the Services giving rise to the claim in the twelve (12) months before the event, or one
              hundred (100) currency units if greater—except where liability cannot be limited by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Indemnity</h2>
            <p>
              You will defend and indemnify us against claims, damages, and expenses (including reasonable legal fees)
              arising from your use of the Services, your content, or your breach of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">13. Suspension and termination</h2>
            <p>
              We may suspend or terminate access to the Services at any time, with or without notice, for conduct that
              violates these Terms or harms users, partners, or the Services. Provisions that by nature should survive
              will survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">14. Governing law and disputes</h2>
            <p>
              These Terms are governed by the laws applicable to the operator of the Services in your primary market,
              excluding conflict-of-law rules. Courts in that jurisdiction have exclusive venue, unless mandatory
              consumer protections require otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">15. Changes</h2>
            <p>
              We may modify these Terms by posting an updated version and changing the “Last updated” date. Continued use
              after changes constitutes acceptance where permitted by law. Material changes may require additional notice
              where required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">16. Contact</h2>
            <p>
              For questions about these Terms, contact us using the details provided on this website or in your booking
              or account communications.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
