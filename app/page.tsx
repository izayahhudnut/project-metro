'use client'

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { Users, UserRound, TrendingUp, UserPlus } from "lucide-react";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { Globe } from "@/components/ui/globe";

// No fallback data





interface UsageData {
  email: string;
  sessions: number;
}

interface AnalyticsData {
  metric: string;
  value: number | null;
  change: number | null;
  icon: any;
}

interface RevenueData {
  arr: number;
  totalMoneyMade: number;
}

interface CalendarEvent {
  id?: string;
  title: string;
  day: number;
  start: string;
  end: string;
  calendar?: string;
  attendees?: string[];
}

export default function Dashboard() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [monthUsers, setMonthUsers] = useState<number | null>(null);
  const [monthUsersChange, setMonthUsersChange] = useState<number | null>(null);
  const [arr, setArr] = useState<number | null>(null);
  const [recentUsers, setRecentUsers] = useState<{ email: string }[] | null>(null);
  const [sessionsPerUser, setSessionsPerUser] = useState<UsageData[] | null>(null);
  const [monthVisitors, setMonthVisitors] = useState<number | null>(null);
  const [regionMarkers, setRegionMarkers] = useState<
    { location: [number, number]; size: number }[]
  >([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const globeConfig = useMemo(
    () => ({
      markers: regionMarkers.length > 0 ? regionMarkers : undefined,
    }),
    [regionMarkers]
  );
  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const response = await fetch("/api/clerk/total-users");
        const result = await response.json();
        if (result.success && typeof result.total === "number") {
          setTotalUsers(result.total);
        }
      } catch (err) {
        console.warn("Failed to fetch total users:", err);
      }
    };

    fetchTotalUsers();
  }, []);

  useEffect(() => {
    const fetchMonthUsers = async () => {
      try {
        const response = await fetch("/api/clerk/month-users");
        const result = await response.json();
        if (result.success && typeof result.total === "number") {
          setMonthUsers(result.total);
          if (typeof result.previousTotal === "number") {
            if (result.previousTotal > 0) {
              const pct =
                ((result.total - result.previousTotal) / result.previousTotal) *
                100;
              setMonthUsersChange(pct);
            } else {
              setMonthUsersChange(result.total > 0 ? 100 : 0);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch monthly users:", err);
      }
    };

    fetchMonthUsers();
  }, []);

  useEffect(() => {
    const fetchArr = async () => {
      try {
        const response = await fetch("/api/stripe/arr");
        const result = await response.json();
        if (result.success && typeof result.arr === "number") {
          setArr(result.arr);
        }
      } catch (err) {
        console.warn("Failed to fetch ARR:", err);
      }
    };

    fetchArr();
  }, []);
  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const response = await fetch("/api/clerk/recent-users");
        const result = await response.json();
        if (result.success && Array.isArray(result.users)) {
          setRecentUsers(result.users);
        }
      } catch (err) {
        console.warn("Failed to fetch recent users:", err);
      }
    };

    fetchRecentUsers();
  }, []);
  useEffect(() => {
    const fetchMonthVisitors = async () => {
      try {
        const response = await fetch("/api/posthog/month-visitors");
        const result = await response.json();
        if (result.success && typeof result.total === "number") {
          setMonthVisitors(result.total);
        }
      } catch (err) {
        console.warn("Failed to fetch month visitors:", err);
      }
    };

    fetchMonthVisitors();
  }, []);

  useEffect(() => {
    const fetchMonthRegions = async () => {
      try {
        const response = await fetch("/api/posthog/month-regions");
        const result = await response.json();
        if (result.success && Array.isArray(result.regions)) {
          const coords: Record<string, [number, number]> = {
            "US|California": [36.7783, -119.4179],
            "US|Missouri": [37.9643, -91.8318],
            "US|Virginia": [37.4316, -78.6569],
            "US|Iowa": [41.878, -93.0977],
            "US|Illinois": [40.6331, -89.3985],
            "US|New York": [43.2994, -74.2179],
            "US|Texas": [31.9686, -99.9018],
            "US|Arizona": [34.0489, -111.0937],
            "GB|England": [52.3555, -1.1743],
            "PL|Mazovia": [52.2297, 21.0122],
          };
          const counts = result.regions.map((r: { count: number }) => r.count);
          const maxCount = Math.max(1, ...counts);
          const markers = result.regions
            .map((region: { country: string; region: string; count: number }) => {
              const key = `${region.country}|${region.region}`;
              const location = coords[key];
              if (!location) return null;
              const size = Math.max(0.02, (region.count / maxCount) * 0.12);
              return { location, size };
            })
            .filter(Boolean);
          setRegionMarkers(markers as { location: [number, number]; size: number }[]);
        }
      } catch (err) {
        console.warn("Failed to fetch month regions:", err);
      }
    };

    fetchMonthRegions();
  }, []);
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        const response = await fetch("/api/google/events");
        if (response.status === 401) {
          setCalendarConnected(false);
          setCalendarEvents([]);
          return;
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.events)) {
          setCalendarConnected(true);
          const startMinutes = calendarStart;
          const endMinutes = calendarEnd;
          const clamp = (value: number) => Math.min(endMinutes, Math.max(startMinutes, value));
          const to24 = (date: Date) =>
            `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
          const mapped = result.events
            .map((event: { id?: string; title: string; start: string; end: string; calendar?: string; attendees?: string[] }) => {
              const startDate = event.start ? new Date(event.start) : null;
              const endDate = event.end ? new Date(event.end) : null;
              if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                return null;
              }
              const day = startDate.getDay();
              const start = to24(startDate);
              const end = to24(endDate);
              return {
                id: event.id,
                title: event.title,
                day,
                start,
                end,
                calendar: event.calendar,
                attendees: event.attendees ?? [],
              };
            })
            .filter(Boolean)
            .map((event: CalendarEvent) => {
              const startMin = clamp(toMinutes(event.start));
              const endMin = clamp(toMinutes(event.end));
              const endAdjusted = endMin > startMin ? endMin : Math.min(endMinutes, startMin + 30);
              return {
                ...event,
                start: `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`,
                end: `${String(Math.floor(endAdjusted / 60)).padStart(2, "0")}:${String(endAdjusted % 60).padStart(2, "0")}`,
              };
            });
          const merged = new Map<string, CalendarEvent>();
          for (const event of mapped as CalendarEvent[]) {
            const key = `${event.title}|${event.day}|${event.start}|${event.end}`;
            const existing = merged.get(key);
            if (!existing) {
              merged.set(key, {
                ...event,
                attendees: event.attendees ?? [],
              });
            } else {
              const combined = new Set([
                ...(existing.attendees ?? []),
                ...(event.attendees ?? []),
              ]);
              merged.set(key, {
                ...existing,
                attendees: Array.from(combined),
              });
            }
          }
          setCalendarEvents(Array.from(merged.values()));
        }
      } catch (err) {
        console.warn("Failed to fetch calendar events:", err);
      }
    };

    fetchCalendarEvents();
  }, []);
  useEffect(() => {
    const fetchSessionsPerUser = async () => {
      try {
        const response = await fetch("/api/posthog/sessions-per-user");
        const result = await response.json();
        if (result.success && Array.isArray(result.users)) {
          setSessionsPerUser(result.users);
        }
      } catch (err) {
        console.warn("Failed to fetch sessions per user:", err);
      }
    };

    fetchSessionsPerUser();
  }, []);

  const revenueData: RevenueData = {
    arr: arr ?? 0,
    totalMoneyMade: 4623000,
  };
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarStart = 8 * 60;
  const calendarEnd = 22 * 60;
  const calendarRowHeight = 32;
  const timeSlots = Array.from(
    { length: (calendarEnd - calendarStart) / 60 },
    (_, index) => {
      const hour = (calendarStart / 60 + index) % 24;
      const labelHour = hour % 12 || 12;
      const suffix = hour >= 12 ? "PM" : "AM";
      return `${labelHour} ${suffix}`;
    }
  );
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const calendarLayout = useMemo(() => {
    const byDay: Array<
      Array<
        CalendarEvent & {
          top: number;
          height: number;
          leftPct: number;
          widthPct: number;
        }
      >
    > = Array.from({ length: 7 }, () => []);

    for (let day = 0; day < 7; day += 1) {
      const dayEvents = calendarEvents
        .filter((event) => event.day === day)
        .map((event, idx) => ({
          ...event,
          idx,
          startMin: toMinutes(event.start),
          endMin: toMinutes(event.end),
        }))
        .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

      let groupId = 0;
      const groupMax: Record<number, number> = {};
      const active: Array<{ endMin: number; group: number; col: number }> = [];
      const meta: Record<number, { group: number; col: number }> = {};

      for (const event of dayEvents) {
        for (let i = active.length - 1; i >= 0; i -= 1) {
          if (active[i].endMin <= event.startMin) {
            active.splice(i, 1);
          }
        }

        const group = active.length > 0 ? active[0].group : groupId++;
        const usedCols = new Set(active.map((item) => item.col));
        let col = 0;
        while (usedCols.has(col)) col += 1;

        active.push({ endMin: event.endMin, group, col });
        meta[event.idx] = { group, col };
        groupMax[group] = Math.max(
          groupMax[group] ?? 0,
          active.filter((item) => item.group === group).length
        );
      }

      for (const event of dayEvents) {
        const info = meta[event.idx];
        const cols = groupMax[info.group] ?? 1;
        const widthPct = 100 / cols;
        const leftPct = info.col * widthPct;
        const top = ((event.startMin - calendarStart) / 60) * calendarRowHeight;
        const height = ((event.endMin - event.startMin) / 60) * calendarRowHeight;
        byDay[day].push({
          ...event,
          top,
          height,
          leftPct,
          widthPct,
        });
      }
    }

    return byDay;
  }, [calendarEvents, calendarRowHeight, calendarStart]);
  const topMetrics: AnalyticsData[] = [
    { metric: "Total Users", value: totalUsers, change: null, icon: UserRound },
    { metric: "This Month's Users", value: monthUsers, change: monthUsersChange, icon: Users },
    { metric: "ARR", value: arr, change: null, icon: TrendingUp },
  ];

  const sessionsData = sessionsPerUser ?? [];

  return (
    <div
      className="h-screen bg-neutral-900 text-white flex flex-col relative overflow-hidden bg-no-repeat bg-cover bg-center"
      style={{ backgroundImage: "url(/bg-image.svg)" }}
    >
      <ShootingStars />
      <ShootingStars className="opacity-70" />
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10 flex-1 px-14 py-6 grid grid-cols-1 gap-6 overflow-hidden">
        {/* Top Row */}
        <div className="grid grid-cols-1 gap-4 items-stretch">
          <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl">
            <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
              <div className="flex flex-col justify-between gap-6 px-4 lg:px-8 min-h-[420px] pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topMetrics.length > 0 ? (
                    topMetrics.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={item.metric} className="flex items-start gap-3">
                          <div className="mt-1 text-gray-400">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                          <div className="text-base uppercase tracking-wide text-gray-400 font-title">
                            {item.metric}
                          </div>
                          {item.value === null ? (
                            <div className="w-24 h-8 bg-white/10 rounded animate-pulse" />
                          ) : (
                            <div className="text-3xl font-bold text-white">
                              {item.metric === "ARR"
                                ? `$${item.value.toLocaleString()}`
                                : item.value.toLocaleString()}
                            </div>
                          )}
                          {item.metric === "This Month's Users" && (
                            <div
                              className={`text-base font-medium ${
                                  (item.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {item.change === null ? (
                                  <div className="mt-2 h-4 w-16 rounded bg-white/10 animate-pulse" />
                                ) : (
                                  <>
                                    {item.change >= 0 ? "+" : ""}
                                    {item.change.toFixed(1)}% MoM
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    ["Total Users", "This Month's Users", "ARR"].map((metric, index) => (
                      <div key={metric} className="flex items-start gap-3">
                        <div className="mt-1 text-gray-400">
                        {index === 0 ? <UserRound className="w-4 h-4" /> : index === 1 ? <Users className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-base uppercase tracking-wide text-gray-400 font-title">{metric}</div>
                          <div className="text-3xl font-bold text-gray-500">--</div>
                          {metric === "This Month's Users" && (
                            <div className="text-base font-medium text-gray-500">--% MoM</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 -mt-4">
                  <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl h-full">
                    <CardHeader>
                      <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-white/80 via-white to-white/80 flex items-center gap-2 font-title">
                        New Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentUsers === null ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="h-4 w-48 rounded bg-white/10 animate-pulse" />
                          ))
                        ) : (
                          recentUsers.map((user, index) => (
                            <div key={`${user.email}-${index}`} className="flex justify-between items-center">
                              <span className="text-sm text-gray-300">{user.email}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl h-full">
                    <CardHeader>
                      <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-white/80 via-white to-white/80 flex items-center gap-2 font-title">
                        Sessions per User (All Time, excludes founders)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {sessionsPerUser === null ? (
                          <>
                            {Array.from({ length: 4 }).map((_, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                                <div className="h-4 w-12 rounded bg-white/10 animate-pulse" />
                              </div>
                            ))}
                          </>
                        ) : sessionsData.length > 0 ? (
                          <>
                            {sessionsData.map((user, index) => (
                              <div key={`${user.email}-${index}`} className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">{user.email}</span>
                                <span className="font-mono font-semibold text-white">
                                  {user.sessions.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-gray-400 text-sm">No session data available</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-transparent min-h-[420px]">
                <div className="absolute left-4 top-4 z-10">
                  <div className="text-base uppercase tracking-wide text-gray-300 font-title">
                    This Month's Website Visitors
                  </div>
                  {monthVisitors === null ? (
                    <div className="mt-2 h-10 w-32 rounded bg-white/10 animate-pulse" />
                  ) : (
                    <div className="text-4xl font-bold text-white">
                      {monthVisitors.toLocaleString()}
                    </div>
                  )}
                </div>
                <Image
                  src="/globe.svg"
                  alt="OpsCompanion globe"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 pointer-events-none z-10">
                  <ShootingStars className="opacity-70" />
                  <ShootingStars className="opacity-50" />
                </div>
                <div className="absolute inset-0">
                  <Globe
                    className="scale-[0.75] -translate-y-20 origin-center"
                    config={globeConfig}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 flex-1 min-h-0">
          <Card className="backdrop-blur-md bg-white/10 border-white/6 shadow-xl h-full">
            <CardContent className="flex flex-col min-h-0">
              {calendarConnected === false && (
                <div className="mb-3 text-sm text-amber-300">
                  Connect Google Calendar:{" "}
                  <a className="underline" href="/api/google/auth">
                    Sign in
                  </a>
                </div>
              )}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 text-sm text-gray-400 font-title">
                <div />
                {weekDays.map((day) => (
                  <div key={day} className="text-center uppercase tracking-wide">
                    {day}
                  </div>
                ))}
              </div>
              <div
                className="relative mt-3 flex-1 min-h-0"
                style={{ height: `${timeSlots.length * calendarRowHeight}px` }}
              >
                <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                  {timeSlots.map((slot, rowIndex) => (
                    <div key={slot} className="contents">
                      <div className="text-xs text-gray-400 pr-2 pt-2">
                        {slot}
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={`${day}-${slot}`}
                          className="border-t border-white/10"
                          style={{ height: `${calendarRowHeight}px` }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 grid grid-cols-[80px_repeat(7,1fr)] pointer-events-none">
                  <div />
                  {weekDays.map((day, dayIndex) => (
                    <div key={day} className="relative">
                      {(calendarLayout[dayIndex] ?? []).map((event, eventIndex) => (
                        <div
                          key={`${event.id ?? event.title}-${event.start}-${event.end}-${dayIndex}-${eventIndex}`}
                          className="absolute rounded-lg bg-white/15 border border-white/20 px-2 py-0 text-xs text-white overflow-hidden"
                          style={{
                            top: `${event.top}px`,
                            height: `${event.height}px`,
                            left: `${event.leftPct}%`,
                            width: `${event.widthPct}%`,
                          }}
                        >
                          <div className="font-semibold truncate">
                            {event.title}
                          </div>
                          {event.attendees && event.attendees.length > 0 && (
                            <ul className="mt-1 text-[11px] text-gray-300 space-y-1">
                              {event.attendees.slice(0, 4).map((email) => (
                                <li key={email} className="truncate">
                                  {email}
                                </li>
                              ))}
                              {event.attendees.length > 4 && (
                                <li className="text-[10px] text-gray-400">
                                  +{event.attendees.length - 4} more
                                </li>
                              )}
                            </ul>
                          )}
                          {event.calendar && (
                            <div className="text-[11px] text-gray-300 truncate">
                              {event.calendar}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      
    </div>
  );
}
