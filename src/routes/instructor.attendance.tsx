import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Search, Users, Calendar, Clock, QrCode, UserCheck, UserX, Clock3 } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const schedules = useInstructorStore((s) => s.schedules);
  const students = useInstructorStore((s) => s.students);
  const courses = useInstructorStore((s) => s.courses);
  const attendance = useInstructorStore((s) => s.attendance);
  const markAttendance = useInstructorStore((s) => s.markAttendance);
  const submitAttendance = useInstructorStore((s) => s.submitAttendance);

  const [selectedSession, setSelectedSession] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!selectedSession && schedules.length > 0) {
      setSelectedSession(schedules[0].id);
    } else if (selectedSession && !schedules.find((s) => s.id === selectedSession)) {
      setSelectedSession(schedules[0]?.id || "");
    }
  }, [schedules, selectedSession]);

  const currentSession = schedules.find((s) => s.id === selectedSession);
  const sessionCourse = courses.find((c) => c.id === currentSession?.courseId);

  const sessionStudents = useMemo(() => {
    if (!currentSession) return [];
    const scoped = students.filter((s) => s.courseId === currentSession.courseId);
    return scoped.length > 0 ? scoped : students;
  }, [students, currentSession]);

  const filteredStudents = sessionStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase())
  );

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    sessionStudents.forEach((s) => {
      const rec = attendance.find((a) => a.sessionId === selectedSession && a.studentId === s.id);
      if (rec?.status === "present") present++;
      else if (rec?.status === "absent") absent++;
    });
    return { present, absent, pending: sessionStudents.length - present - absent };
  }, [sessionStudents, attendance, selectedSession]);

  const markAll = async (status: "present" | "absent") => {
    if (!selectedSession || sessionStudents.length === 0) return;
    const loading = toast.loading(`Marking everyone ${status}...`);
    try {
      await Promise.all(
        sessionStudents.map((s) => markAttendance(selectedSession, s.id, status))
      );
      toast.dismiss(loading);
      toast.success(`Marked ${sessionStudents.length} students as ${status}`);
    } catch (e) {
      toast.dismiss(loading);
      toast.error("Failed to mark all");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mark and track attendance for your class sessions.</p>
        </div>
        <div className="flex gap-2">
           <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-accent transition">
              <QrCode className="h-4 w-4" /> Generate QR Code
           </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
         <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
               <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Select Session</h2>
               <div className="space-y-2">
                  {schedules.length === 0 && (
                    <Link to="/instructor/schedule" className="block rounded-xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground hover:bg-muted/30 transition">
                      No sessions yet. <span className="font-bold text-primary">Schedule one →</span>
                    </Link>
                  )}
                  {schedules.map((s) => {
                    const course = courses.find(c => c.id === s.courseId);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSession(s.id)}
                        className={`w-full text-left p-3 rounded-xl border transition ${selectedSession === s.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                      >
                         <p className="text-xs font-bold truncate">{s.title}</p>
                         <p className="text-[10px] text-muted-foreground mt-1 truncate">{course?.title}</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">{s.date} · {s.time}</p>
                      </button>
                    );
                  })}
               </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
               <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Session Info</h2>
               {currentSession ? (
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium">
                       <Calendar className="h-3.5 w-3.5 text-primary" />
                       {currentSession.date}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                       <Clock className="h-3.5 w-3.5 text-primary" />
                       {currentSession.time}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium">
                       <Users className="h-3.5 w-3.5 text-primary" />
                       {sessionStudents.length} Students Enrolled
                    </div>
                    <div className="pt-2 border-t border-border">
                       <p className="text-[10px] uppercase font-bold text-muted-foreground">Course</p>
                       <p className="text-xs font-semibold line-clamp-1">{sessionCourse?.title}</p>
                    </div>
                 </div>
               ) : (
                 <p className="text-xs text-muted-foreground italic">No session selected.</p>
               )}
            </div>
         </div>

         <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="font-display text-lg font-semibold">Attendance List</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search students..."
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr className="border-b border-border">
                           <th className="pb-3 text-left font-bold">Student</th>
                           <th className="pb-3 text-center font-bold">Status</th>
                           <th className="pb-3 text-right font-bold">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {filteredStudents.map((s) => {
                          const record = attendance.find(a => a.sessionId === selectedSession && a.studentId === s.id);
                          const status = record?.status || 'pending';
                          
                          return (
                            <tr key={s.id} className="group">
                               <td className="py-4">
                                  <div className="flex items-center gap-3">
                                     <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                                        {s.name.split(' ').map(n => n[0]).join('')}
                                     </div>
                                     <div>
                                        <p className="font-semibold text-sm">{s.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{s.email}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="py-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    status === 'present' ? 'bg-success/10 text-success' : 
                                    status === 'absent' ? 'bg-destructive/10 text-destructive' : 
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                     {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>
                               </td>
                              <td className="py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={async () => {
                                        await markAttendance(selectedSession, s.id, 'present');
                                        toast.success(`Marked ${s.name} as present`);
                                      }}
                                      className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-success hover:bg-success/10 transition"
                                      title="Mark Present"
                                    >
                                       <Check className="h-4 w-4" />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        await markAttendance(selectedSession, s.id, 'absent');
                                        toast.success(`Marked ${s.name} as absent`);
                                      }}
                                      className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-destructive hover:bg-destructive/10 transition"
                                      title="Mark Absent"
                                    >
                                       <X className="h-4 w-4" />
                                    </button>
                                 </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <tr>
                             <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground italic">
                                No students found for this session.
                             </td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>

               <div className="mt-6 flex items-center justify-between pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground">Showing {filteredStudents.length} of {sessionStudents.length} students</p>
                  <button 
                    onClick={async () => {
                      if (!selectedSession) return;
                      const loadingToast = toast.loading("Submitting attendance sheet...");
                      try {
                        await submitAttendance(selectedSession);
                        toast.dismiss(loadingToast);
                        toast.success("Attendance sheet submitted successfully");
                      } catch (error) {
                        toast.dismiss(loadingToast);
                        toast.error("Failed to submit attendance sheet");
                        console.error(error);
                      }
                    }}
                    className="rounded-xl bg-gradient-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition"
                  >
                     Submit Attendance Sheet
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
