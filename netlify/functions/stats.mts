import type { Context, Config } from "@netlify/functions";

const GC_API = "https://benjamin-morello.goatcounter.com/api/v0";

export default async (req: Request, context: Context) => {
  const token = Netlify.env.get("GOATCOUNTER_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "token not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
  try {
    const [totalRes, hitsRes] = await Promise.all([
      fetch(`${GC_API}/stats/total`, { headers }),
      fetch(`${GC_API}/stats/hits?limit=20`, { headers })
    ]);
    const total = await totalRes.json();
    const hits = await hitsRes.json();
    const pages = (hits.hits || []).map((h: any) => ({
      path: h.path,
      title: h.event ? `[event] ${h.path}` : h.path,
      visitors: h.count ?? h.count_unique ?? 0,
      is_event: !!h.event
    }));
    const summary = {
      generated_at: new Date().toISOString(),
      total_views: total.total ?? null,
      total_visitors: total.total_utc ?? total.total ?? null,
      pages
    };
    return new Response(JSON.stringify(summary, null, 1), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502, headers: { "Content-Type": "application/json" }
    });
  }
};

export const config: Config = {
  path: "/stats-summary"
};
