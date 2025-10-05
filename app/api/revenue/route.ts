import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing Stripe configuration',
      data: {}
    }, { status: 500 });
  }

  try {
    // Get all successful charges (total money made)
    const chargesResponse = await fetch('https://api.stripe.com/v1/charges?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Get active subscriptions for ARR calculation
    const subscriptionsResponse = await fetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chargesResponse.ok) {
      throw new Error(`Stripe Charges API error: ${chargesResponse.status}`);
    }

    if (!subscriptionsResponse.ok) {
      throw new Error(`Stripe Subscriptions API error: ${subscriptionsResponse.status}`);
    }

    const chargesData = await chargesResponse.json();
    const subscriptionsData = await subscriptionsResponse.json();

    // Calculate total money made (sum of all successful charges)
    const totalMoneyMade = chargesData.data
      .filter((charge: any) => charge.status === 'succeeded')
      .reduce((sum: number, charge: any) => sum + charge.amount, 0) / 100; // Convert from cents

    // Calculate ARR from active subscriptions
    let arr = 0;
    if (subscriptionsData.data && subscriptionsData.data.length > 0) {
      const monthlyRevenue = subscriptionsData.data.reduce((sum: number, subscription: any) => {
        if (subscription.status === 'active' && subscription.items?.data?.[0]?.price) {
          const price = subscription.items.data[0].price;
          let monthlyAmount = 0;
          
          if (price.recurring?.interval === 'month') {
            monthlyAmount = price.unit_amount / 100; // Convert from cents
          } else if (price.recurring?.interval === 'year') {
            monthlyAmount = (price.unit_amount / 100) / 12; // Convert yearly to monthly
          }
          
          return sum + monthlyAmount;
        }
        return sum;
      }, 0);
      
      arr = monthlyRevenue * 12; // Convert monthly to annual
    }

    return NextResponse.json({
      success: true,
      data: {
        arr: Math.round(arr),
        totalMoneyMade: Math.round(totalMoneyMade * 100) / 100 // Round to 2 decimal places
      }
    });

  } catch (error) {
    console.error('Error fetching Stripe revenue data:', error);
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch revenue data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: {}
    }, { status: 500 });
  }
}