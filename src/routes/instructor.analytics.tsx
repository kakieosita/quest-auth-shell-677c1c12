import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useInstructorStore } from "@/stores/instructor-store";
import { enrollmentTrend, revenueTrend } from "@/lib/instructor-data";
import { TrendingUp, Users, Activity, Target } from "lucide-react";
import { StatCard } from "@/components/instructor/StatCard";

export const Route = createFileRoute("/instructor/analytics")({
  component: AnalyticsPage,
});

const CHART_COLORS = ["oklch(0.32 0.12 258)", "oklch(0.5 0.16 255)", "oklch(0.65 0.17 175)", "oklch(0.7 0.18 50)", "oklch(0.6 0.2 290)"];

function AnalyticsPage() {
  const courses = useInstructorStore((s) => s.courses);
  const students = useInstructorStore((s) => s.students);

  // 1. Dynamic map of courseId to student count
  const studentCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach((s) => {
      if (s.courseId) {
        map[s.courseId] = (map[s.courseId] || 0) + 1;
      }
    });
    return map;
  }, [students]);

  // 2. Dynamic map of courseId to average progress (completion rate)
  const courseCompletionMap = useMemo(() => {
    const progressSum: Record<string, number> = {};
    const count: Record<string, number> = {};
    students.forEach((s) => {
      if (s.courseId) {
        progressSum[s.courseId] = (progressSum[s.courseId] || 0) + s.progress;
        count[s.courseId] = (count[s.courseId] || 0) + 1;
      }
    });
    
    const map: Record<string, number> = {};
    Object.keys(count).forEach((cid) => {
      map[cid] = Math.round(progressSum[cid] / count[cid]);
    });
    return map;
  }, [students]);

  // 3. Dynamic metrics
  const totalStudents = students.length;
  
  const avgCompletion = useMemo(() => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + s.progress, 0);
    return Math.round(sum / students.length);
  }, [students]);

  const activeStudents = useMemo(() => {
    return students.filter((s) => {
      const la = s.lastActive;
      if (!la || la === "N/A") return false;
      if (la === "Today" || la === "Yesterday" || la.includes("days ago") || la.includes("hours ago")) return true;
      
      const parsed = Date.parse(la);
      if (!isNaN(parsed)) {
        const diffTime = Math.abs(Date.now() - parsed);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      return false;
    }).length;
  }, [students]);

  const engagement = students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0;

  // Assume average price of ₦25,000 per enrollment if course revenue is 0
  const totalRevenue = useMemo(() => {
    const storeRevenue = courses.reduce((sum, c) => sum + (c.revenue || 0), 0);
    if (storeRevenue > 0) return storeRevenue;
    return students.length * 25000;
  }, [courses, students]);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}k`;
    return `₦${val}`;
  };

  const revenueDisplay = formatCurrency(totalRevenue);

  // 4. Dynamic Course Performance
  const coursePerformance = useMemo(() => {
    return courses
      .map((c) => {
        const count = studentCountMap[c.id] || 0;
        const completion = courseCompletionMap[c.id] || 0;
        return {
          name: c.title.split(" ").slice(0, 2).join(" "),
          students: count,
          completion: completion,
        };
      })
      .filter((c) => c.students > 0);
  }, [courses, studentCountMap, courseCompletionMap]);

  // 5. Dynamic Enrollments by Category
  const categoryData = useMemo(() => {
    const data = courses.reduce<Record<string, { name: string; value: number }>>((acc, c) => {
      const count = studentCountMap[c.id] || 0;
      if (count > 0) {
        if (!acc[c.category]) acc[c.category] = { name: c.category, value: 0 };
        acc[c.category].value += count;
      }
      return acc;
    }, {});
    return Object.values(data);
  }, [courses, studentCountMap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Engagement, completion, and revenue across all your courses.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total enrollments" value={totalStudents.toLocaleString()} delta="+18% this quarter" icon={Users} tone="primary" />
        <StatCard label="Avg completion" value={`${avgCompletion}%`} delta="+4 pts MoM" icon={Target} tone="success" />
        <StatCard label="Active students" value={`${activeStudents}`} delta={`${engagement}% engaged`} icon={Activity} tone="mint" />
        <StatCard label="Total Revenue" value={revenueDisplay} delta="+14.6% MoM" icon={TrendingUp} tone="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Enrollments vs completions</h2>
          <p className="mb-4 text-xs text-muted-foreground">Monthly trend across all courses.</p>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="enroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.32 0.12 258)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.32 0.12 258)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="complete" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.15 155)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.65 0.15 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 250)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 255)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 255)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.015 250)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="enrollments" stroke="oklch(0.32 0.12 258)" fill="url(#enroll)" strokeWidth={2} />
                <Area type="monotone" dataKey="completions" stroke="oklch(0.65 0.15 155)" fill="url(#complete)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Revenue trend</h2>
          <p className="mb-4 text-xs text-muted-foreground">Net revenue per month (₦).</p>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 250)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 255)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 255)" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.015 250)" }}
                  formatter={(v: any) => `₦${Number(v).toLocaleString()}`}
                />
                <Bar dataKey="revenue" fill="oklch(0.5 0.16 255)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Course performance</h2>
          <p className="mb-4 text-xs text-muted-foreground">Students enrolled vs completion rate.</p>
          <div className="h-72 w-full flex items-center justify-center">
            {coursePerformance.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={coursePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 250)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 255)" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.5 0.03 255)" width={100} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.015 250)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="students" fill="oklch(0.32 0.12 258)" radius={[0, 8, 8, 0]} />
                  <Bar dataKey="completion" fill="oklch(0.65 0.17 175)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No course performance data available.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Enrollments by category</h2>
          <p className="mb-4 text-xs text-muted-foreground">Where your students come from.</p>
          <div className="h-72 w-full flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.015 250)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No enrollment category data available.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
