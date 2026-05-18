import { create } from "zustand";
import { 
  type Course, 
  type Assignment, 
  type Certificate, 
  type Activity, 
  type Quiz, 
  type Grade,
  type Attendance,
  type AttendanceHistory,
  type Invoice, 
  type ForumPost, 
  type Event, 
  type Announcement 
} from "@/lib/dashboard-data";
import { 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import {
  db,
} from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { 
  enrollmentsCollection, 
  programsCollection, 
  assignmentsCollection, 
  certificatesCollection, 
  activitiesCollection, 
  announcementsCollection,
  eventsCollection,
  usersCollection,
  submissionsCollection,
  attendanceCollection,
  timetableCollection,
  forumPostsCollection,
} from "@/lib/db/collections";
import { User as DbUser } from "@/lib/db/schema";

type User = DbUser;

type DashboardState = {
  courses: Course[];
  assignments: Assignment[];
  certificates: Certificate[];
  activity: Activity[];
  user: User;
  quizzes: Quiz[];
  grades: Grade[];
  attendance: Attendance[];
  attendanceHistory: AttendanceHistory[];
  invoices: Invoice[];
  forumPosts: ForumPost[];
  events: Event[];
  announcements: Announcement[];
  loading: boolean;
  toggleLesson: (courseId: string, lessonId: string) => void;
  submitAssignment: (id: string, file: File) => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  payInvoice: (id: string) => void;
  enrollCourse: (id: string) => void;
  initialize: (userId: string) => () => void;
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  courses: [],
  assignments: [],
  certificates: [],
  activity: [],
  user: {} as any,
  quizzes: [],
  timetable: [],
  grades: [],
  attendance: [],
  attendanceHistory: [],
  invoices: [],
  forumPosts: [],
  events: [],
  announcements: [],
  loading: true,
  toggleLesson: (courseId, lessonId) =>
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id !== courseId) return c;
        const lessons = c.lessons.map((l) =>
          l.id === lessonId ? { ...l, completed: !l.completed } : l,
        );
        const completedLessons = lessons.filter((l) => l.completed).length;
        const progress = Math.round((completedLessons / lessons.length) * 100);
        return { ...c, lessons, completedLessons, progress };
      }),
    })),
  submitAssignment: async (id, file) => {
    const user = get().user as any;
    const userId = user.id;
    const assignment = (get().assignments as any[]).find((a) => a.id === id);

    try {
      const url = await uploadToCloudinary(file, { folder: `submissions/${userId}/${id}` });

      // Create a submission record so the instructor can see/grade it
      await addDoc(submissionsCollection, {
        assignmentId: id,
        studentId: userId,
        studentName: user.displayName || user.email || "Student",
        studentEmail: user.email || "",
        instructorId: assignment?.instructorId || "",
        fileUrl: url,
        fileName: file.name,
        status: "pending",
        submittedAt: Timestamp.now(),
      } as any);

      // Mark this student's view of the assignment as submitted (local)
      set((state) => ({
        assignments: state.assignments.map((a: any) =>
          a.id === id ? { ...a, status: "submitted", submissionUrl: url } : a,
        ),
      }));
    } catch (error) {
      console.error("Assignment submission failed:", error);
      throw error;
    }
  },
  updateUser: (patch) => set((state) => ({ user: { ...state.user, ...patch } })),
  payInvoice: (id) =>
    set((state) => ({
      invoices: state.invoices.map((i) =>
        i.id === id ? { ...i, status: "paid" as const } : i,
      ),
    })),
  enrollCourse: (_id) => {
    // Implement real enrollment logic here
  },
  initialize: (userId) => {
    set({ loading: true });

    const unsubs: (() => void)[] = [];

    // Track program ids the student is associated with (via enrollment or interestedCourse)
    let userProfile: any = {};
    let allPrograms: any[] = [];
    let enrolledProgramIds: string[] = [];
    let allAssignments: any[] = [];
    let allSubmissions: any[] = [];
    let allAttendance: any[] = [];
    let allTimetable: any[] = [];
    let enrolledDocs: any[] = [];
    let dbCertificates: any[] = [];

    const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

    const getInterestedProgramId = (titleToId: Record<string, string>) => {
      const interestedCourseId = String(userProfile.interestedCourseId || "");
      if (interestedCourseId && allPrograms.some((p) => p.id === interestedCourseId)) return interestedCourseId;

      const interestedCourse = String(userProfile.interestedCourse || "");
      if (interestedCourse && allPrograms.some((p) => p.id === interestedCourse)) return interestedCourse;

      return titleToId[normalize(interestedCourse)];
    };

    const getAssignmentProgramId = (assignment: any, titleToId: Record<string, string>) => {
      const directId = assignment.programId || assignment.courseId;
      if (directId && allPrograms.some((p) => p.id === directId)) return directId;

      return titleToId[normalize(assignment.programName || assignment.courseName || assignment.course)];
    };

    const recomputeAssignments = () => {
      const titleToId: Record<string, string> = {};
      allPrograms.forEach((p) => { titleToId[normalize(p.title)] = p.id; });
      const idToTitle: Record<string, string> = {};
      allPrograms.forEach((p) => { idToTitle[p.id] = p.title; });

      const interestedId = getInterestedProgramId(titleToId);

      const programIds = new Set<string>([...enrolledProgramIds, ...(interestedId ? [interestedId] : [])]);

      const visible = allAssignments
        .map((a) => ({ ...a, resolvedProgramId: getAssignmentProgramId(a, titleToId) }))
        .filter((a) => a.resolvedProgramId && programIds.has(a.resolvedProgramId))
        .map((a) => {
          const submission = allSubmissions.find(sub => sub.assignmentId === a.id);
          return {
            ...a,
            course: idToTitle[a.resolvedProgramId] || a.courseName || a.programName || a.course || "",
            status: submission?.status || a.status || "pending",
            grade: submission?.grade || a.grade,
            feedback: submission?.feedback || a.feedback,
            dueDate: (a.dueDate as any)?.toDate?.().toISOString?.() || a.dueDate,
          };
        });

      set({ assignments: visible as any, loading: false });
    };

    const recomputeCourses = () => {
      const titleToId: Record<string, string> = {};
      allPrograms.forEach((p) => { titleToId[normalize(p.title)] = p.id; });
      const interestedId = getInterestedProgramId(titleToId);
      const programIds = new Set<string>([...enrolledProgramIds, ...(interestedId ? [interestedId] : [])]);

      const courses = allPrograms
        .filter((p) => programIds.has(p.id))
        .map((p) => ({
          id: p.id,
          title: p.title || "Untitled",
          instructor: p.instructor || p.instructorName || "TBA",
          instructorId: p.instructorId || "",
          category: p.category || p.type || "Course",
          thumbnail: p.thumbnail || p.image
            ? `url(${p.thumbnail || p.image})`
            : "linear-gradient(135deg, hsl(var(--primary)/0.6), hsl(var(--primary)/0.2))",
          progress: typeof p.progress === "number" ? p.progress : 0,
          totalLessons: p.totalLessons || (p.lessons?.length ?? 0),
          completedLessons: p.completedLessons || 0,
          duration: p.duration || "—",
          lessons: p.lessons || [],
        }));

      set({ courses: courses as any });
    };

    const recomputeAttendance = () => {
      const titleToId: Record<string, string> = {};
      allPrograms.forEach((p) => { titleToId[normalize(p.title)] = p.id; });
      const idToTitle: Record<string, string> = {};
      allPrograms.forEach((p) => { idToTitle[p.id] = p.title; });

      const interestedId = getInterestedProgramId(titleToId);
      const studentProgramIds = new Set<string>([...enrolledProgramIds, ...(interestedId ? [interestedId] : [])]);

      const attendanceByProgram: Record<string, { attended: number, total: number }> = {};
      
      studentProgramIds.forEach(pid => {
        const pastClasses = allTimetable.filter(t => 
          t.programId === pid && (t.attendanceSubmitted === true || t.status === 'completed')
        );
        const totalClasses = pastClasses.length;
        attendanceByProgram[pid] = { attended: 0, total: totalClasses };
      });

      allAttendance.forEach(a => {
        if (a.status === 'present' && attendanceByProgram[a.programId]) {
          attendanceByProgram[a.programId].attended++;
        }
      });

      const attendanceSummary = Object.entries(attendanceByProgram).map(([pid, data]) => ({
        id: pid,
        course: idToTitle[pid] || "Unknown Course",
        totalClasses: data.total,
        attendedClasses: data.attended
      }));

      const history: AttendanceHistory[] = allTimetable
        .filter(s => studentProgramIds.has(s.programId))
        .map(session => {
          const record = allAttendance.find(a => a.sessionId === session.id);
          return {
            id: session.id,
            courseId: session.programId,
            courseName: idToTitle[session.programId] || "Unknown Course",
            sessionTitle: session.title,
            date: session.date,
            status: record?.status || 'pending'
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const studentSchedule = allTimetable
        .filter(s => studentProgramIds.has(s.programId) && s.status !== 'completed' && !s.attendanceSubmitted)
        .map(s => ({
          id: s.id,
          title: s.title || "Untitled Session",
          courseId: s.programId,
          courseName: idToTitle[s.programId] || "Unknown Course",
          date: s.date || "TBD",
          time: s.startTime ? `${s.startTime}${s.endTime ? ` - ${s.endTime}` : ''}` : "TBD",
          room: s.location || (s.type === 'virtual' ? 'Online' : 'TBD'),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      set({ 
        attendance: attendanceSummary as any,
        attendanceHistory: history as any,
        timetable: studentSchedule as any
      });
    };

    const recomputeGrades = () => {
      const idToTitle: Record<string, string> = {};
      allPrograms.forEach((p) => { idToTitle[p.id] = p.title; });

      const gradesList = enrolledDocs.map((e) => {
        const courseTitle = idToTitle[e.programId] || "Unknown Course";
        const progress = e.progress || 0;
        const gradeLetter = (e.grade || (progress >= 85 ? "A" : progress >= 70 ? "B" : progress >= 50 ? "C" : progress >= 40 ? "D" : "F")) as any;
        
        return {
          id: e.id,
          course: courseTitle,
          score: progress,
          grade: gradeLetter,
          credits: 3
        };
      });

      set({ grades: gradesList });
    };

    const recomputeCertificates = () => {
      const idToTitle: Record<string, string> = {};
      allPrograms.forEach((p) => { idToTitle[p.id] = p.title; });

      const certList = dbCertificates.map((c) => ({
        id: c.id,
        course: c.programName || idToTitle[c.programId] || "Completed Program",
        issuedAt: c.issueDate?.toDate?.().toISOString() || new Date().toISOString(),
        credentialId: c.verificationId || `USTO-CERT-${c.id.substring(0, 6).toUpperCase()}`
      }));

      enrolledDocs.forEach(e => {
        if ((e.progress === 100 || e.status === 'completed') && !certList.some(c => c.id === e.id || c.id === `synth-${e.id}`)) {
          const courseTitle = idToTitle[e.programId] || "Completed Program";
          certList.push({
            id: `synth-${e.id}`,
            course: courseTitle,
            issuedAt: e.updatedAt?.toDate?.().toISOString() || e.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            credentialId: `USTO-AUTO-${e.id.substring(0, 6).toUpperCase()}`
          });
        }
      });

      set({ certificates: certList });
    };

    const recomputeAll = () => { 
      recomputeAssignments(); 
      recomputeCourses(); 
      recomputeAttendance(); 
      recomputeGrades();
      recomputeCertificates();
      syncForum();
    };

    // 1. Sync User Profile
    unsubs.push(onSnapshot(doc(usersCollection, userId), (snap) => {
      if (snap.exists()) {
        userProfile = snap.data();
        set({ user: userProfile as any });
        recomputeAll();
      }
    }));

    // 2. Sync all programs (so we can map title <-> id)
    unsubs.push(onSnapshot(programsCollection, (snap) => {
      allPrograms = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      recomputeAll();
    }));

    // 3. Sync Enrollments
    unsubs.push(onSnapshot(query(enrollmentsCollection, where("studentId", "==", userId)), (snap) => {
      enrolledDocs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      enrolledProgramIds = enrolledDocs.map((d) => d.programId).filter(Boolean);
      recomputeAll();
    }));

    // 4. Sync ALL Assignments — filtered client-side by program membership
    unsubs.push(onSnapshot(assignmentsCollection, (snap) => {
      allAssignments = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      recomputeAssignments();
    }));

    // 4.5. Sync Submissions for the student
    unsubs.push(onSnapshot(query(submissionsCollection, where("studentId", "==", userId)), (snap) => {
      allSubmissions = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      recomputeAssignments();
    }));

    // 4. Sync Activities
    unsubs.push(onSnapshot(query(activitiesCollection, where("userId", "==", userId)), (snap) => {
      set({ activity: snap.docs.map(d => ({ ...d.data(), id: d.id } as any)) });
    }));

    // 5. Sync Announcements (Global)
    unsubs.push(onSnapshot(announcementsCollection, (snap) => {
      const allAnns = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
      const studentAnns = allAnns
        .filter(a => !a.targetRole || a.targetRole === 'all' || a.targetRole === 'student')
        .sort((a, b) => {
          const dateA = a.date?.seconds || 0;
          const dateB = b.date?.seconds || 0;
          return dateB - dateA;
        });
      set({ announcements: studentAnns });
    }));

    // 6. Sync Events
    unsubs.push(onSnapshot(eventsCollection, (snap) => {
      set({ events: snap.docs.map(d => ({ ...d.data(), id: d.id } as any)) });
    }));

    // 7. Sync Attendance for this student
    unsubs.push(onSnapshot(query(attendanceCollection, where("studentId", "==", userId)), (snap) => {
      allAttendance = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      recomputeAttendance();
    }));

    // 8. Sync Timetable (to count total classes)
    unsubs.push(onSnapshot(timetableCollection, (snap) => {
      allTimetable = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      recomputeAttendance();
    }));

    // 10. Sync Certificates
    unsubs.push(onSnapshot(query(certificatesCollection, where("studentId", "==", userId)), (snap) => {
      dbCertificates = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      recomputeCertificates();
    }));

    // 9. Sync Forum Posts for student's programs
    let forumUnsub: (() => void) | null = null;
    function syncForum() {
      if (forumUnsub) forumUnsub();
      
      const titleToId: Record<string, string> = {};
      allPrograms.forEach((p) => { titleToId[normalize(p.title)] = p.id; });
      const interestedId = getInterestedProgramId(titleToId);
      const pids = Array.from(new Set([...enrolledProgramIds, ...(interestedId ? [interestedId] : [])])).filter(Boolean);
      
      if (pids.length === 0) {
        set({ forumPosts: [] });
        return;
      }
      
      const chunks: string[][] = [];
      for (let i = 0; i < pids.length; i += 10) chunks.push(pids.slice(i, i + 10));
      
      const subs = chunks.map(chunk => 
        onSnapshot(query(forumPostsCollection, where("courseId", "in", chunk)), (snap) => {
          set({
            forumPosts: snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                author: data.authorName || "User",
                title: data.title || "Untitled",
                category: data.courseName || "General",
                replies: 0,
                lastActive: data.createdAt?.toDate?.().toLocaleDateString() || "Recent"
              } as any;
            })
          });
        })
      );
      forumUnsub = () => subs.forEach(s => s());
    }

    return () => {
      unsubs.forEach(unsub => unsub());
      if (forumUnsub) forumUnsub();
    };
  }
}));
