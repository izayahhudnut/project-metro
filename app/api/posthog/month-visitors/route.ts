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

  let response: Response;
  try {
    response = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query:
            "select countDistinctIf(person_id, event = '$pageview' and timestamp >= toStartOfMonth(now())) from events",
        },
      }),
    });
  } catch (err) {
    console.error("[posthog-month-visitors] fetch error", err);
    return NextResponse.json(
      { success: false, error: "PostHog request failed" },
      { status: 500 }
    );
  }

  if (!response.ok) {
    const details = await response.text();
    console.error("[posthog-month-visitors] error", {
      status: response.status,
      details,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch PostHog visitors", details },
      { status: 500 }
    );
  }

  const data = await response.json();
  const total = Array.isArray(data?.results)
    ? Number(data.results[0]?.[0] ?? 0)
    : Number(data?.results ?? 0);

  return NextResponse.json({ success: true, total });
}
