import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Users, MessageCircle, PlusCircle, UserCircle2 } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { forumRepliesCollection, forumPostsCollection } from "@/lib/db/collections";
import { toast } from "sonner";
import { Send, X, Loader2, Reply, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/community")({
  component: DashboardCommunity,
});

function DashboardCommunity() {
  const { user } = useAuthStore();
  const forumPosts = useDashboardStore((s) => s.forumPosts);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  
  const enrolledCourses = useDashboardStore((s) => s.courses);

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

  const createPost = async () => {
    if (!user || !selectedCourse || !newTitle.trim() || !newContent.trim()) {
      toast.error("Fill all fields and pick a course");
      return;
    }
    const course = enrolledCourses.find((c) => c.id === selectedCourse);
    setSubmitting(true);
    try {
      await addDoc(forumPostsCollection, {
        courseId: selectedCourse,
        courseName: course?.title || "",
        title: newTitle.trim(),
        content: newContent.trim(),
        authorId: user.id,
        authorName: user.displayName || user.email || "Student",
        authorRole: user.role,
        createdAt: serverTimestamp(),
        repliesCount: 0,
        tags: ["discussion"],
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
    setSubmitting(true);
    try {
      await addDoc(forumRepliesCollection, {
        postId,
        authorId: user.id,
        authorName: user.displayName || user.email || "Student",
        authorRole: user.role,
        content: text,
        createdAt: serverTimestamp(),
      });
      // Increment repliesCount on the post doc
      try {
        const postRef = doc(forumPostsCollection, postId);
        await updateDoc(postRef, {
          repliesCount: (forumPosts.find(p => p.id === postId) as any)?.repliesCount + 1 || 1
        });
      } catch (err) {
        console.error("Failed to update reply count:", err);
      }
      setReplyText((p) => ({ ...p, [postId]: "" }));
      toast.success("Reply posted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reply");
    } finally {
      setSubmitting(false);
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
        const post = forumPosts.find(p => p.id === postId);
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

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Student Community</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect, discuss, and collaborate with your peers.
          </p>
        </div>
      </div>

      <Tabs defaultValue="forums" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="forums">
            <MessageSquare className="mr-2 h-4 w-4" /> Forums
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="mr-2 h-4 w-4" /> Study Groups
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageCircle className="mr-2 h-4 w-4" /> Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forums" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Discussions</h2>
            <Button onClick={() => setShowNew(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Topic
            </Button>
          </div>
          
          <div className="grid gap-4">
            {forumPosts.map((post) => {
              const isOpen = openPost === post.id;
              const postReplies = replies[post.id] || [];
              
              return (
                <Card key={post.id} className={`transition-all ${isOpen ? 'ring-2 ring-primary/20' : 'hover:bg-accent/40'}`}>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div 
                      className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
                      onClick={() => setOpenPost(isOpen ? null : post.id)}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{post.category}</Badge>
                          <span className="text-xs text-muted-foreground">{post.lastActive}</span>
                        </div>
                        <h3 className="font-semibold text-lg">{post.title}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <UserCircle2 className="mr-1 h-4 w-4" />
                          Posted by {post.author}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm font-medium">{(post as any).repliesCount || postReplies.length} replies</span>
                        </div>
                        {user?.id === (post as any).authorId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePost(post.id);
                            }}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-4 space-y-4 border-t pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Replies List */}
                        <div className="space-y-3">
                          {postReplies.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-2">No replies yet. Be the first to respond!</p>
                          ) : (
                            postReplies.map((r) => (
                              <div key={r.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs">{r.authorName}</span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">{r.authorRole}</Badge>
                                    <span className="text-[10px] text-muted-foreground ml-2">{formatTime(r.createdAt)}</span>
                                  </div>
                                  {user?.id === r.authorId && (
                                    <button
                                      onClick={() => deleteReply(r.id, post.id)}
                                      className="text-muted-foreground hover:text-destructive transition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-foreground/90">{r.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Reply Input */}
                        <div className="flex gap-2 pt-2">
                          <input
                            value={replyText[post.id] || ""}
                            onChange={(e) => setReplyText((p) => ({ ...p, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendReply(post.id);
                              }
                            }}
                            placeholder="Write a reply..."
                            className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <Button 
                            size="icon" 
                            onClick={() => sendReply(post.id)}
                            disabled={submitting || !(replyText[post.id] || "").trim()}
                          >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">My Study Groups</h2>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Group
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card>
               <CardHeader>
                 <CardTitle>React Study Circle</CardTitle>
                 <CardDescription>Created by Adaeze Okonkwo</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-xs">AO</div>
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-secondary text-secondary-foreground flex items-center justify-center text-xs">CE</div>
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-accent text-accent-foreground flex items-center justify-center text-xs">+3</div>
                 </div>
               </CardContent>
               <CardFooter>
                 <Button variant="outline" className="w-full">Open Group Chat</Button>
               </CardFooter>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card className="flex h-[500px] flex-col items-center justify-center text-center">
             <div className="rounded-full bg-accent p-4 mb-4">
               <MessageCircle className="h-8 w-8 text-primary" />
             </div>
             <h3 className="text-lg font-semibold">Your Messages</h3>
             <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
               Select a conversation from the sidebar or start a new message to a peer or instructor.
             </p>
             <Button>Start New Conversation</Button>
          </Card>
        </TabsContent>
      </Tabs>

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
                {enrolledCourses.map((c) => (
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
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                Post Topic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
