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
          "select coalesce(person.properties.$email, person.properties.email) as email, countDistinctIf(properties.$session_id, properties.$session_id is not null) as sessions from events where (person.properties.$email is not null or person.properties.email is not null) and coalesce(person.properties.$email, person.properties.email) not in ('eli@opscompanion.ai','izayah@opscompanion.ai','kenneth@opscompanion.ai','izayahhudnut@gmail.com','ken@tayloredanalytics.com','elifront2@gmail.com','kenneth@eversole.dev','kennetheversole@gmail.com','2023.efront@jburroughs.org') group by email order by sessions desc limit 5",
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("[posthog-sessions-per-user] error", {
      status: response.status,
      details,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions per user", details },
      { status: 500 }
    );
  }

  const data = await response.json();
  const rows = Array.isArray(data?.results) ? data.results : [];
  const users = rows
    .map((row: [string | null, number]) => ({
      email: row[0] ?? "unknown",
      sessions: Number(row[1] ?? 0),
    }))
    .filter((user: { email: string }) => user.email !== "unknown");

  return NextResponse.json({ success: true, users });
}
