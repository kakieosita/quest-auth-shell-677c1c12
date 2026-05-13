import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Award, Download } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { toast } from "sonner";
import type { Assignment } from "@/lib/dashboard-data";

export const Route = createFileRoute("/dashboard/assignments")({
  component: Assignments,
});

const statusBadge: Record<Assignment["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", className: "bg-accent text-primary", icon: FileText },
  submitted: { label: "Submitted", className: "bg-mint/30 text-mint-foreground", icon: CheckCircle2 },
  graded: { label: "Graded", className: "bg-success/15 text-success", icon: Award },
  overdue: { label: "Overdue", className: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

function Assignments() {
  const { assignments, submitAssignment } = useDashboardStore();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (id: string) => {
    setUploadingId(id);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId) {
      try {
        await submitAssignment(uploadingId, file);
        toast.success("Assignment submitted successfully!");
      } catch (err) {
        toast.error("Failed to upload assignment. Please try again.");
      } finally {
        setUploadingId(null);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track submissions and upload your work.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        accept=".pdf,.doc,.docx,.zip,.png,.jpg"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <ul className="divide-y divide-border">
          {assignments.map((a) => {
            const badge = statusBadge[a.status];
            const Icon = badge.icon;
            return (
              <li key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.course}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Due{" "}
                        <span className={a.status === "overdue" ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                          {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}>
                        <Icon className="h-3 w-3" />
                        {badge.label}
                      </span>
                      {a.grade && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success-foreground">
                          Grade: {a.grade}
                        </span>
                      )}
                    </div>
                    {a.feedback && (
                      <div className="mt-3 rounded-lg bg-accent/30 p-3 text-xs border border-border">
                        <p className="font-bold text-primary mb-1">Instructor Feedback:</p>
                        <p className="text-muted-foreground italic">"{a.feedback}"</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-2 sm:items-end">
                  {(a as any).fileUrl && (
                    <a
                      href={(a as any).fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={(a as any).fileName || true}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                    >
                      <Download className="h-4 w-4" />
                      Download {(a as any).fileName ? "" : "assignment"}
                    </a>
                  )}
                  {a.status === "pending" || a.status === "overdue" ? (
                    <button
                      onClick={() => handleUpload(a.id)}
                      disabled={uploadingId === a.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingId === a.id ? "Uploading…" : "Upload submission"}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Submitted
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
