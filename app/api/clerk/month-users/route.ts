import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

const getMonthBoundaries = () => {
  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const nextStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
  return {
    currentStart: currentStart.getTime(),
    nextStart: nextStart.getTime(),
    prevStart: prevStart.getTime(),
  };
};

export async function GET() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: "Missing CLERK_SECRET_KEY" },
      { status: 500 }
    );
  }

  const { currentStart, prevStart } = getMonthBoundaries();
  const limit = 100;
  let offset = 0;
  let currentTotal = 0;
  let previousTotal = 0;
  let pages = 0;
  let firstUserDate: number | null = null;
  let lastUserDate: number | null = null;
  const loggedUsers: Array<{
    email: string;
    createdAt: number;
    bucket: "current" | "previous" | "older";
  }> = [];

  const client = await clerkClient();

  while (true) {
    const { data } = await client.users.getUserList({
      orderBy: "-created_at",
      limit,
      offset,
    });

    if (!data.length) break;
    pages += 1;
    if (firstUserDate === null && data[0]?.createdAt) {
      firstUserDate = data[0].createdAt;
    }
    if (data[data.length - 1]?.createdAt) {
      lastUserDate = data[data.length - 1].createdAt;
    }

    for (const user of data) {
      if (user.createdAt >= currentStart) {
        currentTotal += 1;
        if (loggedUsers.length < 25) {
          loggedUsers.push({
            email: user.emailAddresses?.[0]?.emailAddress ?? "unknown",
            createdAt: user.createdAt,
            bucket: "current",
          });
        }
      } else if (user.createdAt >= prevStart) {
        previousTotal += 1;
        if (loggedUsers.length < 25) {
          loggedUsers.push({
            email: user.emailAddresses?.[0]?.emailAddress ?? "unknown",
            createdAt: user.createdAt,
            bucket: "previous",
          });
        }
      } else if (loggedUsers.length < 25) {
        loggedUsers.push({
          email: user.emailAddresses?.[0]?.emailAddress ?? "unknown",
          createdAt: user.createdAt,
          bucket: "older",
        });
      }
    }

    const last = data[data.length - 1];
    if (last.createdAt < prevStart) break;

    offset += limit;
  }

  console.log("[clerk-month-users]", {
    currentStart,
    prevStart,
    currentTotal,
    previousTotal,
    pages,
    firstUserDate,
    lastUserDate,
    sampleCounts: loggedUsers,
  });

  return NextResponse.json({
    success: true,
    total: currentTotal,
    previousTotal,
  });
}
