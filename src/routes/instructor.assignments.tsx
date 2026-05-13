import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, FileText, ClipboardCheck, X, Download } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { toast } from "sonner";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const Route = createFileRoute("/instructor/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const assignments = useInstructorStore((s) => s.assignments);
  const submissions = useInstructorStore((s) => s.submissions);
  const courses = useInstructorStore((s) => s.courses);
  const { addAssignment, gradeSubmission } = useInstructorStore();
  const [openCreate, setOpenCreate] = useState(false);
  const [openSubmissions, setOpenSubmissions] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [newAssignment, setNewAssignment] = useState<{ title: string; courseId: string; type: "assignment" | "quiz"; dueDate: string }>({ title: "", courseId: "", type: "assignment", dueDate: "" });

  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (!newAssignment.title || !newAssignment.courseId) {
      toast.error("Please fill in the title and select a course.");
      return;
    }

    setCreating(true);
    try {
      const course = courses.find(c => c.id === newAssignment.courseId);

      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (assignmentFile) {
        const storageRef = ref(storage, `assignments/${newAssignment.courseId}/${Date.now()}_${assignmentFile.name}`);
        await uploadBytes(storageRef, assignmentFile);
        fileUrl = await getDownloadURL(storageRef);
        fileName = assignmentFile.name;
      }

      await addAssignment({
        title: newAssignment.title,
        courseId: newAssignment.courseId,
        courseName: course?.title || "",
        type: newAssignment.type as any,
        dueDate: newAssignment.dueDate,
        description: "",
        ...(fileUrl ? { fileUrl, fileName } as any : {}),
      } as any);
      toast.success("Assignment created successfully!");
      setOpenCreate(false);
      setNewAssignment({ title: "", courseId: "", type: "assignment", dueDate: "" });
      setAssignmentFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create assignment.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Assignments & Quizzes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{assignments.length} assignments across your courses.</p>
        </div>
        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition"
        >
          <Plus className="h-4 w-4" /> New assignment
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {assignments.map((a) => {
          const submissionRate = Math.round((a.submissions / a.totalStudents) * 100);
          const gradedRate = a.submissions > 0 ? Math.round((a.graded / a.submissions) * 100) : 0;
          const Icon = a.type === "quiz" ? ClipboardCheck : FileText;
          return (
            <article key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/30 transition">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{a.type}</span>
                  <h3 className="line-clamp-2 font-display text-base font-bold leading-snug">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.courseName}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Submissions</span>
                    <span className="font-semibold">{a.submissions}/{a.totalStudents}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-primary" style={{ width: `${submissionRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Graded</span>
                    <span className="font-semibold">{a.graded}/{a.submissions}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-success" style={{ width: `${gradedRate}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Due {new Date(a.dueDate).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this assignment?")) {
                        await useInstructorStore.getState().deleteAssignment(a.id);
                        toast.success("Assignment deleted.");
                      }
                    }}
                    className="rounded-lg border border-destructive/20 p-1.5 text-destructive hover:bg-destructive/10 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setOpenSubmissions(a.id)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/80 transition"
                  >
                    View submissions
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Create modal */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpenCreate(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">New assignment</h3>
              <button onClick={() => setOpenCreate(false)} className="rounded-lg p-1.5 hover:bg-muted transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Title</label>
                <input
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="e.g. Build a CRUD API"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Course</label>
                <select
                  value={newAssignment.courseId}
                  onChange={(e) => setNewAssignment({ ...newAssignment, courseId: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Type</label>
                  <select
                    value={newAssignment.type}
                    onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value as any })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Due date</label>
                  <input
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Assignment File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-primary hover:file:bg-accent/80 cursor-pointer"
                />
                {assignmentFile && (
                  <p className="mt-1 text-[10px] text-muted-foreground">{assignmentFile.name}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpenCreate(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition">
                Cancel
              </button>
              <button onClick={submit} className="rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions modal */}
      {openSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpenSubmissions(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-card flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5 shrink-0">
              <div>
                <h3 className="font-display text-lg font-bold">Submissions</h3>
                <p className="text-xs text-muted-foreground">{assignments.find((a) => a.id === openSubmissions)?.title}</p>
              </div>
              <button onClick={() => setOpenSubmissions(null)} className="rounded-lg p-1.5 hover:bg-muted transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {submissions.filter((s) => s.assignmentId === openSubmissions).map((sub) => (
                <li key={sub.id} className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{sub.studentName}</p>
                      <p className="truncate text-xs text-muted-foreground">{sub.fileName} · {sub.submittedAt}</p>
                    </div>
                    {sub.status === "graded" ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">{sub.grade}</span>
                    ) : gradingId !== sub.id && (
                      <button
                        onClick={() => {
                          setGradingId(sub.id);
                          setGradeInput("");
                          setFeedbackInput("");
                        }}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/80 transition"
                      >
                        Grade
                      </button>
                    )}
                    <a
                      href={(sub as any).fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={(sub as any).fileName || true}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition"
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>

                  {(gradingId === sub.id) && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                       <div className="flex items-center gap-4">
                          <div className="flex-1">
                             <label className="mb-1 block text-[10px] font-bold uppercase text-primary">Score / Grade</label>
                             <input
                                autoFocus
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                                placeholder="e.g. A or 95"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary transition"
                             />
                          </div>
                          <div className="flex-1">
                             <p className="text-[10px] font-bold uppercase text-muted-foreground">Quick Feedback</p>
                             <div className="flex gap-1 mt-1">
                                {['Great work!', 'Improve logic', 'Check docs'].map(f => (
                                   <button 
                                     key={f}
                                     onClick={() => setFeedbackInput(f)}
                                     className="text-[9px] px-1.5 py-1 rounded bg-muted hover:bg-accent transition"
                                   >{f}</button>
                                ))}
                             </div>
                          </div>
                       </div>
                       <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase text-primary">Detailed Feedback</label>
                          <textarea
                             value={feedbackInput}
                             onChange={(e) => setFeedbackInput(e.target.value)}
                             rows={3}
                             placeholder="Provide constructive criticism..."
                             className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary resize-none transition"
                          />
                       </div>
                       <div className="flex justify-end gap-2">
                          <button 
                             onClick={() => setGradingId(null)}
                             className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-muted transition"
                          >Cancel</button>
                          <button
                             onClick={async () => {
                               if (gradeInput.trim() && openSubmissions) {
                                 try {
                                   await gradeSubmission(sub.id, openSubmissions, gradeInput.trim(), feedbackInput.trim());
                                   toast.success("Grade saved!");
                                   setGradingId(null);
                                   setGradeInput("");
                                   setFeedbackInput("");
                                 } catch (error) {
                                   toast.error("Failed to save grade.");
                                 }
                               }
                             }}
                             className="rounded-lg bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
                          >Save Grade</button>
                       </div>
                    </div>
                  )}

                  {sub.status === "graded" && sub.feedback && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3 ml-12">
                       <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Feedback Provided</p>
                       <p className="text-xs italic text-muted-foreground">"{sub.feedback}"</p>
                    </div>
                  )}
                </li>
              ))}
              {submissions.filter((s) => s.assignmentId === openSubmissions).length === 0 && (
                <li className="p-12 text-center text-sm text-muted-foreground italic">No submissions yet.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

