import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, MessageCircle, Reply, Plus, Send, X, Loader2, Trash2 } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  forumPostsCollection,
  forumRepliesCollection,
} from "@/lib/db/collections";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/community")({
  component: CommunityPage,
});

type Post = {
  id: string;
  courseId: string;
  courseName?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt?: any;
  tags?: string[];
};

type Reply = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt?: any;
};

function formatTime(ts: any): string {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function CommunityPage() {
  const { user } = useAuthStore();
  const courses = useInstructorStore((s) => s.courses);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [query_, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedCourse && courses[0]?.id) setSelectedCourse(courses[0].id);
  }, [courses, selectedCourse]);

  // Subscribe to posts for instructor's courses
  useEffect(() => {
    const courseIds = courses.map((c) => c.id).filter(Boolean);
    if (courseIds.length === 0) {
      setPosts([]);
      setLoadingPosts(false);
      return;
    }
    setLoadingPosts(true);
    // Firestore "in" supports up to 10 values; chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < courseIds.length; i += 10) chunks.push(courseIds.slice(i, i + 10));
    const bySource: Record<number, Post[]> = {};
    const unsubs = chunks.map((ids, idx) =>
      onSnapshot(
        query(forumPostsCollection, where("courseId", "in", ids)),
        (snap) => {
          bySource[idx] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          const merged = Object.values(bySource).flat();
          merged.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() || 0;
            const tb = b.createdAt?.toMillis?.() || 0;
            return tb - ta;
          });
          setPosts(merged);
          setLoadingPosts(false);
        },
        (err) => {
          console.error("Forum posts subscription error:", err);
          setLoadingPosts(false);
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [courses]);

  // Subscribe to replies for the open post
  useEffect(() => {
    if (!openPost) return;
    const unsub = onSnapshot(
      query(forumRepliesCollection, where("postId", "==", openPost)),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        // Sort locally to avoid indexing requirements
        docs.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return ta - tb;
        });
        setReplies((prev) => ({
          ...prev,
          [openPost]: docs,
        }));
      },
      (err) => console.error("Replies subscription error:", err),
    );
    return () => unsub();
  }, [openPost]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchCourse = !selectedCourse || p.courseId === selectedCourse;
      const q = query_.trim().toLowerCase();
      const matchQ = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      return matchCourse && matchQ;
    });
  }, [posts, selectedCourse, query_]);

  const createPost = async () => {
    if (!user || !selectedCourse || !newTitle.trim() || !newContent.trim()) {
      toast.error("Fill all fields and pick a course");
      return;
    }
    const course = courses.find((c) => c.id === selectedCourse);
    setSubmitting(true);
    try {
      await addDoc(forumPostsCollection, {
        courseId: selectedCourse,
        courseName: course?.title || "",
        title: newTitle.trim(),
        content: newContent.trim(),
        authorId: user.id,
        authorName: user.displayName || user.email || "Instructor",
        authorRole: user.role,
        createdAt: serverTimestamp(),
        tags: ["announcement"],
      });
      setNewTitle("");
      setNewContent("");
      setShowNew(false);
      toast.success("Topic posted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (postId: string) => {
    if (!user) return;
    const text = (replyText[postId] || "").trim();
    if (!text) return;
    try {
      await addDoc(forumRepliesCollection, {
        postId,
        authorId: user.id,
        authorName: user.displayName || user.email || "Instructor",
        authorRole: user.role,
        content: text,
        createdAt: serverTimestamp(),
      });
      // Increment repliesCount on the post doc
      // Note: In a real app, use a transaction or cloud function for accuracy
      try {
        const postRef = doc(forumPostsCollection, postId);
        await updateDoc(postRef, {
          repliesCount: (posts.find(p => p.id === postId) as any)?.repliesCount + 1 || 1
        });
      } catch (err) {
        console.error("Failed to update reply count:", err);
      }
      setReplyText((p) => ({ ...p, [postId]: "" }));
    } catch (e: any) {
      toast.error(e?.message || "Failed to reply");
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this discussion?")) return;
    try {
      await deleteDoc(doc(forumPostsCollection, postId));
      toast.success("Discussion deleted");
      if (openPost === postId) setOpenPost(null);
    } catch (e: any) {
      toast.error("Failed to delete post");
    }
  };

  const deleteReply = async (replyId: string, postId: string) => {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await deleteDoc(doc(forumRepliesCollection, replyId));
      
      // Decrement repliesCount
      try {
        const postRef = doc(forumPostsCollection, postId);
        const post = posts.find(p => p.id === postId);
        await updateDoc(postRef, {
          repliesCount: Math.max(0, ((post as any)?.repliesCount || 0) - 1)
        });
      } catch (err) {
        console.error("Failed to update reply count:", err);
      }
      
      toast.success("Reply deleted");
    } catch (e: any) {
      toast.error("Failed to delete reply");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Community Boards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start discussions and respond to your students.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition"
          >
            <Plus className="h-4 w-4" /> New Topic
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query_}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search discussions..."
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>

      {loadingPosts ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold">No discussions yet</p>
          <p className="text-xs text-muted-foreground">Start the first topic for your students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const postReplies = replies[d.id] || [];
            const isOpen = openPost === d.id;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {d.courseName && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {d.courseName}
                        </span>
                      )}
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                        {d.authorRole}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold">{d.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{d.content}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{d.authorName}</span>
                      <span>·</span>
                      <span>{formatTime(d.createdAt)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {(d as any).repliesCount || 0} replies
                      </span>
                    </div>
                  </div>
                  {user?.id === d.authorId && (
                    <button
                      onClick={() => deletePost(d.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setOpenPost(isOpen ? null : d.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/80 transition"
                  >
                    <Reply className="h-3.5 w-3.5" /> {isOpen ? "Hide replies" : "View & Reply"}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {postReplies.map((r) => (
                      <div key={r.id} className="rounded-xl bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{r.authorName}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">{formatTime(r.createdAt)}</span>
                          </div>
                          {user?.id === r.authorId && (
                            <button
                              onClick={() => deleteReply(r.id, d.id)}
                              className="text-muted-foreground hover:text-destructive transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-sm">{r.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={replyText[d.id] || ""}
                        onChange={(e) =>
                          setReplyText((p) => ({ ...p, [d.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendReply(d.id);
                        }}
                        placeholder="Write a reply..."
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        onClick={() => sendReply(d.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:shadow-glow transition"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setShowNew(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">New Discussion</h2>
              <button
                onClick={() => setShowNew(false)}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Topic title"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What would you like to discuss?"
                rows={5}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={createPost}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-glow transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Post Topic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
