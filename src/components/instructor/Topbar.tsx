import { useState, useEffect } from "react";
import { Bell, Menu, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useInstructorStore } from "@/stores/instructor-store";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/auth-api";

export function InstructorTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const announcements = useInstructorStore((s) => s.announcements);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (announcements.length > 0) {
      const lastViewed = localStorage.getItem("instructor_last_notif_time");
      const latestAnn = announcements[0];
      const latestTime = (latestAnn.date as any)?.seconds ? (latestAnn.date as any).seconds * 1000 : ((latestAnn as any).timestamp ? (latestAnn as any).timestamp * 1000 : Date.now());
      if (!lastViewed || Number(lastViewed) < latestTime) {
        setHasUnread(true);
      } else {
        setHasUnread(false);
      }
    } else {
      setHasUnread(false);
    }
  }, [announcements]);

  const handleOpenNotifs = () => {
    if (!notifOpen && announcements.length > 0) {
      const latestAnn = announcements[0];
      const latestTime = (latestAnn.date as any)?.seconds ? (latestAnn.date as any).seconds * 1000 : ((latestAnn as any).timestamp ? (latestAnn as any).timestamp * 1000 : Date.now());
      localStorage.setItem("instructor_last_notif_time", latestTime.toString());
      setHasUnread(false);
    }
    setNotifOpen((v) => !v);
    setProfileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate({ to: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const displayName = user?.displayName || "Instructor User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <p className="font-display text-sm font-semibold">Instructor Panel</p>
        <p className="text-xs text-muted-foreground">Manage your courses & students</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            onClick={handleOpenNotifs}
            className="relative rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-card">
              <div className="border-b border-border p-4">
                <p className="font-display text-sm font-semibold">Notifications</p>
              </div>
              <ul className="max-h-80 divide-y divide-border overflow-auto">
                {announcements.length === 0 ? (
                  <li className="p-4 text-center text-sm text-muted-foreground">No new notifications</li>
                ) : (
                  announcements.slice(0, 5).map((n) => {
                    const dateVal = (n.date as any)?.seconds ? new Date((n.date as any).seconds * 1000) : (n.date ? new Date(n.date as any) : new Date());
                    const dateStr = dateVal.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <li key={n.id} className="cursor-pointer p-4 text-sm hover:bg-accent transition">
                        <p className="font-medium text-foreground">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{n.content}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-primary">{dateStr}</p>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl p-1.5 pr-3 transition hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight">{displayName.split(" ").slice(0, 2).join(" ")}</p>
              <p className="text-[10px] leading-tight text-muted-foreground capitalize">{user?.role || "instructor"}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", profileOpen && "rotate-180")} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover shadow-card">
              <div className="border-b border-border p-3">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <ul className="p-1 text-sm">
                <li>
                  <Link
                    to="/instructor/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"
                  >
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </li>
                <li>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent">
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                </li>
                <li className="my-1 border-t border-border" />
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
