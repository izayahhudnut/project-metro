import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-12-15.clover",
});

const intervalMultiplier = (interval: Stripe.Price.Recurring.Interval) => {
  switch (interval) {
    case "day":
      return 365;
    case "week":
      return 52;
    case "month":
      return 12;
    case "year":
      return 1;
    default:
      return 0;
  }
};

const toUnitAmount = (item: Stripe.SubscriptionItem) => {
  const unitAmount =
    typeof item.price.unit_amount === "number"
      ? item.price.unit_amount
      : item.price.unit_amount_decimal
        ? Number(item.price.unit_amount_decimal)
        : 0;
  return unitAmount;
};

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  let arrCents = 0;
  let startingAfter: string | undefined;
  let subscriptionsCount = 0;
  const lineItems: Array<{
    subscriptionId: string;
    priceId: string;
    interval: string;
    unitAmount: number;
    quantity: number;
    arrCents: number;
  }> = [];

  while (true) {
    const page = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.items.data.price"],
    });

    for (const subscription of page.data) {
      subscriptionsCount += 1;
      for (const item of subscription.items.data) {
        const interval = item.price.recurring?.interval;
        if (!interval) continue;
        const multiplier = intervalMultiplier(interval);
        if (multiplier === 0) continue;
        const quantity = item.quantity ?? 1;
        const unitAmount = toUnitAmount(item);
        const itemArr = unitAmount * quantity * multiplier;
        arrCents += itemArr;
        if (lineItems.length < 50) {
          lineItems.push({
            subscriptionId: subscription.id,
            priceId: item.price.id,
            interval,
            unitAmount,
            quantity,
            arrCents: itemArr,
          });
        }
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  console.log("[stripe-arr]", {
    subscriptionsCount,
    lineItems,
    arrCents,
  });

  return NextResponse.json({
    success: true,
    arr: Math.round(arrCents / 100),
  });
}
