import { createFileRoute } from "@tanstack/react-router";
import { Award, Download, ShieldCheck } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { EmptyState } from "@/components/dashboard/EmptyState";
import jsPDF from "jspdf";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/certificates")({
  component: Certificates,
});

function Certificates() {
  const certificates = useDashboardStore((s) => s.certificates);
  const user = useDashboardStore((s) => s.user);
  const studentName = user.displayName || user.email || "Student";

  const handleDownload = (c: any) => {
    try {
      // Landscape certificate
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Colors
      const primaryIndigo = [79, 70, 229];
      const darkSlate = [15, 23, 42];

      // Draw elegant double borders
      doc.setDrawColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
      doc.setLineWidth(2);
      doc.rect(8, 8, 281, 194); // Outer border

      doc.setDrawColor(226, 232, 240); // Soft grey border
      doc.setLineWidth(1);
      doc.rect(12, 12, 273, 186); // Inner border

      // Top corner decorations
      doc.setFillColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
      doc.triangle(8, 8, 28, 8, 8, 28, "F");
      doc.triangle(289, 8, 269, 8, 289, 28, "F");
      doc.triangle(8, 202, 28, 202, 8, 182, "F");
      doc.triangle(289, 202, 269, 202, 289, 182, "F");

      // Title & Branding
      doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("UNIVERSITY OF SCIENCE & TECHNOLOGY", 148, 40, { align: "center" });

      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("VERIFIED CERTIFICATE OF COMPLETION", 148, 52, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.line(98, 58, 198, 58);

      // Certificate content text
      doc.setFontSize(12);
      doc.setFont("helvetica", "italic");
      doc.text("This is proudly presented to", 148, 75, { align: "center" });

      doc.setTextColor(primaryIndigo[0], primaryIndigo[1], primaryIndigo[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text(studentName, 148, 92, { align: "center" });

      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("for successfully fulfilling all coursework and requirements to achieve mastery in", 148, 108, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(c.course, 148, 122, { align: "center" });

      // Verification detail
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Credential ID: ${c.credentialId}`, 148, 140, { align: "center" });
      doc.text(`Verification Date: ${new Date(c.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, 148, 145, { align: "center" });

      // Signatures
      doc.setDrawColor(200, 200, 200);
      doc.line(45, 172, 115, 172);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Dr. Chinwe Okafor", 80, 177, { align: "center" });
      doc.setFontSize(8);
      doc.text("Lead Academic Dean", 80, 181, { align: "center" });

      doc.line(180, 172, 250, 172);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("UST Verification Office", 215, 177, { align: "center" });
      doc.setFontSize(8);
      doc.text("Administrative Board Seal", 215, 181, { align: "center" });

      // Save the PDF
      doc.save(`Certificate_${c.course.replace(/\s+/g, "_")}.pdf`);
      toast.success("Verifiable certificate downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate certificate PDF.");
    }
  };

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
                <button 
                  onClick={() => handleDownload(c)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
                >
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
