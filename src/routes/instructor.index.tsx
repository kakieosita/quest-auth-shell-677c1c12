import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, BookOpen, Banknote, TrendingUp, GraduationCap, Star, Activity as ActivityIcon, Calendar, ClipboardCheck, Plus, Upload, Bell } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { StatCard } from "@/components/instructor/StatCard";

export const Route = createFileRoute("/instructor/")({
  component: InstructorOverview,
});

const naira = (n: number) => `₦${n.toLocaleString()}`;

function InstructorOverview() {
  const courses = useInstructorStore((s) => s.courses);
  const students = useInstructorStore((s) => s.students);
  const activity = useInstructorStore((s) => s.activity);
  const profile = useInstructorStore((s) => s.profile);
  const schedules = useInstructorStore((s) => s.schedules);
  const submissions = useInstructorStore((s) => s.submissions);

  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
  const totalRevenue = courses.reduce((sum, c) => sum + c.revenue, 0);
  const pendingGrading = submissions.filter((s) => s.status === "pending").length;
  const upcomingClasses = schedules.filter((s) => new Date(s.date) >= new Date()).length;

  const stats = [
    { label: "Total Students", value: totalStudents.toLocaleString(), delta: "+12%", icon: Users, tone: "primary" as const },
    { label: "Revenue", value: naira(totalRevenue), delta: "+8.4%", icon: Banknote, tone: "success" as const },
    { label: "Pending Grading", value: `${pendingGrading}`, delta: "Tasks", icon: ClipboardCheck, tone: "warning" as const },
    { label: "Upcoming Classes", value: `${upcomingClasses}`, delta: "Next 7 days", icon: Calendar, tone: "mint" as const },
  ];

  const quickActions = [
    { label: "New Class Session", icon: Plus, to: "/instructor/schedule", color: "bg-primary text-primary-foreground" },
    { label: "Post Announcement", icon: Bell, to: "/instructor/announcements", color: "bg-warning text-warning-foreground" },
  ];

  const iconMap = {
    enroll: Users,
    submission: BookOpen,
    review: Star,
    completion: GraduationCap,
  } as const;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome back, {(profile.displayName || "").split(" ")[0] ?? profile.displayName ?? "Instructor"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening across your courses today.
          </p>
        </div>
        <div className="flex gap-2">
           {quickActions.map((action) => (
             <Link
               key={action.label}
               to={action.to}
               className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold shadow-soft hover:bg-accent transition"
             >
               <action.icon className="h-3.5 w-3.5" />
               {action.label}
             </Link>
           ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Top performing courses</h2>
            <Link to="/instructor/courses" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {courses
              .filter((c) => c.status === "published")
              .sort((a, b) => b.students - a.students)
              .slice(0, 4)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border p-3">
                  <div className="h-12 w-16 shrink-0 rounded-lg" style={{ background: c.thumbnail }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.students} students · {c.completionRate}% completion · {c.rating} ★
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-primary"
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-display text-sm font-bold">{naira(c.revenue)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          </div>
          <ul className="space-y-3">
            {activity.map((a) => {
              const Icon = iconMap[a.type as keyof typeof iconMap] || ActivityIcon;
              return (
                <li key={a.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Upcoming Schedule</h2>
          <Link to="/instructor/schedule" className="text-xs font-semibold text-primary hover:underline">
            Manage schedule
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
           {schedules.slice(0, 3).map((s) => (
             <div key={s.id} className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.type === 'virtual' ? 'bg-primary/10 text-primary' : 'bg-mint/10 text-mint'}`}>
                      {s.type}
                   </span>
                   <span className="text-xs font-semibold">{s.time}</span>
                </div>
                <h3 className="font-semibold text-sm line-clamp-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{s.location}</p>
             </div>
           ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent students</h2>
          <Link to="/instructor/students" className="text-xs font-semibold text-primary hover:underline">
            View all students
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium">Student</th>
                <th className="py-2 text-left font-medium">Course</th>
                <th className="py-2 text-left font-medium">Progress</th>
                <th className="py-2 text-left font-medium">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.slice(0, 5).map((s) => {
                const course = courses.find((c) => c.id === s.courseId);
                return (
                  <tr key={s.id}>
                    <td className="py-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="py-3 text-muted-foreground">{course?.title ?? "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-primary" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{s.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{s.lastActive}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

