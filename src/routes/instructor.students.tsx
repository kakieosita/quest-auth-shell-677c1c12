import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, ArrowUpDown, User, Download, FileText, FileSpreadsheet, X, Check, MessageSquare } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/instructor/students")({
  component: StudentsPage,
});

type SortKey = "name" | "progress" | "lastActive";

function StudentsPage() {
  const students = useInstructorStore((s) => s.students);
  const courses = useInstructorStore((s) => s.courses);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const filtered = useMemo(() => {
    let result = students.filter((s) => {
      const matchesQuery =
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.email.toLowerCase().includes(query.toLowerCase());
      const matchesCourse = courseFilter === "all" || s.courseId === courseFilter;
      return matchesQuery && matchesCourse;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "progress") cmp = a.progress - b.progress;
      else cmp = a.lastActive.localeCompare(b.lastActive);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [students, query, courseFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    toast.success(`Generating ${type.toUpperCase()} report...`, {
      description: `The student roster for ${courseFilter === 'all' ? 'all courses' : 'selected course'} is being prepared.`
    });

    const dataToExport = filtered.map((s) => {
      const course = courses.find((c) => c.id === s.courseId);
      return {
        Student: s.name,
        Email: s.email,
        Course: course?.title ?? "—",
        Progress: `${s.progress}%`,
        Grade: s.grade || "Not Graded",
        "Last Active": s.lastActive,
      };
    });

    const filename = `student_roster_${new Date().toISOString().split("T")[0]}`;

    if (type === "excel") {
      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === "pdf") {
      const doc = new jsPDF();
      doc.text("Student Roster", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [["Student", "Email", "Course", "Progress", "Grade", "Last Active"]],
        body: dataToExport.map((row) => [
          row.Student,
          row.Email,
          row.Course,
          row.Progress,
          row.Grade,
          row["Last Active"],
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
      });
      doc.save(`${filename}.pdf`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Student Roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} students enrolled in your courses.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => handleExport('excel')}
             className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold shadow-soft hover:bg-accent transition"
           >
              <FileSpreadsheet className="h-4 w-4 text-success" /> Export Excel
           </button>
           <button 
             onClick={() => handleExport('pdf')}
             className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold shadow-soft hover:bg-accent transition"
           >
              <FileText className="h-4 w-4 text-destructive" /> Export PDF
           </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">
                  <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground transition">
                    Student <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3 text-left font-medium">Course</th>
                <th className="px-5 py-3 text-left font-medium">
                  <button onClick={() => toggleSort("progress")} className="inline-flex items-center gap-1 hover:text-foreground transition">
                    Progress <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3 text-left font-medium">Final Grade</th>
                <th className="px-5 py-3 text-left font-medium">
                  <button onClick={() => toggleSort("lastActive")} className="inline-flex items-center gap-1 hover:text-foreground transition">
                    Last active <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const course = courses.find((c) => c.id === s.courseId);
                const initials = (s?.name || "Student").split(" ").map((n) => n[0]).slice(0, 2).join("");
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground shadow-soft">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-medium">{course?.title ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-primary" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold">{s.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {gradingId === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={gradeInput}
                            onChange={(e) => setGradeInput(e.target.value)}
                            className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          />
                          <button 
                            onClick={() => {
                              toast.success(`Grade updated for ${s.name}`);
                              setGradingId(null);
                            }}
                            className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center transition"
                          ><Check className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setGradingId(s.id);
                            setGradeInput(s.grade || "");
                          }}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition hover:scale-105 ${s.grade ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}
                        >
                           {s.grade || "Input Grade"}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[10px] font-medium text-muted-foreground uppercase">{s.lastActive}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link 
                          to="/instructor/messages" 
                          search={{ studentId: s.id }}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition" 
                          title="Send Message"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => setSelectedStudent(s)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition" 
                          title="Student Details"
                        >
                          <User className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="font-display text-base font-semibold">No students match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try clearing the search or course filter.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground shadow-soft">
                  {(selectedStudent.name || "S").split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-semibold text-muted-foreground">Course</span>
                <span className="col-span-3 text-sm font-medium">
                  {courses.find(c => c.id === selectedStudent.courseId)?.title || "—"}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-semibold text-muted-foreground">Progress</span>
                <span className="col-span-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-primary" style={{ width: `${selectedStudent.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold">{selectedStudent.progress}%</span>
                  </div>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-semibold text-muted-foreground">Grade</span>
                <span className="col-span-3 text-sm font-medium">
                  {selectedStudent.grade ? (
                    <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                      {selectedStudent.grade}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not Graded</span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right text-sm font-semibold text-muted-foreground">Last Active</span>
                <span className="col-span-3 text-sm font-medium">{selectedStudent.lastActive}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

