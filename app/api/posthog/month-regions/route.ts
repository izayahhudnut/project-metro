import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST ?? "https://us.posthog.com";

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { success: false, error: "Missing PostHog config" },
      { status: 500 }
    );
  }

  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query:
          "select properties.$geoip_country_code as country, properties.$geoip_region as region, countDistinctIf(person_id, event = '$pageview' and timestamp >= toStartOfMonth(now())) as count from events where properties.$geoip_country_code is not null and properties.$geoip_region is not null group by country, region order by count desc limit 12",
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("[posthog-month-regions] error", {
      status: response.status,
      details,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch PostHog regions", details },
      { status: 500 }
    );
  }

  const data = await response.json();
  const rows = Array.isArray(data?.results) ? data.results : [];
  const regions = rows
    .map((row: [string | null, string | null, number]) => ({
      country: row[0],
      region: row[1],
      count: Number(row[2] ?? 0),
    }))
    .filter((row: { country: string | null; region: string | null }) => Boolean(row.country && row.region));

  return NextResponse.json({ success: true, regions });
}
