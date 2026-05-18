import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, FileText, Award, User, LogOut, X, Search, GraduationCap, CalendarCheck, Wallet, MessageSquare, Calendar, Mail as MailIcon } from "lucide-react";
import upskillLogo from "@/assets/upskill-logo.png";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/auth-api";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  exact?: boolean;
};

const items: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { to: "/dashboard/catalog", label: "Course Catalog", icon: Search },
  { to: "/dashboard/assignments", label: "Assignments", icon: FileText },
  { to: "/dashboard/quizzes", label: "Quizzes", icon: CalendarCheck },
  { to: "/dashboard/grades", label: "Grades", icon: GraduationCap },
  { to: "/dashboard/attendance", label: "Attendance", icon: User },
  { to: "/dashboard/certificates", label: "Certificates", icon: Award },
  { to: "/dashboard/finance", label: "Finance", icon: Wallet },
  { to: "/dashboard/community", label: "Community", icon: MessageSquare },
  { to: "/dashboard/messages", label: "Messages", icon: MailIcon },
  { to: "/dashboard/profile", label: "Profile", icon: User },
];

export function DashboardSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card p-1 shadow-soft ring-1 ring-border">
              <img src={upskillLogo} alt="Upskill" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Upskill</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Student Portal
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          {items.map((item) => {
            const isActive = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <button
            onClick={async () => {
              await authApi.logout();
              window.location.href = "/";
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
