import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { onSnapshot, query, orderBy, updateDoc, doc, Timestamp, addDoc, getDocs, where, setDoc } from "firebase/firestore";
import { 
  transactionsCollection, 
  enrollmentsCollection,
  pendingEnrollmentsCollection,
  usersCollection,
  studentsCollection 
} from "@/lib/db/collections";
import { Transaction, Enrollment, PendingEnrollment } from "@/lib/db/schema";
import { secondaryAuth, secondaryDb } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminStore } from "@/stores/admin-store";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinance,
});

function AdminFinance() {
  const { fees, scholarships } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [realPayments, setRealPayments] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PendingEnrollment[]>([]);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  useEffect(() => {
    const unsubPending = onSnapshot(pendingEnrollmentsCollection, (snap) => {
      const pending = snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingEnrollment));
      setPendingTransfers(pending);
    });

    return () => {
      unsubPending();
    };
  }, []);

  const handleApproveTransfer = async (pending: PendingEnrollment) => {
    if (!pending.id) return;
    setIsApproving(pending.id);
    const tid = toast.loading(`Approving transfer for ${pending.fullName}...`);

    try {
      // 1. Generate temp password and matric number
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const matricNo = `USTO/2026/CS/${randomSuffix}`;
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const pass = Array.from({length: 8}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      const tempPassword = `USTO-${pass.slice(0,4)}-${pass.slice(4)}`;
      const receiptNo = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

      // 2. Create Auth user
      const authResult = await createUserWithEmailAndPassword(secondaryAuth, pending.email, tempPassword);
      const uid = authResult.user.uid;

      // 3. Create user profile in Firestore
      const userProfile = {
        id: uid,
        email: pending.email,
        displayName: pending.fullName,
        role: "student",
        status: "Active",
        age: pending.age,
        gender: pending.gender,
        interestedCourse: pending.programName,
        phoneNumber: pending.phoneNumber,
        nextOfKin: pending.nextOfKin,
        nextOfKinPhoneNumber: pending.nextOfKinPhone,
        address: pending.address,
        matricNo: matricNo,
        portalPassword: tempPassword,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(usersCollection, uid), userProfile);
      await setDoc(doc(studentsCollection, uid), userProfile);

      // 4. Create enrollment record
      await setDoc(doc(enrollmentsCollection, uid), {
        studentId: uid,
        studentName: pending.fullName,
        studentEmail: pending.email,
        programId: pending.programId,
        programName: pending.programName,
        status: "active",
        progress: 0,
        createdAt: Timestamp.now()
      });

      // 5. Update transaction record
      // We must find the pending transaction using receiptUrl or studentName
      const txQuery = query(transactionsCollection, where("receiptUrl", "==", pending.receiptUrl));
      const txSnap = await getDocs(txQuery);
      if (!txSnap.empty) {
        const txDoc = txSnap.docs[0];
        await updateDoc(doc(transactionsCollection, txDoc.id), {
          status: "completed",
          userId: uid,
          receiptNo: receiptNo
        });
      }

      // 6. Mark pending transfer as approved
      await updateDoc(doc(pendingEnrollmentsCollection, pending.id), {
        status: "approved",
        updatedAt: Timestamp.now()
      });

      toast.success(`Credentials created! Student Reg. No: ${matricNo}, Pass: ${tempPassword}`, { id: tid });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to approve transfer.", { id: tid });
    } finally {
      setIsApproving(null);
    }
  };

  useEffect(() => {
    const unsubEnroll = onSnapshot(enrollmentsCollection, (enrollSnap) => {
      const enrolls = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      
      const q = query(transactionsCollection, orderBy("createdAt", "desc"));
      const unsubTxn = onSnapshot(q, (txnSnap) => {
        const txns = txnSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        
        const mapped = txns.map(txn => {
          const enroll = enrolls.find(e => e.studentId === txn.userId);
          return {
            id: txn.id,
            studentName: enroll?.studentName || "Unknown Student",
            programName: enroll?.programName || "Unknown Program",
            amount: txn.amount,
            method: txn.type === "payment" ? "paystack" : "system",
            status: txn.status,
            date: txn.createdAt?.toDate ? (txn.createdAt as any).toDate().toLocaleDateString() : "N/A"
          };
        });
        setRealPayments(mapped);
      });
      return () => unsubTxn();
    });

    return () => unsubEnroll();
  }, []);

  const totalRevenue = realPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingRevenue = realPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = realPayments.filter(p => 
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.programName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground">Track revenue, manage fee structures, and handle scholarships.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Payment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{pendingRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">12 transactions pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scholarships Granted</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scholarships.length}</div>
            <p className="text-xs text-muted-foreground">₦1.2M in total waivers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="pending">Pending Transfers
            {pendingTransfers.filter(p => p.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 rounded-full">
                {pendingTransfers.filter(p => p.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search payments..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                    <TableCell className="font-medium">{payment.studentName}</TableCell>
                    <TableCell>{payment.programName}</TableCell>
                    <TableCell>₦{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          payment.status === 'completed' ? 'default' : 
                          payment.status === 'pending' ? 'secondary' : 'destructive'
                        }
                        className="flex w-fit items-center gap-1"
                      >
                        {payment.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                        {payment.status === 'pending' && <Clock className="h-3 w-3" />}
                        {payment.status === 'refunded' && <AlertCircle className="h-3 w-3" />}
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.date}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Invoice</DropdownMenuItem>
                          <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Refund Payment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      No pending transfers found.
                    </TableCell>
                  </TableRow>
                )}
                {pendingTransfers.map((pending) => (
                  <TableRow key={pending.id}>
                    <TableCell>
                      <div className="font-medium">{pending.fullName}</div>
                      <div className="text-xs text-muted-foreground">{pending.email}</div>
                    </TableCell>
                    <TableCell>{pending.programName}</TableCell>
                    <TableCell>₦{pending.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {pending.receiptUrl ? (
                        <a href={pending.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center text-sm font-medium">
                          <AlertCircle className="w-4 h-4 mr-1" /> View Receipt
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No Receipt</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pending.createdAt?.toDate ? (pending.createdAt as any).toDate().toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pending.status === 'approved' ? 'default' : pending.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {pending.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pending.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            disabled={isApproving === pending.id}
                            onClick={() => handleApproveTransfer(pending)}
                          >
                            {isApproving === pending.id ? "Approving..." : "Approve & Provision"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fees.map(f => (
                <Card key={f.id}>
                   <CardHeader>
                      <CardTitle className="text-base">{f.programName}</CardTitle>
                      <CardDescription>Fee breakdown per cohort</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Tuition Fee</span>
                         <span className="font-bold">₦{f.tuitionFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Registration</span>
                         <span className="font-bold">₦{f.registrationFee.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t flex justify-between">
                         <span className="font-semibold">Total</span>
                         <span className="text-lg font-bold text-primary">₦{(f.tuitionFee + f.registrationFee).toLocaleString()}</span>
                      </div>
                   </CardContent>
                   <CardFooter>
                      <Button variant="outline" className="w-full">Edit Fee Structure</Button>
                   </CardFooter>
                </Card>
              ))}
              <Card className="border-dashed flex flex-col items-center justify-center p-6 text-center">
                 <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                 </div>
                 <h3 className="font-bold text-sm">Add New Program Fee</h3>
                 <p className="text-xs text-muted-foreground mt-1">Define fees for a new educational offering.</p>
                 <Button variant="ghost" className="mt-4 text-xs">Configure now</Button>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="scholarships" className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Active Scholarships</h2>
              <Button size="sm">
                 <Plus className="mr-2 h-4 w-4" /> Grant Waiver
              </Button>
           </div>
           <div className="rounded-md border bg-card">
              <Table>
                 <TableHeader>
                    <TableRow>
                       <TableHead>Student</TableHead>
                       <TableHead>Program</TableHead>
                       <TableHead>Type</TableHead>
                       <TableHead>Discount %</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {scholarships.map(s => (
                      <TableRow key={s.id}>
                         <TableCell className="font-medium">{s.studentName}</TableCell>
                         <TableCell>{s.programName}</TableCell>
                         <TableCell className="capitalize">{s.type}</TableCell>
                         <TableCell>
                            <span className="font-bold text-primary">{s.percentage}%</span>
                         </TableCell>
                         <TableCell>
                            <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                               {s.status}
                            </Badge>
                         </TableCell>
                         <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Revoke</Button>
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
