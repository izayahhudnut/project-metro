import { NextResponse } from "next/server";

export async function GET() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: "Missing CLERK_SECRET_KEY" },
      { status: 500 }
    );
  }

  const response = await fetch("https://api.clerk.com/v1/users/count", {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      { success: false, error: "Failed to fetch users", details },
      { status: 500 }
    );
  }

  const data = await response.json();
  const total = typeof data.total_count === "number" ? data.total_count : 0;

  return NextResponse.json({ success: true, total });
}
