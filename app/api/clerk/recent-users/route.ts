import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { EXCLUDED_EMAILS } from "@/app/api/_lib/excluded-emails";

export async function GET() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: "Missing CLERK_SECRET_KEY" },
      { status: 500 }
    );
  }

  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    orderBy: "-created_at",
    limit: 20,
  });

  return NextResponse.json({
    success: true,
    users: data
      .map((user) => ({
        email: (user.emailAddresses?.[0]?.emailAddress ?? "unknown").toLowerCase(),
      }))
      .filter((user) => user.email !== "unknown" && !EXCLUDED_EMAILS.has(user.email))
      .slice(0, 5),
  });
}
