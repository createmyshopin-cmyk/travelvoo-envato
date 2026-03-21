/**
 * Envato Market API — author sale lookup by purchase code.
 * @see https://build.envato.com/api/
 */

const ENVATO_API = "https://api.envato.com/v3/market/author/sale";

export type EnvatoAuthorSale = {
  amount?: string;
  sold_at?: string;
  license?: string;
  supported_until?: string | null;
  item: {
    id: number;
    name?: string;
  };
};

export class EnvatoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "EnvatoApiError";
  }
}

export async function fetchAuthorSaleByCode(
  purchaseCode: string,
  personalToken: string
): Promise<EnvatoAuthorSale | null> {
  const code = purchaseCode.trim();
  if (!code) return null;

  const url = new URL(ENVATO_API);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${personalToken}`,
      "User-Agent": "Stay-UI/1.0 (license verification)",
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EnvatoApiError(
      text || `Envato API returned ${res.status}`,
      res.status
    );
  }

  return (await res.json()) as EnvatoAuthorSale;
}

export function saleMatchesItem(sale: EnvatoAuthorSale, expectedItemId: number): boolean {
  return Number(sale.item?.id) === Number(expectedItemId);
}
