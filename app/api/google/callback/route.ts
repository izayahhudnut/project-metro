import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleOAuthClient } from "@/lib/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Missing code" },
      { status: 400 }
    );
  }

  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  cookies().set("google_tokens", JSON.stringify(tokens), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return NextResponse.redirect(new URL("/", request.url));
}
