import { createFileRoute } from "@tanstack/react-router";
import { Download, GraduationCap } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const Route = createFileRoute("/dashboard/grades")({
  component: DashboardGrades,
});

function DashboardGrades() {
  const grades = useDashboardStore((s) => s.grades);
  const user = useDashboardStore((s) => s.user);

  // Calculate GPA
  const calculateGPA = () => {
    if (grades.length === 0) return "0.00";
    const points: Record<string, number> = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 };
    let totalPoints = 0;
    let totalCredits = 0;
    
    grades.forEach(g => {
      totalPoints += (points[g.grade] || 0) * g.credits;
      totalCredits += g.credits;
    });
    
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  const gpa = calculateGPA();
  const studentName = user.displayName || user.email || "Student";
  const matricNo = user.matricNo || "USTO/2026/CS/0042";

  const handleDownload = () => {
    if (grades.length === 0) {
      toast.error("No grades available to generate a transcript.");
      return;
    }

    try {
      const doc = new jsPDF();

      // Color scheme (Indigo branding)
      const primaryColor = [79, 70, 229]; // Indigo
      const secondaryColor = [31, 41, 55]; // Gray-800

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, "F");

      // Title in Banner
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("UNIVERSITY OF SCIENCE & TECHNOLOGY", 15, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("OFFICIAL ACADEMIC TRANSCRIPT", 15, 28);

      // Student details section
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("STUDENT PROFILE", 15, 52);

      doc.setDrawColor(229, 231, 235); // Border color
      doc.line(15, 55, 195, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Full Name:", 15, 62);
      doc.setFont("helvetica", "bold");
      doc.text(studentName, 45, 62);

      doc.setFont("helvetica", "normal");
      doc.text("Matric Number:", 15, 68);
      doc.setFont("helvetica", "bold");
      doc.text(matricNo, 45, 68);

      doc.setFont("helvetica", "normal");
      doc.text("Cumulative GPA:", 115, 62);
      doc.setFont("helvetica", "bold");
      doc.text(`${gpa} / 4.00`, 145, 62);

      doc.setFont("helvetica", "normal");
      doc.text("Date Issued:", 115, 68);
      doc.setFont("helvetica", "bold");
      doc.text(new Date().toLocaleDateString("en-GB"), 145, 68);

      // Grades table header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("ACADEMIC PERFORMANCE LOG", 15, 82);
      doc.line(15, 85, 195, 85);

      // Construct table body
      const tableRows = grades.map((g) => [
        g.course,
        g.credits.toString(),
        `${g.score}%`,
        g.grade,
      ]);

      (doc as any).autoTable({
        startY: 90,
        head: [["Course Description", "Credits", "Score", "Grade"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: secondaryColor,
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: "center", cellWidth: 25 },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "right", fontStyle: "bold", cellWidth: 30 },
        },
        margin: { left: 15, right: 15 },
      });

      // Footer signature section
      const finalY = (doc as any).lastAutoTable.finalY + 25;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(15, finalY, 75, finalY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Registrar Signature", 15, finalY + 5);

      doc.line(135, finalY, 195, finalY);
      doc.text("Office Seal / Verification", 135, finalY + 5);

      // Save PDF
      doc.save(`Transcript_${studentName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Official academic transcript downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate transcript PDF.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Grades & Transcripts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your academic performance and download official records.
          </p>
        </div>
        <Button onClick={handleDownload} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Download Transcript
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:col-span-1 flex flex-col justify-center items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Cumulative GPA
          </h3>
          <p className="mt-2 font-display text-4xl font-bold text-foreground">
            {gpa}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Out of 4.0</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card md:col-span-2 overflow-hidden flex flex-col">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold text-lg">Course Grades</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.course}</TableCell>
                    <TableCell className="text-center">{g.credits}</TableCell>
                    <TableCell className="text-center">{g.score}%</TableCell>
                    <TableCell className="text-right font-bold text-primary">{g.grade}</TableCell>
                  </TableRow>
                ))}
                {grades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No grades recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
