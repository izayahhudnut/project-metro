'use client'

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { ArrowDown, Users, Eye, MousePointer, DollarSign, TrendingUp } from "lucide-react";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";

// No fallback data





interface UsageData {
  email: string;
  cost: number;
}

interface AnalyticsData {
  metric: string;
  value: number;
  change: number;
  icon: any;
}

interface ApiResponse {
  success: boolean;
  data: UsageData[];
  total?: number;
  error?: string;
}

interface RevenueData {
  arr: number;
  totalMoneyMade: number;
}

interface RevenueApiResponse {
  success: boolean;
  data: RevenueData;
  error?: string;
}

interface RegionData {
  region: string;
  country: string;
  flag: string;
  visitors: number;
  views: number;
}

interface AnalyticsApiResponse {
  success: boolean;
  data: AnalyticsData[];
  regions?: RegionData[];
  error?: string;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [llmCostData, setLlmCostData] = useState<UsageData[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData>({ arr: 0, totalMoneyMade: 0 });
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  

  // Fetch usage data from API
  useEffect(() => {
    const fetchUsageData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/usage');
        const result: ApiResponse = await response.json();
        
        if (result.success && result.data.length > 0) {
          setLlmCostData(result.data);
        } else if (result.error) {
          console.warn('API returned error:', result.error);
          setError(result.error);
        }
      } catch (err) {
        console.error('Failed to fetch usage data:', err);
        setError('Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsageData();
    
    // Refresh data every hour
    const interval = setInterval(fetchUsageData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch analytics data from API
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      
      try {
        const response = await fetch('/api/analytics');
        const result: AnalyticsApiResponse = await response.json();
        
        if (result.success && result.data.length > 0) {
          // Map icon strings to actual components  
          const mappedData = result.data.map(item => ({
            ...item,
            icon: item.icon === 'Users' ? Users : item.icon === 'UserCheck' ? Users : MousePointer
          }));
          setAnalyticsData(mappedData);
          
          // Set region data if available
          if (result.regions) {
            setRegionData(result.regions);
          }
        } else if (result.error) {
          console.warn('Analytics API returned error:', result.error);
          setAnalyticsError(result.error);
        }
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setAnalyticsError('Failed to fetch analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalyticsData();
    
    // Refresh data every hour
    const interval = setInterval(fetchAnalyticsData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch revenue data from API
  useEffect(() => {
    const fetchRevenueData = async () => {
      setRevenueLoading(true);
      setRevenueError(null);
      
      try {
        const response = await fetch('/api/revenue');
        const result: RevenueApiResponse = await response.json();
        
        if (result.success) {
          setRevenueData(result.data);
        } else if (result.error) {
          console.warn('Revenue API returned error:', result.error);
          setRevenueError(result.error);
        }
      } catch (err) {
        console.error('Failed to fetch revenue data:', err);
        setRevenueError('Failed to fetch revenue');
      } finally {
        setRevenueLoading(false);
      }
    };

    fetchRevenueData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchRevenueData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const totalLLMCost = llmCostData.reduce((sum, user) => sum + user.cost, 0);

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col relative overflow-hidden">
      <ShootingStars />
      <StarsBackground />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 backdrop-blur-sm bg-gradient-to-b from-black/30 via-black/20 to-transparent">
        <div className="flex items-center space-x-4">
          <Image
            src="/light-logo.png"
            alt="OpsCompanion Logo"
            width={60}
            height={15}
            style={{ height: "auto", width: "auto" }}
            className="h-4 filter brightness-0 invert"
          />
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-white">
            {isMounted ? currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
          </div>
          <div className="text-sm text-gray-400">
            {isMounted ? currentTime.toLocaleDateString() : '--/--/--'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 p-4 pb-20 grid grid-cols-1 gap-4">
        {/* Left Section - Usage Stats */}
        <div className="col-span-1 space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white/60 via-white to-white/60">USAGE</h2>
            <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl h-full">
              <CardHeader>
                <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-white/80 via-white to-white/80 flex items-center gap-2">
                  LLM Cost per User (All Time)
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-white/6 border-t-white rounded-full animate-spin"></div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="text-xs text-yellow-400 mb-3 p-2 bg-yellow-400/10 rounded border border-yellow-400/20">
                    Warning: Using fallback data ({error})
                  </div>
                )}
                <div className="space-y-3">
                  {isLoading ? (
                    // Skeleton loading
                    <>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="w-32 h-4 bg-gray-600 rounded animate-pulse"></div>
                          <div className="w-16 h-4 bg-gray-600 rounded animate-pulse"></div>
                        </div>
                      ))}
                      <div className="border-t border-white/6 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <div className="w-12 h-4 bg-gray-600 rounded animate-pulse"></div>
                          <div className="w-20 h-6 bg-gray-600 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </>
                  ) : llmCostData.length > 0 ? (
                    <>
                      {llmCostData.map((user, index) => (
                        <div key={`${user.email}-${index}`} className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">{user.email}</span>
                          <span className="font-mono font-semibold text-white">
                            ${user.cost.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-white/6 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Total</span>
                          <span className="font-mono font-bold text-lg text-white">
                            ${totalLLMCost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400 text-sm">No LLM usage data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Web Analytics */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {analyticsLoading ? (
                // Skeleton loading cards
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-600 rounded animate-pulse"></div>
                        <div className="w-20 h-4 bg-gray-600 rounded animate-pulse"></div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-16 h-8 bg-gray-600 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))
              ) : analyticsData.length > 0 ? (
                analyticsData.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Card key={item.metric} className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {item.metric}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {item.value.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                // Always show the 3 card structure even when no data
                ['Weekly Active Users', 'Total Users', 'Website Visitors (30 days)'].map((metric, index) => (
                  <Card key={metric} className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        {index === 0 ? <Users className="w-4 h-4" /> : index === 1 ? <Eye className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
                        {metric}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-500">--</div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Revenue Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white/60 via-white to-white/60">REVENUE</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    ARR
                    {revenueLoading && (
                      <div className="w-3 h-3 border border-white/6 border-t-white rounded-full animate-spin"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="w-20 h-8 bg-gray-600 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold text-white">
                      ${revenueData.arr > 0 ? revenueData.arr.toLocaleString() : '--'}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Total Revenue
                    {revenueLoading && (
                      <div className="w-3 h-3 border border-white/6 border-t-white rounded-full animate-spin"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueLoading ? (
                    <div className="w-20 h-8 bg-gray-600 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-bold text-white">
                      ${revenueData.totalMoneyMade > 0 ? revenueData.totalMoneyMade.toLocaleString() : '--'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        
      </div>

      
    </div>
  );
}
