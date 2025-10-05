import { NextRequest, NextResponse } from 'next/server';

interface UsageData {
  email: string;
  cost: number;
}

export async function GET(request: NextRequest) {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST;

  if (!personalApiKey || !projectId || !host) {
    return NextResponse.json({
      success: false,
      error: 'Missing PostHog configuration',
      data: []
    }, { status: 500 });
  }

  try {
    // Query PostHog for AI generation events to get LLM cost data - fetch more events
    const response = await fetch(`${host}/api/projects/${projectId}/events/?event=$ai_generation&date_from=all&limit=1000&order_by=-timestamp`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${personalApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`PostHog LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('AI Generation Events Response:', JSON.stringify(data, null, 2));
    
    // Process AI generation events to get LLM costs per user
    let usageData: UsageData[] = [];
    
    if (data.results && Array.isArray(data.results)) {
      // Group by user and sum costs
      const userCosts: { [userId: string]: number } = {};
      const userEmails: { [userId: string]: string } = {};
      
      data.results.forEach((event: any, index: number) => {
        const userId = event.distinct_id;
        
        // Try multiple possible cost properties
        const cost = parseFloat(
          event.properties?.$ai_total_cost_usd || 
          event.properties?.$ai_cost || 
          event.properties?.cost || 
          event.properties?.$ai_input_cost_usd + event.properties?.$ai_output_cost_usd ||
          0
        );
        
        if (index < 5) {
          console.log(`Event ${index}:`, {
            userId,
            properties: event.properties,
            extractedCost: cost
          });
        }
        
        if (userId && cost > 0) {
          userCosts[userId] = (userCosts[userId] || 0) + cost;
        }
      });
      
      // Get person data to resolve user IDs to emails
      const userIds = Object.keys(userCosts);
      
      for (const userId of userIds) {
        try {
          const personResponse = await fetch(`${host}/api/projects/${projectId}/persons/?distinct_id=${userId}`, {
            headers: {
              'Authorization': `Bearer ${personalApiKey}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (personResponse.ok) {
            const personData = await personResponse.json();
            if (personData.results && personData.results.length > 0) {
              const person = personData.results[0];
              const email = person.properties?.email || person.properties?.$email || userId;
              userEmails[userId] = email;
            } else {
              userEmails[userId] = userId; // fallback to user ID
            }
          } else {
            userEmails[userId] = userId; // fallback to user ID
          }
        } catch (error) {
          console.error(`Error fetching person data for ${userId}:`, error);
          userEmails[userId] = userId; // fallback to user ID
        }
      }
      
      // Convert to array format using emails and group by email
      const emailCosts: { [email: string]: number } = {};
      
      Object.entries(userCosts).forEach(([userId, cost]) => {
        const email = userEmails[userId] || userId;
        emailCosts[email] = (emailCosts[email] || 0) + cost;
      });
      
      // Convert to final array format
      Object.entries(emailCosts).forEach(([email, cost]) => {
        usageData.push({ email, cost });
      });
      
      // Sort by cost descending and take top 5
      usageData.sort((a, b) => b.cost - a.cost);
      usageData = usageData.slice(0, 5);
    }

    return NextResponse.json({
      success: true,
      data: usageData,
      total: usageData.reduce((sum, user) => sum + user.cost, 0)
    });

  } catch (error) {
    console.error('Error fetching PostHog data:', error);
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: []
    }, { status: 500 });
  }
}