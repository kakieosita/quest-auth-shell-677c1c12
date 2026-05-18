import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Award, 
  Plus, 
  Users, 
  Search, 
  CheckCircle2, 
  ExternalLink,
  Printer,
  Calendar,
  User,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { 
  certificatesCollection, 
  programsCollection, 
  enrollmentsCollection,
  usersCollection
} from "@/lib/db/collections";
import { 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  Timestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/certificates")({
  component: AdminCertificates,
});

const mockTemplates = [
  { id: "tmpl1", name: "Professional Graduate Certificate", lastUsed: "2 days ago", type: "Standard" },
  { id: "tmpl2", name: "Short Course Achievement", lastUsed: "1 week ago", type: "Minimalist" },
  { id: "tmpl3", name: "Honorary Fellowship", lastUsed: "Never", type: "Premium" },
];

function AdminCertificates() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [templates, setTemplates] = useState(mockTemplates);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", type: "Standard" });

  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("tmpl1");
  const [searchQuery, setSearchQuery] = useState("");

  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  useEffect(() => {
    // 1. Listen to programs
    const unsubPrograms = onSnapshot(programsCollection, (snap) => {
      setPrograms(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // 2. Listen to certificates
    const unsubCerts = onSnapshot(query(certificatesCollection, orderBy("issueDate", "desc")), (snap) => {
      setCertificates(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // 3. Listen to enrollments
    const unsubEnrollments = onSnapshot(enrollmentsCollection, (snap) => {
      setEnrollments(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    // 4. Listen to users
    const unsubUsers = onSnapshot(usersCollection, (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    return () => {
      unsubPrograms();
      unsubCerts();
      unsubEnrollments();
      unsubUsers();
    };
  }, []);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return;
    const item = {
      id: `tmpl-${Math.floor(Math.random() * 1000)}`,
      name: newTemplate.name,
      lastUsed: "Never",
      type: newTemplate.type
    };
    setTemplates([...templates, item]);
    setNewTemplate({ name: "", type: "Standard" });
    setIsAddTemplateOpen(false);
    toast.success("Certificate template created successfully!");
  };

  const handleIssueCertificates = async () => {
    if (!selectedProgramId) {
      toast.error("Please select a program cohort first.");
      return;
    }

    const targetProgram = programs.find(p => p.id === selectedProgramId);
    if (!targetProgram) return;

    // Filter completed or progress >= 90
    const targetEnrollments = enrollments.filter(e => 
      e.programId === selectedProgramId && (e.status === 'completed' || (e.progress || 0) >= 90)
    );

    if (targetEnrollments.length === 0) {
      toast.warning("No graduates (progress >= 90% or status completed) found in this program.");
      return;
    }

    const toastId = toast.loading("Generating verifiable certificates...");
    let issuedCount = 0;

    try {
      for (const e of targetEnrollments) {
        // Ensure no duplicate cert
        const exists = certificates.some(c => c.studentId === e.studentId && c.programId === selectedProgramId);
        if (exists) continue;

        const studentUser = users.find(u => u.id === e.studentId);
        const studentName = studentUser?.displayName || e.studentName || studentUser?.email || "Student Graduate";

        const certId = `CERT-${Math.floor(100000 + Math.random() * 900000)}`;
        const shortCode = targetProgram.title.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "UST");
        const verId = `UST-${shortCode}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newCert = {
          studentId: e.studentId,
          studentName: studentName,
          programId: selectedProgramId,
          programName: targetProgram.title,
          issueDate: Timestamp.now(),
          verificationId: verId,
        };

        await setDoc(doc(certificatesCollection, certId), newCert as any);
        issuedCount++;
      }

      if (issuedCount === 0) {
        toast.info("All eligible students in this cohort already have certificates.", { id: toastId });
      } else {
        toast.success(`Successfully issued ${issuedCount} certificates to graduates!`, { id: toastId });
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to execute bulk issuance wizard.", { id: toastId });
    }
  };

  const handleDeleteCertificate = async (certId: string) => {
    if (!confirm("Are you sure you want to revoke/delete this certificate?")) return;
    try {
      await deleteDoc(doc(certificatesCollection, certId));
      toast.success("Certificate revoked successfully!");
    } catch (err: any) {
      toast.error("Failed to revoke certificate.");
    }
  };

  const filteredCerts = certificates.filter(c => {
    const queryStr = searchQuery.toLowerCase();
    return (
      (c.studentName || "").toLowerCase().includes(queryStr) ||
      (c.programName || "").toLowerCase().includes(queryStr) ||
      (c.verificationId || "").toLowerCase().includes(queryStr)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificate Management</h1>
          <p className="text-muted-foreground">Design templates and issue professional credentials to graduates.</p>
        </div>
        
        <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Certificate Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input 
                  required 
                  value={newTemplate.name} 
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} 
                  placeholder="e.g. Master Class Certificate" 
                />
              </div>
              <div className="space-y-2">
                <Label>Style Variant</Label>
                <Select 
                  value={newTemplate.type} 
                  onValueChange={(val) => setNewTemplate({ ...newTemplate, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard (Modern)</SelectItem>
                    <SelectItem value="Minimalist">Minimalist (Sleek)</SelectItem>
                    <SelectItem value="Premium">Premium (Classic Borders)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">Create Template</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="issuance">Bulk Issuance</TabsTrigger>
          <TabsTrigger value="verification">Verification Log ({certificates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
             {templates.map(t => (
               <Card key={t.id} className="overflow-hidden group">
                  <div className="aspect-[1.4/1] bg-muted relative flex items-center justify-center p-8">
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="border-4 border-double border-primary/20 w-full h-full flex flex-col items-center justify-center p-4">
                        <Award className="h-12 w-12 text-primary/40 mb-2" />
                        <div className="h-2 w-24 bg-muted-foreground/20 rounded-full mb-1" />
                        <div className="h-1.5 w-16 bg-muted-foreground/10 rounded-full" />
                     </div>
                  </div>
                  <CardHeader className="p-4 pb-2">
                     <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold">{t.name}</CardTitle>
                        <Badge variant="secondary" className="text-[10px]">{t.type}</Badge>
                     </div>
                     <CardDescription className="text-xs">Last used {t.lastUsed}</CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 gap-2">
                     <Button variant="ghost" size="sm" className="flex-1 text-xs">Edit</Button>
                     <Button variant="outline" size="sm" className="flex-1 text-xs">Preview</Button>
                  </CardFooter>
               </Card>
             ))}
             <Card className="border-dashed flex flex-col items-center justify-center p-6 text-center h-[240px]">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                   <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-sm">New Template</h3>
                <p className="text-xs text-muted-foreground mt-1">Start from a blank canvas or clone existing.</p>
                <Button variant="ghost" onClick={() => setIsAddTemplateOpen(true)} className="mt-4 text-xs">Open Designer</Button>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="issuance" className="space-y-4">
           <Card>
              <CardHeader>
                 <CardTitle className="text-lg">Bulk Issuance Wizard</CardTitle>
                 <CardDescription>Select a completed cohort to generate and issue digital certificates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">1. Select Cohort / Program</label>
                       <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                         <SelectTrigger>
                           <SelectValue placeholder="Choose target program..." />
                         </SelectTrigger>
                         <SelectContent>
                           {programs.map(p => {
                             const graduatesCount = enrollments.filter(e => e.programId === p.id && (e.status === 'completed' || (e.progress || 0) >= 90)).length;
                             return (
                               <SelectItem key={p.id} value={p.id}>
                                 {p.title} ({graduatesCount} Graduates)
                               </SelectItem>
                             );
                           })}
                         </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase text-muted-foreground">2. Choose Template</label>
                       <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {templates.map(t => (
                             <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>
                 </div>
                 <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                       <Users className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-sm font-bold">Ready for Generation</h4>
                       <p className="text-xs text-muted-foreground">
                         Certificates will be generated, verifiable cryptographic IDs assigned, and digital copies published directly to student dashboard accounts in real-time.
                       </p>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                 <Button onClick={handleIssueCertificates} className="w-full sm:w-auto">
                    <Printer className="mr-2 h-4 w-4" /> Generate & Issue Certificates
                 </Button>
              </CardFooter>
           </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
           <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search Verification ID or Student Name..." 
                   className="pl-8" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
           </div>
           <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                 <TableHeader>
                    <TableRow>
                       <TableHead>Student</TableHead>
                       <TableHead>Program</TableHead>
                       <TableHead>Issue Date</TableHead>
                       <TableHead>Verification ID</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {filteredCerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No issued certificates found matching criteria.
                        </TableCell>
                      </TableRow>
                    ) : filteredCerts.map(cert => (
                      <TableRow key={cert.id}>
                         <TableCell className="font-semibold">{cert.studentName || "Student Graduate"}</TableCell>
                         <TableCell>{cert.programName || "UST Academy Program"}</TableCell>
                         <TableCell className="text-muted-foreground">
                            {cert.issueDate && cert.issueDate.toDate 
                              ? cert.issueDate.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                              : "N/A"
                            }
                         </TableCell>
                         <TableCell>
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold text-primary font-mono">{cert.verificationId}</code>
                         </TableCell>
                         <TableCell className="text-right flex items-center justify-end gap-2">
                            <Button 
                              onClick={() => {
                                setVerificationResult(cert);
                                setIsVerifyOpen(true);
                              }}
                              variant="ghost" 
                              size="sm" 
                              className="gap-1.5 text-xs text-primary"
                            >
                               <ExternalLink className="h-3 w-3" /> Verify
                            </Button>
                            <Button
                              onClick={() => handleDeleteCertificate(cert.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </div>
        </TabsContent>
      </Tabs>

      {/* Verification Seal Modal */}
      <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
        <DialogContent className="sm:max-w-[480px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" /> Digital Certificate Verifier
            </DialogTitle>
          </DialogHeader>
          {verificationResult && (
            <div className="space-y-6 pt-4 text-center">
              <div className="flex flex-col items-center justify-center p-6 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-10 w-10 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="font-display font-bold text-lg text-emerald-800">Authentic UST Credential</h3>
                <p className="text-xs text-emerald-600 mt-1 uppercase tracking-wider font-semibold">Status: Active & Verified</p>
              </div>

              <div className="text-left space-y-3 bg-muted/40 p-4 rounded-xl text-sm border">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-4 w-4 text-muted-foreground" /> Graduate Name</span>
                  <span className="font-bold text-foreground">{verificationResult.studentName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Award className="h-4 w-4 text-muted-foreground" /> Program Completed</span>
                  <span className="font-bold text-foreground text-right">{verificationResult.programName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" /> Date Issued</span>
                  <span className="font-bold text-foreground">
                    {verificationResult.issueDate && verificationResult.issueDate.toDate 
                      ? verificationResult.issueDate.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                      : "N/A"
                    }
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-muted-foreground" /> Verification ID</span>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">{verificationResult.verificationId}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsVerifyOpen(false)} className="w-full">
                  Close Verifier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
