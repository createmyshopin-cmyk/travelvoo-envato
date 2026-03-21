interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renders JSON-LD structured data for search engines and LLM crawlers.
 * Use schema.org types: Organization, WebSite, LodgingBusiness, BreadcrumbList.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(Array.isArray(data) ? data : data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
