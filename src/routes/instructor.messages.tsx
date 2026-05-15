import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Search, MoreVertical, Loader2 } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { messagesCollection } from "@/lib/db/collections";
import { toast } from "sonner";

export const Route = createFileRoute("/instructor/messages")({
  component: MessagesPage,
});

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt?: any;
};

function conversationIdFor(a: string, b: string) {
  return [a, b].sort().join("__");
}

function formatTime(ts: any): string {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessagesPage() {
  const { user } = useAuthStore();
  const students = useInstructorStore((s) => s.students);
  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>();
    return students.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [students]);

  const [activeChat, setActiveChat] = useState<string>("");
  const [searchQ, setSearchQ] = useState("");
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeChat && uniqueStudents[0]?.id) setActiveChat(uniqueStudents[0].id);
  }, [uniqueStudents, activeChat]);

  const currentStudent = uniqueStudents.find((s) => s.id === activeChat);
  const conversationId =
    user && activeChat ? conversationIdFor(user.id, activeChat) : "";

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(
        messagesCollection,
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc"),
      ),
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
        setTimeout(() => {
          scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
        }, 50);
      },
      (err) => {
        console.error("Messages subscription error:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [conversationId]);

  const filteredStudents = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return uniqueStudents;
    return uniqueStudents.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q),
    );
  }, [uniqueStudents, searchQ]);

  const send = async () => {
    if (!user || !activeChat || !msg.trim()) return;
    setSending(true);
    try {
      await addDoc(messagesCollection, {
        conversationId,
        senderId: user.id,
        senderName: user.displayName || user.email || "Instructor",
        recipientId: activeChat,
        recipientName: currentStudent?.name || "",
        text: msg.trim(),
        createdAt: serverTimestamp(),
      });
      setMsg("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="font-display text-3xl font-bold">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directly message your students.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-border bg-card shadow-card flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-full sm:w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No students yet.
              </p>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveChat(s.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition hover:bg-muted/50 ${
                    activeChat === s.id ? "bg-primary/5 border-r-4 border-primary" : ""
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {(s?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="hidden sm:flex flex-1 flex-col bg-muted/5">
          {currentStudent ? (
            <>
              <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {(currentStudent?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{currentStudent.name}</p>
                    <p className="text-[10px] text-muted-foreground">{currentStudent.email}</p>
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div ref={scrollerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    No messages yet. Send the first one.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-soft ${
                            mine
                              ? "bg-gradient-primary text-primary-foreground rounded-tr-none"
                              : "bg-card border border-border rounded-tl-none"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                          <p
                            className={`text-[10px] mt-1.5 font-medium ${
                              mine
                                ? "text-primary-foreground/70 text-right"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-card border-t border-border shrink-0">
                <div className="relative flex items-center gap-2">
                  <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-2xl border border-border bg-muted/30 py-3 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !msg.trim()}
                    className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-soft hover:shadow-glow transition disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Send className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm font-medium">Select a student to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
