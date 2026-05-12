import { createFileRoute } from "@tanstack/react-router";
import { 
  Plus, 
  BookOpen, 
  Users, 
  Clock, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  CalendarDays,
  Loader2,
  Upload,
  ExternalLink,
  DollarSign,
  Briefcase,
  Monitor,
  UserCheck,
  Baby
} from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usersCollection, programsCollection } from "@/lib/db/collections";
import { onSnapshot, query, orderBy, where, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Program, User } from "@/lib/db/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useAdminStore } from "@/stores/admin-store";

export const Route = createFileRoute("/admin/programs")({
  component: AdminPrograms,
});

function AdminPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Software Development",
    durationWeeks: 12,
    duration: "12 Weeks",
    level: "Beginner" as any,
    instructorId: "",
    pricing: {
      groupClass: 0,
      executiveClass: 0,
      privateClass: 0,
      onlineClass: 0,
      childrenClass: 0,
    }
  });

  const { cohorts } = useAdminStore();

  const [curriculumProgram, setCurriculumProgram] = useState<Program | null>(null);
  const [curriculumDraft, setCurriculumDraft] = useState<{ term: string; courses: string[] }[]>([]);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  const openCurriculumEditor = (program: Program) => {
    setCurriculumProgram(program);
    setCurriculumDraft(
      Array.isArray(program.curriculum) && program.curriculum.length > 0
        ? program.curriculum.map((t) => ({ term: t.term, courses: [...(t.courses || [])] }))
        : []
    );
  };

  const saveCurriculum = async () => {
    if (!curriculumProgram?.id) return;
    setSavingCurriculum(true);
    try {
      const cleaned = curriculumDraft
        .map((t) => ({ term: t.term.trim(), courses: t.courses.map((c) => c.trim()).filter(Boolean) }))
        .filter((t) => t.term.length > 0);
      await updateDoc(doc(programsCollection, curriculumProgram.id), {
        curriculum: cleaned,
        updatedAt: Timestamp.now(),
      });
      toast.success("Curriculum saved");
      setCurriculumProgram(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save curriculum");
    } finally {
      setSavingCurriculum(false);
    }
  };


  useEffect(() => {
    // Sync programs
    const q = query(programsCollection, orderBy("createdAt", "desc"));
    const unsubPrograms = onSnapshot(q, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Program)));
      setLoading(false);
    });

    // Sync instructors
    const instQ = query(usersCollection, where("role", "==", "instructor"));
    const unsubInst = onSnapshot(instQ, (snapshot) => {
      setInstructors(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    });

    return () => {
      unsubPrograms();
      unsubInst();
    };
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedInst = instructors.find(i => i.id === formData.instructorId);
      const newProgram: Omit<Program, "id"> = {
        title: formData.title,
        slug: formData.title.toLowerCase().replace(/ /g, "-"),
        description: formData.description,
        category: formData.category,
        duration: formData.duration,
        durationWeeks: Number(formData.durationWeeks),
        level: formData.level,
        instructorId: formData.instructorId,
        instructorName: selectedInst?.displayName || "Unassigned",
        isFeatured: false,
        curriculum: [],
        status: "published",
        pricing: {
          groupClass: Number(formData.pricing.groupClass),
          executiveClass: Number(formData.pricing.executiveClass),
          privateClass: Number(formData.pricing.privateClass),
          onlineClass: Number(formData.pricing.onlineClass),
          childrenClass: Number(formData.pricing.childrenClass),
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(programsCollection, newProgram);
      toast.success("Course created successfully!");
      setIsCreateModalOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "Software Development",
        durationWeeks: 12,
        duration: "12 Weeks",
        level: "Beginner" as any,
        instructorId: "",
        pricing: {
          groupClass: 0,
          executiveClass: 0,
          privateClass: 0,
          onlineClass: 0,
          childrenClass: 0,
        }
      });
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const seedPrograms = async () => {
    const confirm = window.confirm("This will seed programs from the catalog images. Continue?");
    if (!confirm) return;

    setIsSubmitting(true);
    const catalogData = [
      {
        title: "Full Stack Web Development",
        category: "Software Development",
        duration: "24 Weeks",
        durationWeeks: 24,
        pricing: { groupClass: 360000, executiveClass: 460000, privateClass: 1080000, onlineClass: 288000, childrenClass: 252000 }
      },
      {
        title: "Front End Web Development",
        category: "Software Development",
        duration: "12 Weeks",
        durationWeeks: 12,
        pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
      },
      {
        title: "Computer Repairs and Maintenance",
        category: "Hard Tech",
        duration: "12 Weeks",
        durationWeeks: 12,
        pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
      },
      {
        title: "Graphic Design",
        category: "Design & Marketing",
        duration: "12 Weeks",
        durationWeeks: 12,
        pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
      },
      {
        title: "Product Design (UI/UX)",
        category: "Design & Marketing",
        duration: "12 Weeks",
        durationWeeks: 12,
        pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
      },
      {
        title: "Data Science",
        category: "Data Management",
        duration: "12 Weeks",
        durationWeeks: 12,
        pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
      },
      {
        title: "AutoCAD",
        category: "Computer Aided Design",
        duration: "8 Weeks",
        durationWeeks: 8,
        pricing: { groupClass: 120000, executiveClass: 220000, privateClass: 360000, onlineClass: 96000, childrenClass: 84000 }
      },
      {
        title: "Computer Basics",
        category: "Computer Fundamentals",
        duration: "6 Weeks",
        durationWeeks: 6,
        pricing: { groupClass: 90000, executiveClass: 190000, privateClass: 270000, onlineClass: 72000, childrenClass: 63000 }
      }
    ];

    try {
      for (const item of catalogData) {
        const newProgram: Omit<Program, "id"> = {
          ...item,
          slug: item.title.toLowerCase().replace(/ /g, "-"),
          description: `Comprehensive course on ${item.title}.`,
          level: "Beginner",
          instructorId: "",
          instructorName: "Unassigned",
          isFeatured: false,
          curriculum: [],
          status: "published",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(programsCollection, newProgram);
      }
      toast.success("Successfully seeded programs!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to seed programs");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Program Management</h1>
          <p className="text-muted-foreground">
            Build curricula, manage cohorts, and generate timetables.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={seedPrograms} disabled={isSubmitting}>
               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
               Bulk Seed from Image
            </Button>
            <Button variant="outline">
               <Layers className="mr-2 h-4 w-4" /> Categories
            </Button>
           <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                 <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Course
                 </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                 <DialogHeader>
                    <DialogTitle>Create New Course</DialogTitle>
                 </DialogHeader>
                 <form onSubmit={handleCreateCourse} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label>Course Title</Label>
                          <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. React Mastery" />
                       </div>
                       <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={(val: any) => setFormData({...formData, category: val})}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="Software Development">Software Development</SelectItem>
                                <SelectItem value="Hard Tech">Hard Tech</SelectItem>
                                <SelectItem value="Design & Marketing">Design & Marketing</SelectItem>
                                <SelectItem value="Data Management">Data Management</SelectItem>
                                <SelectItem value="Computer Aided Design">Computer Aided Design</SelectItem>
                                <SelectItem value="Computer Fundamentals">Computer Fundamentals</SelectItem>
                                <SelectItem value="Kids Package">Kids Package</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label>Description</Label>
                       <textarea 
                          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={formData.description}
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          placeholder="Brief overview of the course..."
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label>Duration (Weeks)</Label>
                          <Input type="number" value={formData.durationWeeks} onChange={e => setFormData({...formData, durationWeeks: Number(e.target.value), duration: `${e.target.value} Weeks`})} />
                       </div>
                       <div className="space-y-2">
                          <Label>Level</Label>
                          <Select value={formData.level} onValueChange={(val: any) => setFormData({...formData, level: val})}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                     <div className="space-y-4 border-t pt-4">
                        <h3 className="text-sm font-medium">Pricing Tiers (₦)</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label>Group Class</Label>
                              <Input type="number" value={formData.pricing.groupClass} onChange={e => setFormData({...formData, pricing: {...formData.pricing, groupClass: Number(e.target.value)}})} />
                           </div>
                           <div className="space-y-2">
                              <Label>Executive Class</Label>
                              <Input type="number" value={formData.pricing.executiveClass} onChange={e => setFormData({...formData, pricing: {...formData.pricing, executiveClass: Number(e.target.value)}})} />
                           </div>
                           <div className="space-y-2">
                              <Label>Private Class</Label>
                              <Input type="number" value={formData.pricing.privateClass} onChange={e => setFormData({...formData, pricing: {...formData.pricing, privateClass: Number(e.target.value)}})} />
                           </div>
                           <div className="space-y-2">
                              <Label>Online Class</Label>
                              <Input type="number" value={formData.pricing.onlineClass} onChange={e => setFormData({...formData, pricing: {...formData.pricing, onlineClass: Number(e.target.value)}})} />
                           </div>
                           <div className="space-y-2">
                              <Label>Children Class</Label>
                              <Input type="number" value={formData.pricing.childrenClass} onChange={e => setFormData({...formData, pricing: {...formData.pricing, childrenClass: Number(e.target.value)}})} />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <Label>Assign Instructor</Label>
                        <Select value={formData.instructorId} onValueChange={val => setFormData({...formData, instructorId: val})}>
                           <SelectTrigger><SelectValue placeholder="Select an instructor" /></SelectTrigger>
                           <SelectContent>
                              {instructors.map((inst: any) => (
                                 <SelectItem key={inst.id} value={inst.id}>{inst.displayName}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                    <div className="flex justify-end pt-4">
                       <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isSubmitting ? "Creating..." : "Create Course"}
                       </Button>
                    </div>
                 </form>
              </DialogContent>
           </Dialog>
        </div>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses">Course Builder</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="timetable">Timetable Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
               <Loader2 className="h-8 w-8 animate-spin mb-2" />
               <p>Loading programs...</p>
            </div>
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-muted/20">
               <BookOpen className="h-12 w-12 text-muted/30 mb-4" />
               <p className="text-lg font-medium text-muted-foreground">No programs found</p>
               <Button variant="link" className="mt-2">Create your first course</Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {programs.map((program: Program) => (
                <Card key={program.id} className="flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <Badge variant="default">
                        {program.category}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Course</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="line-clamp-1">{program.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center"><BookOpen className="mr-2 h-4 w-4" /><span>{program.category}</span></div>
                      <div className="flex items-center"><Clock className="mr-2 h-4 w-4" /><span>{program.duration} ({program.durationWeeks} weeks)</span></div>
                      <div className="flex items-center"><Users className="mr-2 h-4 w-4" /><span>{program.instructorName || "No Instructor"}</span></div>
                      <div className="flex items-center"><Badge variant="secondary" className="text-[10px]">{program.level}</Badge></div>
                      
                      {program.pricing && (
                        <div className="pt-2 grid grid-cols-2 gap-1 text-[10px] border-t border-muted">
                          <div className="flex items-center gap-1"><Users className="h-3 w-3" /> Group: ₦{program.pricing.groupClass?.toLocaleString()}</div>
                          <div className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Exec: ₦{program.pricing.executiveClass?.toLocaleString()}</div>
                          <div className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> Private: ₦{program.pricing.privateClass?.toLocaleString()}</div>
                          <div className="flex items-center gap-1"><Monitor className="h-3 w-3" /> Online: ₦{program.pricing.onlineClass?.toLocaleString()}</div>
                          {program.pricing.childrenClass && (
                             <div className="flex items-center gap-1"><Baby className="h-3 w-3" /> Kids: ₦{program.pricing.childrenClass?.toLocaleString()}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex flex-col gap-2">
                    <Button variant="outline" className="w-full" onClick={() => openCurriculumEditor(program)}>Edit Curriculum</Button>
                    <div className="flex w-full gap-2">
                       <Button 
                         variant="secondary" 
                         size="sm" 
                         className="flex-1 text-[10px]"
                         onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.onchange = async (e: any) => {
                               const file = e.target.files?.[0];
                               if (!file) return;
                                const tid = toast.loading("Uploading materials...");
                                try {
                                   const url = await uploadToCloudinary(file, { folder: `materials/${program.id}` });
                                   await updateDoc(doc(programsCollection, program.id!), { materialsUrl: url });
                                   toast.success("Materials uploaded!", { id: tid });
                               } catch (err) {
                                  toast.error("Upload failed", { id: tid });
                               }
                            };
                            input.click();
                         }}
                       >
                          <Upload className="mr-1 h-3 w-3" /> Materials
                       </Button>
                       {program.materialsUrl && (
                          <Button variant="ghost" size="sm" className="px-2" onClick={() => window.open(program.materialsUrl, '_blank')}>
                             <ExternalLink className="h-3 w-3" />
                          </Button>
                       )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
           <div className="flex justify-end">
              <Button size="sm">
                 <Plus className="mr-2 h-4 w-4" /> New Cohort
              </Button>
           </div>
           <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                 <TableHeader>
                    <TableRow>
                       <TableHead>Cohort Name</TableHead>
                       <TableHead>Program</TableHead>
                       <TableHead>Duration</TableHead>
                       <TableHead>Students</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {cohorts.map(c => (
                      <TableRow key={c.id}>
                         <TableCell className="font-bold">{c.name}</TableCell>
                         <TableCell>Full-Stack Web Dev</TableCell>
                         <TableCell className="text-xs text-muted-foreground">
                            {c.startDate} to {c.endDate}
                         </TableCell>
                         <TableCell>{c.studentCount} students</TableCell>
                         <TableCell>
                            <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                               {c.status}
                            </Badge>
                         </TableCell>
                         <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Manage</Button>
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </div>
        </TabsContent>

        <TabsContent value="timetable" className="space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                 <Button variant="secondary" size="sm">Weekly View</Button>
                 <Button variant="ghost" size="sm">Daily List</Button>
              </div>
              <Button size="sm">
                 <CalendarDays className="mr-2 h-4 w-4" /> Add Slot
              </Button>
           </div>
           <Card>
              <CardContent className="p-0">
                 <div className="grid grid-cols-6 border-b divide-x">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">
                         {day}
                      </div>
                    ))}
                 </div>
                 <div className="grid grid-cols-6 divide-x min-h-[400px]">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-2 space-y-2">
                         {day === 'Mon' && (
                           <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px]">
                              <p className="font-bold text-primary">React Basics</p>
                              <p className="text-muted-foreground">09:00 - 11:00</p>
                              <p className="flex items-center gap-1 mt-1 text-muted-foreground">
                                 <MapPin className="h-2 w-2" /> Hall A
                              </p>
                           </div>
                         )}
                         {day === 'Wed' && (
                           <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                              <p className="font-bold text-emerald-600">AWS Workshop</p>
                              <p className="text-muted-foreground">14:00 - 17:00</p>
                              <p className="flex items-center gap-1 mt-1 text-muted-foreground">
                                 <MapPin className="h-2 w-2" /> Virtual
                              </p>
                           </div>
                         )}
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!curriculumProgram} onOpenChange={(o) => !o && setCurriculumProgram(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Curriculum — {curriculumProgram?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {curriculumDraft.length === 0 && (
              <p className="text-sm text-muted-foreground">No terms yet. Add one to get started.</p>
            )}
            {curriculumDraft.map((term, ti) => (
              <div key={ti} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={term.term}
                    onChange={(e) => {
                      const next = [...curriculumDraft];
                      next[ti] = { ...next[ti], term: e.target.value };
                      setCurriculumDraft(next);
                    }}
                    placeholder={`Term ${ti + 1} name (e.g. Term 1)`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurriculumDraft(curriculumDraft.filter((_, i) => i !== ti))}
                    aria-label="Remove term"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 pl-2">
                  {term.courses.map((course, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <Input
                        value={course}
                        onChange={(e) => {
                          const next = [...curriculumDraft];
                          const courses = [...next[ti].courses];
                          courses[ci] = e.target.value;
                          next[ti] = { ...next[ti], courses };
                          setCurriculumDraft(next);
                        }}
                        placeholder="Course / module title"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const next = [...curriculumDraft];
                          next[ti] = { ...next[ti], courses: next[ti].courses.filter((_, i) => i !== ci) };
                          setCurriculumDraft(next);
                        }}
                        aria-label="Remove course"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [...curriculumDraft];
                      next[ti] = { ...next[ti], courses: [...next[ti].courses, ""] };
                      setCurriculumDraft(next);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add course
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurriculumDraft([...curriculumDraft, { term: `Term ${curriculumDraft.length + 1}`, courses: [] }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add term
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setCurriculumProgram(null)} disabled={savingCurriculum}>Cancel</Button>
            <Button onClick={saveCurriculum} disabled={savingCurriculum}>
              {savingCurriculum ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Curriculum
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

