import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CreditCard, Sparkles, BookOpen, Users } from "lucide-react";
import upskillLogo from "@/assets/upskill-logo.png";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-mint/30 blur-3xl" />

        <Link to="/login" className="relative flex items-center gap-3 font-display text-xl font-bold">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-soft">
            <img src={upskillLogo} alt="Upskill School of Technology" className="h-full w-full object-contain" />
          </div>
          <span>Upskill<span className="ml-1 font-light opacity-80">SoT</span></span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative space-y-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Learning, reimagined
            </div>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight xl:text-5xl">
              Where curious minds<br />become brilliant ones.
            </h2>
            <p className="mt-4 max-w-md text-base text-primary-foreground/80">
              Join thousands of students and instructors building tech skills that matter at Upskill School of Technology, Owerri.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Feature icon={<BookOpen className="h-4 w-4" />} label="Industry curriculum" />
            <Feature icon={<Users className="h-4 w-4" />} label="Live cohorts" />
          </div>
        </motion.div>

        <p className="relative text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} Upskill School of Technology, Owerri.
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-col bg-gradient-soft">
        <header className="flex items-center justify-between p-6">
          <Link to="/login" className="flex items-center gap-2 font-display font-bold lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-soft">
              <img src={upskillLogo} alt="Upskill" className="h-full w-full object-contain" />
            </div>
            Upskill
          </Link>
          <nav aria-label="Account menu" className="ml-auto flex items-center gap-2">
            <Link
              to="/enroll"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card/80 px-3 text-sm font-semibold text-foreground shadow-soft transition hover:border-primary/50 hover:text-primary"
            >
              <CreditCard className="h-4 w-4" />
              Enroll & Pay
            </Link>
          </nav>
        </header>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-muted-foreground">{subtitle}</p>
            </div>

            {children}

            {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 text-sm">
      {icon}
      {label}
    </div>
  );
}
