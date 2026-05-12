import { createFileRoute } from "@tanstack/react-router";
import { Award, Download, ShieldCheck } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const Route = createFileRoute("/dashboard/certificates")({
  component: Certificates,
});

function Certificates() {
  const certificates = useDashboardStore((s) => s.certificates);
  const user = useDashboardStore((s) => s.user);
  const studentName = user.displayName || user.email || "Student";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download and share your verified credentials.
        </p>
      </div>

      {certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete your first course to earn a verifiable certificate of completion."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {certificates.map((c) => (
            <article
              key={c.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <div className="relative bg-gradient-hero p-6 text-primary-foreground">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card/15 backdrop-blur">
                    <Award className="h-6 w-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-card/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="mt-6 text-xs uppercase tracking-wider opacity-80">
                  Certificate of completion
                </p>
                <h2 className="mt-1 font-display text-xl font-bold leading-tight">
                  {c.course}
                </h2>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Awarded to</span>
                  <span className="font-semibold text-foreground">{studentName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-semibold text-foreground">
                    {new Date(c.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Credential ID</span>
                  <span className="font-mono text-[11px] font-semibold text-foreground">{c.credentialId}</span>
                </div>
                <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow">
                  <Download className="h-4 w-4" /> Download certificate
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
