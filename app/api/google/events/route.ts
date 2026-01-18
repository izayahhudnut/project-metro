import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/lib/google";

const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
};

export async function GET() {
  const tokenCookie = cookies().get("google_tokens")?.value;
  if (!tokenCookie) {
    return NextResponse.json(
      { success: false, error: "Not connected" },
      { status: 401 }
    );
  }

  const tokens = JSON.parse(tokenCookie);
  const client = getGoogleOAuthClient();
  client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: client });
  const { start, end } = getWeekRange();

  const calendarList = await calendar.calendarList.list();
  const calendars =
    calendarList.data.items?.filter((item) => item.id) ?? [];

  const eventResponses = await Promise.all(
    calendars.map((cal) =>
      calendar.events.list({
        calendarId: cal.id as string,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      })
    )
  );

  const events = eventResponses.flatMap((response, index) => {
    const calendarName = calendars[index]?.summary ?? "Calendar";
    return (
      response.data.items?.map((event) => ({
        id: event.id ?? "",
        title: event.summary ?? "Untitled",
        calendar: calendarName,
        start: event.start?.dateTime ?? event.start?.date ?? "",
        end: event.end?.dateTime ?? event.end?.date ?? "",
        attendees:
          event.attendees?.map((attendee) => attendee.email ?? "").filter(Boolean) ??
          [],
      })) ?? []
    );
  });

  return NextResponse.json({ success: true, events });
}
