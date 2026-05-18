import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Mail, MapPin, Phone, Briefcase, Award, ExternalLink, Plus, Banknote, Download, FileText, ChevronRight } from "lucide-react";
import { useInstructorStore } from "@/stores/instructor-store";
import { toast } from "sonner";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const Route = createFileRoute("/instructor/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useInstructorStore((s) => s.profile);
  const updateProfile = useInstructorStore((s) => s.updateProfile);
  const credentials = useInstructorStore((s) => s.credentials);
  const earnings = useInstructorStore((s) => s.earnings);
  
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'credentials' | 'earnings'>('general');
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const profileName = profile.displayName || profile.email || "Instructor";
  const profileTitle = profile.role === "instructor" ? "Instructor" : "Team member";
  const joinedAt = profile.joinedAt?.toDate?.().toLocaleDateString() || profile.createdAt?.toDate?.().toLocaleDateString() || "recently";
  const initials = profileName.split(" ").map((part) => part[0]).slice(0, 2).join("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(form);
      setSaved(true);
      toast.success("Profile details updated in database!");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    }
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.next.length < 8) return setPwdMsg({ type: "error", text: "Password must be at least 8 characters." });
    if (pwd.next !== pwd.confirm) return setPwdMsg({ type: "error", text: "Passwords don't match." });
    
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, pwd.next);
        setPwdMsg({ type: "success", text: "Password updated successfully." });
        toast.success("Secure password updated successfully!");
        setPwd({ current: "", next: "", confirm: "" });
      } else {
        setPwdMsg({ type: "error", text: "You must be signed in to change your password." });
      }
    } catch (err: any) {
      console.error(err);
      setPwdMsg({ type: "error", text: err.message || "Failed to update password." });
      toast.error("Password update failed. Please re-authenticate and try again.");
    }
    setTimeout(() => setPwdMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Instructor Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your professional identity and financial records.</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
           {(['general', 'credentials', 'earnings'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-4 py-1.5 text-xs font-bold rounded-lg transition uppercase tracking-wider ${activeTab === tab ? 'bg-card shadow-soft text-primary' : 'text-muted-foreground hover:text-foreground'}`}
             >
                {tab}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-soft">
                {initials}
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold">{profileName}</h2>
                <p className="text-sm text-muted-foreground">{profileTitle}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground font-medium">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" /> {profile.email}</span>
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" /> {profile.phone}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {profile.location}</span>
                  <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-primary" /> Joined {joinedAt}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold">Personal Information</h3>
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Full name</label>
                    <input
                      value={form.displayName || ""}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Title</label>
                    <input
                      value={profileTitle}
                      readOnly
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Bio</label>
                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button type="submit" className="rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition">
                  Save changes
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>

            <form onSubmit={changePwd} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold">Security Settings</h3>
              <p className="mt-1 text-xs text-muted-foreground">Ensure your account remains protected.</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">New password</label>
                  <input
                    type="password"
                    value={pwd.next}
                    onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Confirm new password</label>
                  <input
                    type="password"
                    value={pwd.confirm}
                    onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button type="submit" className="rounded-xl bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition">
                  Update password
                </button>
                {pwdMsg && (
                  <span className={`text-xs font-semibold ${pwdMsg.type === "success" ? "text-success" : "text-destructive"}`}>
                    {pwdMsg.text}
                  </span>
                )}
              </div>
            </form>
          </div>
        </>
      )}

      {activeTab === 'credentials' && (
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Professional Credentials</h2>
              <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft hover:shadow-glow transition">
                 <Plus className="h-3.5 w-3.5" /> Add Credential
              </button>
           </div>
           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {credentials.map(c => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/30 transition">
                   <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                         <Award className="h-5 w-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.status === 'verified' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                         {c.status}
                      </span>
                   </div>
                   <h3 className="font-bold text-sm leading-snug mb-1">{c.title}</h3>
                   <p className="text-xs text-muted-foreground mb-4">{c.issuer} · {c.date}</p>
                   <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition">
                      <ExternalLink className="h-3 w-3" /> View Document
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="space-y-6">
           <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Earned</p>
                 <p className="text-2xl font-bold text-primary">₦2,450,000</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Pending Payout</p>
                 <p className="text-2xl font-bold text-warning">₦320,000</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Next Payout</p>
                 <p className="text-2xl font-bold text-success">May 1st, 2026</p>
              </div>
           </div>

           <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                 <h2 className="font-display text-lg font-bold">Payout History</h2>
                 <button className="text-xs font-bold text-primary hover:underline">Download all receipts</button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                       <tr>
                          <th className="px-6 py-3 text-left font-bold">Transaction ID</th>
                          <th className="px-6 py-3 text-left font-bold">Amount</th>
                          <th className="px-6 py-3 text-left font-bold">Status</th>
                          <th className="px-6 py-3 text-left font-bold">Date</th>
                          <th className="px-6 py-3 text-right font-bold">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                       {earnings.map(e => (
                         <tr key={e.id} className="hover:bg-muted/20 transition">
                            <td className="px-6 py-4 font-mono text-[10px]">{e.id}</td>
                            <td className="px-6 py-4 font-bold">₦{e.amount.toLocaleString()}</td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${e.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                  {e.status}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-muted-foreground">{e.date}</td>
                            <td className="px-6 py-4 text-right">
                               <button className="p-2 rounded-lg hover:bg-accent transition">
                                  <Download className="h-4 w-4" />
                               </button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

