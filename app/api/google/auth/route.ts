import { NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";

export async function GET(request: Request) {
  const client = getGoogleOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
