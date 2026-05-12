import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2, Users, Plus, Search, FileDown } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";

export const Route = createFileRoute("/instructor/courses/")({
  component: MyCourses,
});

function MyCourses() {
  const courses = useInstructorStore((s) => s.courses);
  const deleteCourse = useInstructorStore((s) => s.deleteCourse);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = courses.filter((c) => {
    const matchesQuery = c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const statusColors = {
    published: "bg-success/15 text-success",
    draft: "bg-muted text-muted-foreground",
    archived: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">My Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">{courses.length} courses · manage and edit anytime.</p>
        </div>
        <Link
          to="/instructor/courses/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
        >
          <Plus className="h-4 w-4" /> Create course
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or category…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "published", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === s ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-display text-lg font-semibold">No courses found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different filter or create a new course.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article key={c.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-glow">
              <div className="relative h-32" style={{ background: c.thumbnail }}>
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusColors[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{c.category}</p>
                <h3 className="mt-1 line-clamp-2 font-display text-base font-bold leading-snug">{c.title}</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted py-1.5">
                    <p className="font-bold text-foreground">{c.students}</p>
                    <p className="text-[10px] text-muted-foreground">Students</p>
                  </div>
                  <div className="rounded-lg bg-muted py-1.5">
                    <p className="font-bold text-foreground">{c.lessons}</p>
                    <p className="text-[10px] text-muted-foreground">Lessons</p>
                  </div>
                  <div className="rounded-lg bg-muted py-1.5">
                    <p className="font-bold text-foreground">{c.rating || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Rating</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    to="/instructor/students"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-accent"
                  >
                    <Users className="h-3.5 w-3.5" /> Students
                  </Link>
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-xs font-semibold transition hover:bg-accent"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-destructive/30 bg-background p-2 text-destructive transition hover:bg-destructive/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Delete course?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently remove the course and unenroll all students. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCourse(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
