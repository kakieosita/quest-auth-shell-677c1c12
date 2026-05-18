import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Plus, X, Search, Megaphone, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useInstructorStore } from "@/stores/instructor-store";

export const Route = createFileRoute("/instructor/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const announcements = useInstructorStore((s) => s.announcements);
  const postAnnouncement = useInstructorStore((s) => s.postAnnouncement);
  const deleteAnnouncement = useInstructorStore((s) => s.deleteAnnouncement);
  const courses = useInstructorStore((s) => s.courses);
  const profile = useInstructorStore((s) => s.profile);
  
  const [openCreate, setOpenCreate] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    courseId: courses[0]?.id || "",
    content: "",
  });

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    postAnnouncement(newAnnouncement);
    setOpenCreate(false);
    setNewAnnouncement({ title: "", courseId: courses[0]?.id || "", content: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Course Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Broadcast updates and notices to your students.</p>
        </div>
        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
           {announcements.map((a) => {
             const course = courses.find(c => c.id === a.courseId);
             return (
               <article key={a.id} className="rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary/30 transition">
                  <div className="flex items-start justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                           <Megaphone className="h-5 w-5" />
                        </div>
                        <div>
                           <h3 className="font-bold text-lg leading-tight">{a.title}</h3>
                           <p className="text-xs text-primary font-semibold mt-0.5">{course?.title}</p>
                        </div>
                     </div>
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{a.date}</span>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
                     {a.content}
                  </div>
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                     <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Read by 142 students</span>
                        <span>0 comments</span>
                     </div>
                     {a.authorId === profile.id && (
                       <button
                         onClick={async () => {
                           if (confirm("Are you sure you want to delete this announcement?")) {
                             try {
                               await deleteAnnouncement(a.id);
                               toast.success("Announcement deleted.");
                             } catch (err: any) {
                               toast.error("Failed to delete announcement.");
                               console.error(err);
                             }
                           }
                         }}
                         className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                         aria-label="Delete announcement"
                       >
                          <Trash2 className="h-4 w-4" />
                       </button>
                     )}
                  </div>
               </article>
             );
           })}
           {announcements.length === 0 && (
             <div className="rounded-2xl border border-dashed border-border p-20 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No announcements posted yet.</p>
             </div>
           )}
        </div>

        <div className="space-y-6">
           <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold mb-4">Announcements Tip</h2>
              <div className="space-y-4">
                 <div className="p-4 rounded-xl bg-mint/5 border border-mint/20">
                    <p className="text-xs text-mint-foreground font-medium leading-relaxed">
                       Announcements are sent as push notifications and emails to all enrolled students immediately.
                    </p>
                 </div>
                 <ul className="space-y-3">
                    <li className="flex gap-2 text-xs text-muted-foreground">
                       <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                       Use clear, concise titles for better engagement.
                    </li>
                    <li className="flex gap-2 text-xs text-muted-foreground">
                       <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                       Include deadlines or action items if necessary.
                    </li>
                 </ul>
              </div>
           </div>
        </div>
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setOpenCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Post New Announcement</h3>
              <button onClick={() => setOpenCreate(false)} className="rounded-lg p-1.5 hover:bg-muted transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Title</label>
                <input
                  required
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="e.g. Important Update on Exam Schedule"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Course</label>
                <select
                  value={newAnnouncement.courseId}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, courseId: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Content</label>
                <textarea
                  required
                  rows={6}
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder="Type your announcement here..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setOpenCreate(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-gradient-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition">
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
