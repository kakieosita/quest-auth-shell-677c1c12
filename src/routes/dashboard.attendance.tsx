import { createFileRoute } from "@tanstack/react-router";
import { UserCheck, UserX, CalendarDays } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/attendance")({
  component: DashboardAttendance,
});

function DashboardAttendance() {
  const attendance = useDashboardStore((s) => s.attendance);
  const history = useDashboardStore((s) => s.attendanceHistory);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Attendance Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your class participation and meet attendance requirements.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {attendance.map((record) => {
          const percentage = record.totalClasses === 0 ? 100 : Math.round((record.attendedClasses / record.totalClasses) * 100);
          const isAtRisk = record.totalClasses > 0 && percentage < 75; // Assuming 75% is the requirement
          
          return (
            <Card key={record.id} className="flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{record.course}</CardTitle>
                <CardDescription>
                  Attendance Requirement: 75%
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-4xl font-display font-bold">
                      {percentage}%
                    </p>
                    <p className={`text-sm font-medium ${isAtRisk ? 'text-destructive' : 'text-success'}`}>
                      {isAtRisk ? 'At Risk' : 'On Track'}
                    </p>
                  </div>
                  <div className="text-right space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center justify-end gap-1">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      {record.attendedClasses} Attended
                    </p>
                    <p className="flex items-center justify-end gap-1">
                      <UserX className="h-4 w-4 text-rose-500" />
                      {record.totalClasses - record.attendedClasses} Missed
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Progress</span>
                    <span>{record.attendedClasses} / {record.totalClasses} Classes</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-lg">Detailed Attendance Log</CardTitle>
          <CardDescription>Recent class sessions and your participation record.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">Session Title</TableHead>
                <TableHead className="px-6 py-3">Course</TableHead>
                <TableHead className="px-6 py-3">Date</TableHead>
                <TableHead className="px-6 py-3 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {history.map((h) => (
                <TableRow key={h.id} className="hover:bg-muted/10 transition">
                  <TableCell className="px-6 py-4 font-semibold text-sm">{h.sessionTitle}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">{h.courseName}</TableCell>
                  <TableCell className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      h.status === 'present' ? 'bg-success/10 text-success' :
                      h.status === 'absent' ? 'bg-destructive/10 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {h.status === 'present' && <UserCheck className="h-3 w-3" />}
                      {h.status === 'absent' && <UserX className="h-3 w-3" />}
                      {h.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    No attendance records logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
