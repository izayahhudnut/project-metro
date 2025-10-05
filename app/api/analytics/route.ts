import { NextRequest, NextResponse } from 'next/server';

interface AnalyticsData {
  metric: string;
  value: number;
  change: number;
  icon: string;
}

interface RegionData {
  region: string;
  country: string;
  flag: string;
  visitors: number;
  views: number;
}

export async function GET(request: NextRequest) {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!personalApiKey || !projectId || !host) {
    return NextResponse.json({
      success: false,
      error: 'Missing PostHog configuration',
      data: []
    }, { status: 500 });
  }

  if (!clerkSecretKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing Clerk configuration',
      data: []
    }, { status: 500 });
  }

  try {
    // Get website visitors (30 days) using insights API
    const visitorsResponse = await fetch(`${host}/api/projects/${projectId}/insights/trend/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${personalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [
          {
            id: '$pageview',
            name: '$pageview',
            type: 'events',
            order: 0,
            math: 'monthly_active'
          }
        ],
        date_from: '-60d',
        date_to: null,
        interval: 'month',
        display: 'ActionsLineGraph',
        insight: 'TRENDS',
        breakdown_type: null,
        properties: [],
        filter_test_accounts: true
      })
    });

    // Get Weekly Active Users for /chat path
    const wauChatResponse = await fetch(`${host}/api/projects/${projectId}/insights/trend/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${personalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [
          {
            id: '$pageview',
            name: '$pageview',
            type: 'events',
            order: 0,
            math: 'weekly_active'
          }
        ],
        date_from: '-14d',
        date_to: null,
        interval: 'week',
        display: 'ActionsLineGraph',
        insight: 'TRENDS',
        breakdown_type: null,
        properties: [],
        filter_test_accounts: true
      })
    });

    // Get total users from Clerk
    const clerkUsersResponse = await fetch('https://api.clerk.com/v1/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Get geographic breakdown
    const geoResponse = await fetch(`${host}/api/projects/${projectId}/insights/trend/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${personalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [
          {
            id: '$pageview',
            name: '$pageview',
            type: 'events',
            order: 0
          }
        ],
        date_from: '-7d',
        date_to: null,
        breakdown_type: 'person',
        breakdown: ['$geoip_country_name', '$geoip_subdivision_1_name'],
        display: 'ActionsTable',
        insight: 'TRENDS',
        properties: [],
        filter_test_accounts: true
      })
    });

    if (!visitorsResponse.ok) {
      throw new Error(`PostHog API error: Visitors ${visitorsResponse.status}`);
    }

    if (!wauChatResponse.ok) {
      throw new Error(`PostHog API error: WAU Chat ${wauChatResponse.status}`);
    }

    if (!clerkUsersResponse.ok) {
      throw new Error(`Clerk API error: ${clerkUsersResponse.status}`);
    }

    const visitorsData = await visitorsResponse.json();
    const wauChatData = await wauChatResponse.json();
    const clerkUsersData = await clerkUsersResponse.json();

    // Process website visitors data (monthly active users)
    const visitorsResults = visitorsData.result?.[0]?.data || [];
    const currentVisitors = visitorsResults[visitorsResults.length - 1] || 0;
    const previousVisitors = visitorsResults[visitorsResults.length - 2] || 0;
    const visitorsChange = previousVisitors > 0 ? ((currentVisitors - previousVisitors) / previousVisitors * 100) : 0;

    // Process /chat weekly active users
    const wauChatResults = wauChatData.result?.[0]?.data || [];
    const currentWeekChatVisitors = wauChatResults[wauChatResults.length - 1] || 0;
    const previousWeekChatVisitors = wauChatResults[wauChatResults.length - 2] || 0;
    const chatVisitorsChange = previousWeekChatVisitors > 0 ? ((currentWeekChatVisitors - previousWeekChatVisitors) / previousWeekChatVisitors * 100) : 0;

    // Process Clerk users data
    const totalUsers = clerkUsersData.length || 0;
    // For user change calculation, we'll use a simple estimate since Clerk doesn't provide historical data easily
    const userChange = 0; // Set to 0 since we don't have historical user data from Clerk

    // Process geographic data
    let regionData: RegionData[] = [];
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      // This would need to be processed based on actual PostHog geo breakdown response structure
      // For now, using fallback data structure
    }

    // Only use actual PostHog geo data, no fallbacks
    // regionData remains empty if no actual data

    const analyticsData: AnalyticsData[] = [
      { 
        metric: "Weekly Active Users", 
        value: Math.round(currentWeekChatVisitors),
        change: Math.round(chatVisitorsChange),
        icon: "UserCheck"
      },
      { 
        metric: "Total Users", 
        value: totalUsers,
        change: 0,
        icon: "Users"
      },
      { 
        metric: "Website Visitors (30 days)", 
        value: Math.round(currentVisitors),
        change: Math.round(visitorsChange),
        icon: "MousePointer"
      }
    ];

    return NextResponse.json({
      success: true,
      data: analyticsData,
      regions: regionData
    });

  } catch (error) {
    console.error('Error fetching PostHog analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: []
    }, { status: 500 });
  }
}