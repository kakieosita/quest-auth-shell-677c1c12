import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Send, BellRing, Mail, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { auth } from "@/lib/firebase";
import { announcementsCollection } from "@/lib/db/collections";
import { onSnapshot, addDoc, doc, deleteDoc, Timestamp, query, orderBy } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [targetAudience, setTargetAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isInApp, setIsInApp] = useState(true);
  const [isEmail, setIsEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Sync announcements in real-time
    const unsubscribe = onSnapshot(query(announcementsCollection, orderBy("date", "desc")), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (err) => {
      console.error("Firestore subscription error in notifications:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both the title and the message content.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Broadcasting announcement...");
    try {
      const authorId = auth.currentUser?.uid || "admin";
      
      const newAnn = {
        title: title.trim(),
        content: content.trim(),
        date: Timestamp.now(),
        authorId: authorId,
        targetRole: targetAudience as any
      };

      await addDoc(announcementsCollection, newAnn);
      
      if (isEmail) {
        toast.info("Simulating email blast to all subscribers...");
      }

      toast.success("Announcement broadcast successfully!", { id: toastId });
      setTitle("");
      setContent("");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to broadcast announcement.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete/revoke this announcement?")) return;
    try {
      await deleteDoc(doc(announcementsCollection, id));
      toast.success("Announcement revoked successfully!");
    } catch (err) {
      toast.error("Failed to delete announcement.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications Center</h1>
          <p className="text-muted-foreground">
            Send announcements and manage communications with your users.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Send New Announcement</CardTitle>
            <CardDescription>
              Compose a message to send out via in-app notification or email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Audience</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger id="target">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="student">Students Only</SelectItem>
                  <SelectItem value="instructor">Instructors Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Notification Title</Label>
              <Input 
                id="title" 
                placeholder="e.g., System Maintenance Scheduled" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message Content</Label>
              <Textarea 
                id="message" 
                placeholder="Type your message here..." 
                className="min-h-[150px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-4 pt-2">
              <Label>Delivery Channels</Label>
              <div className="flex items-center space-x-2">
                <Switch id="in-app" checked={isInApp} onCheckedChange={setIsInApp} />
                <Label htmlFor="in-app" className="flex items-center cursor-pointer">
                  <BellRing className="mr-2 h-4 w-4" /> In-App Notification
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="email" checked={isEmail} onCheckedChange={setIsEmail} />
                <Label htmlFor="email" className="flex items-center cursor-pointer">
                  <Mail className="mr-2 h-4 w-4" /> Email Blast
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t px-6 py-4">
            <Button onClick={handleSend} disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" /> {isSubmitting ? "Broadcasting..." : "Send Now"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-1 flex flex-col h-[560px]">
          <CardHeader>
            <CardTitle>Recent Sent</CardTitle>
            <CardDescription>Your past communication history.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No announcements broadcast yet.</p>
            ) : announcements.map((item) => (
              <div key={item.id} className="flex flex-col space-y-1.5 border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm leading-tight">{item.title}</span>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Delete Announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span className="capitalize">Target: {item.targetRole === 'all' ? 'All Users' : `${item.targetRole}s`}</span>
                  <span>
                    {item.date && item.date.toDate 
                      ? item.date.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "N/A"
                    }
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
