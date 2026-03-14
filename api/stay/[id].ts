import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ogImageUrl(raw: string | undefined, origin: string): string {
  if (!raw?.trim()) return "";
  const url = raw.trim();
  if (url.includes(".supabase.co/storage/v1/object/public/")) {
    const base = url.replace("/object/public/", "/render/image/public/");
    return `${base}${base.includes("?") ? "&" : "?"}width=1200&quality=80`;
  }
  if (url.startsWith("/")) return `${origin}${url}`;
  return url;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const stayId = Array.isArray(id) ? id[0] : id;
  if (!stayId) return res.status(400).send("Missing stay id");

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const origin = `${protocol}://${host}`;
  const stayUrl = `${origin}/stay/${stayId}`;

  try {
    const url = `${SUPABASE_URL}/rest/v1/stays?id=eq.${encodeURIComponent(stayId)}&select=name,description,images,og_image_url,location&limit=1`;
    const resp = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!resp.ok) throw new Error(`Supabase ${resp.status}`);

    const rows = await resp.json();
    const stay = rows?.[0];
    if (!stay) { res.setHeader("Cache-Control", "s-maxage=60"); return res.status(404).send("Stay not found"); }

    const title = esc(stay.name || "Stay");
    const desc = esc((stay.description || "").slice(0, 200));
    const img = esc(ogImageUrl(stay.og_image_url || stay.images?.[0], origin));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    return res.status(200).send(`<!DOCTYPE html>
<html prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <meta name="description" content="${desc}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${esc(stayUrl)}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image" content="${img}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="${img}"/>
</head>
<body>
  <h1>${title}</h1>
  <p>${desc}</p>
  ${img ? `<img src="${img}" alt="${title}"/>` : ""}
  <p><a href="${esc(stayUrl)}">View Stay</a></p>
</body>
</html>`);
  } catch (err: any) {
    console.error("OG handler error:", err);
    return res.status(500).send("Internal error");
  }
}
