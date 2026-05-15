import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Clock, Award, TrendingUp, FileText, Calendar, Activity as ActivityIcon, Bell, GraduationCap, MapPin, User } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useAuthStore } from "@/stores/auth-store";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { courses, assignments, activity, certificates, announcements, grades } = useDashboardStore();
  const { user: authUser } = useAuthStore();

  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const completed = courses.filter((c) => c.progress === 100);
  const overall = Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / (courses.length || 1));
  const upcoming = assignments
    .filter((a) => a.status === "pending" || a.status === "overdue")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const avgGrade = (grades.reduce((sum, g) => sum + g.score, 0) / (grades.length || 1)).toFixed(0);

  const formatDate = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value?.toDate === "function") return value.toDate().toLocaleDateString();
    if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toLocaleDateString();
    return String(value);
  };

  const stats = [
    { label: "Enrolled courses", value: courses.length, icon: BookOpen, color: "text-primary bg-accent" },
    { label: "Overall progress", value: `${overall}%`, icon: TrendingUp, color: "text-primary bg-accent" },
    { label: "Recent Grade", value: `${avgGrade}%`, icon: GraduationCap, color: "text-success bg-success/10" },
    { label: "Certificates", value: certificates.length, icon: Award, color: "text-mint-foreground bg-mint/30" },
  ];

  const schedule = [
    { id: 1, title: "React Hooks Workshop", date: "Today", time: "2:00 PM", room: "Hall A" },
    { id: 2, title: "Cloud Security Seminar", date: "Tomorrow", time: "10:00 AM", room: "Online" },
    { id: 3, title: "Career Mentorship", date: "28 Apr", time: "4:00 PM", room: "UST Lab 2" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-card"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-80">Welcome back,</p>
            <h1 className="mt-1 font-display text-3xl font-bold">{(authUser?.displayName || "Student").split(" ")[0]} 👋</h1>
            <p className="mt-2 max-w-xl text-sm opacity-90">
              You have {upcoming.length} upcoming {upcoming.length === 1 ? "assignment" : "assignments"} and{" "}
              {inProgress.length} courses in progress. Keep up the momentum!
            </p>
            {inProgress[0] && (
              <Link
                to="/dashboard/courses/$courseId"
                params={{ courseId: inProgress[0].id }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft transition hover:-translate-y-0.5"
              >
                Continue: {inProgress[0].title.slice(0, 32)}…
              </Link>
            )}
          </div>
          <div className="hidden lg:block shrink-0">
             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Next Class</p>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="font-semibold text-sm">Full-Stack Development</p>
                      <p className="text-xs opacity-80">Today @ 2:00 PM</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
          </motion.div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main learning section */}
        <div className="lg:col-span-2 space-y-8">
           <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Continue learning</h2>
              <Link to="/dashboard/courses" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {inProgress.slice(0, 2).map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Upcoming Schedule</h2>
            </div>
            <div className="grid gap-4">
               {schedule.map((item) => (
                 <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-accent/40 transition">
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-accent text-primary font-bold">
                          <span className="text-[10px] uppercase">{item.date.split(' ')[1] || 'Today'}</span>
                          <span className="text-lg leading-none">{item.date.split(' ')[0] === 'Today' ? '24' : (item.date.split(' ')[0] === 'Tomorrow' ? '25' : item.date.split(' ')[0])}</span>
                       </div>
                       <div>
                          <p className="font-semibold">{item.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                             <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.time}</span>
                             <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.room}</span>
                          </div>
                       </div>
                    </div>
                    <Button variant="outline" size="sm">Join Class</Button>
                 </div>
               ))}
            </div>
          </section>
        </div>

        {/* Sidebar section */}
        <div className="space-y-8">
           <section>
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Announcements</h2>
              </div>
              <div className="space-y-4">
                 {announcements.map((an) => (
                   <div key={an.id} className="p-4 rounded-2xl border border-border bg-card shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-semibold text-sm">{an.title}</h3>
                         <span className="text-[10px] text-muted-foreground uppercase">{formatDate(an.date)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                         {an.content}
                      </p>
                   </div>
                 ))}
              </div>
           </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Student Profile</h2>
              </div>
              <Card className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Age</p>
                      <p className="font-medium">{authUser?.age || "N/A"}</p>
                   </div>
                   <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gender</p>
                      <p className="font-medium">{authUser?.gender || "N/A"}</p>
                   </div>
                   <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Phone</p>
                      <p className="font-medium">{authUser?.phoneNumber || "N/A"}</p>
                   </div>
                   <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Next of Kin</p>
                      <p className="font-medium">{authUser?.nextOfKin || "N/A"}</p>
                      {authUser?.nextOfKinPhoneNumber && <p className="text-[10px] text-muted-foreground">{authUser.nextOfKinPhoneNumber}</p>}
                   </div>
                   <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Address</p>
                      <p className="font-medium text-[10px] leading-tight truncate max-w-[150px]">{authUser?.address || "N/A"}</p>
                   </div>
                </div>
                <div className="pt-4 border-t border-border">
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Registered Course</p>
                   <p className="font-semibold text-primary">{authUser?.interestedCourse || (courses[0]?.title) || "No Active Course"}</p>
                   <div className="mt-3 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-xs">TR</div>
                      <div>
                         <p className="text-xs font-bold">Assigned Instructor</p>
                         <p className="text-[10px] text-muted-foreground">Dr. Thompson Reed</p>
                      </div>
                   </div>
                </div>
              </Card>
           </section>

           <section>
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Upcoming deadlines</h2>
              </div>
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-accent/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.course}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-xs font-semibold ${a.status === "overdue" ? "text-destructive" : "text-foreground"}`}
                      >
                        {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
           </section>
        </div>
      </div>
    </div>
  );
}

