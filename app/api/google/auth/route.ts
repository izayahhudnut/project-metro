import { NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = getGoogleOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
