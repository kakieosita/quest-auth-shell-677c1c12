import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, KeyRound, Check, Camera, Shield, BellRing, Eye, EyeOff, BookOpen, Search } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { updateDoc, doc } from "firebase/firestore";
import { usersCollection, studentsCollection } from "@/lib/db/collections";

export const Route = createFileRoute("/dashboard/profile")({
  component: Profile,
});

function Profile() {
  const { user, updateUser } = useDashboardStore();
  const [form, setForm] = useState(user);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initials = (user?.displayName || "User").split(" ").map((n) => n[0]).slice(0, 2).join("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(form);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
    toast.success("Profile details updated.");
  };

  const handlePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next) {
      setPwdMsg({ type: "error", text: "Please fill in all fields." });
      return;
    }
    if (pwd.next.length < 8) {
      setPwdMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ type: "error", text: "Passwords don't match." });
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error("No authenticated user found.");
      
      const cred = EmailAuthProvider.credential(currentUser.email, pwd.current);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, pwd.next);
      
      // Update portalPassword in Firestore for admin reference
      if (user?.id) {
        await updateDoc(doc(usersCollection, user.id), { portalPassword: pwd.next });
        await updateDoc(doc(studentsCollection, user.id), { portalPassword: pwd.next }).catch(() => {});
      }

      setPwdMsg({ type: "success", text: "Password updated successfully." });
      setPwd({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwdMsg(null), 2500);
    } catch (err: any) {
      console.error(err);
      setPwdMsg({ type: "error", text: err.message || "Failed to update password. Check current password." });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Profile & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account information, privacy, and notifications.
        </p>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          {/* Profile header card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="h-28 bg-gradient-hero" />
            <div className="-mt-12 flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
              <div className="relative group">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-primary text-3xl font-bold text-primary-foreground shadow-card ring-4 ring-card overflow-hidden">
                  {initials}
                </div>
                <button className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition rounded-2xl">
                  <Camera className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold">{user.displayName}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-primary">
                    {user.role}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    {user.matricNo}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    Joined {user.joinedAt && (user.joinedAt as any).toDate ? (user.joinedAt as any).toDate().toLocaleDateString() : String(user.joinedAt || "N/A")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal info form */}
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="font-display text-lg font-bold">Personal information</h2>
            <p className="text-sm text-muted-foreground">Update your details below.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  value={form.displayName || ""}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Email address">
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Location">
                <input
                  value={form.location || ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="input"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bio">
                  <textarea
                    value={form.bio || ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    className="input resize-none"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
              >
                <Save className="h-4 w-4" /> Save changes
              </button>
              {savedAt && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Change password */}
          <form
            onSubmit={handlePwd}
            className="rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Change password</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Use at least 8 characters with a mix of letters and numbers.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Field label="Current password">
                <input
                  type="password"
                  value={pwd.current}
                  onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                  className="input"
                  autoComplete="current-password"
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  className="input"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                  className="input"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            {pwdMsg && (
              <p
                className={`mt-4 text-sm font-medium ${pwdMsg.type === "success" ? "text-success" : "text-destructive"}`}
              >
                {pwdMsg.text}
              </p>
            )}

            <button
              type="submit"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
            >
              Update password
            </button>
          </form>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Privacy Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Control what information is visible to other students and instructors.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base cursor-pointer" htmlFor="p1">Public Profile</Label>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Make your bio and skills visible to all users.</p>
                </div>
                <Switch id="p1" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base cursor-pointer" htmlFor="p2">Show Courses</Label>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Allow others to see which programs you are currently enrolled in.</p>
                </div>
                <Switch id="p2" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base cursor-pointer" htmlFor="p3">Search Visibility</Label>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Allow your profile to appear in search results.</p>
                </div>
                <Switch id="p3" defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <BellRing className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Notification Preferences</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Choose how and when you want to be notified.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base cursor-pointer" htmlFor="n1">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive course updates and announcements via email.</p>
                </div>
                <Switch id="n1" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base cursor-pointer" htmlFor="n2">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get instant alerts on your device for new activities.</p>
                </div>
                <Switch id="n2" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base cursor-pointer" htmlFor="n3">Assignment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get notified about upcoming deadlines and submissions.</p>
                </div>
                <Switch id="n3" defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--background);
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.15s;
        }
        .input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

