import { create } from "zustand";
import { 
  type Course, 
  type Assignment, 
  type Certificate, 
  type Activity, 
  type Quiz, 
  type Grade, 
  type Attendance, 
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
  updateDoc 
} from "firebase/firestore";
import { 
  db, storage 
} from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  enrollmentsCollection, 
  programsCollection, 
  assignmentsCollection, 
  certificatesCollection, 
  activitiesCollection, 
  announcementsCollection,
  eventsCollection,
  usersCollection
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
  grades: [],
  attendance: [],
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
    const userId = get().user.id;
    const storageRef = ref(storage, `submissions/${userId}/${id}/${file.name}`);
    
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await updateDoc(doc(assignmentsCollection, id), {
        status: "submitted",
        submissionUrl: url,
        updatedAt: new Date() // Assignment schema might need updatedAt but we'll stick to status/url
      } as any);
      
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
        .map((a) => ({
          ...a,
          course: idToTitle[a.resolvedProgramId] || a.courseName || a.programName || a.course || "",
          status: a.status || "pending",
          dueDate: (a.dueDate as any)?.toDate?.().toISOString?.() || a.dueDate,
        }));

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

    const recomputeAll = () => { recomputeAssignments(); recomputeCourses(); };

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
      enrolledProgramIds = snap.docs.map((d) => (d.data() as any).programId).filter(Boolean);
      recomputeAll();
    }));

    // 4. Sync ALL Assignments — filtered client-side by program membership
    unsubs.push(onSnapshot(assignmentsCollection, (snap) => {
      allAssignments = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      recomputeAssignments();
    }));

    // 4. Sync Activities
    unsubs.push(onSnapshot(query(activitiesCollection, where("userId", "==", userId)), (snap) => {
      set({ activity: snap.docs.map(d => ({ ...d.data(), id: d.id } as any)) });
    }));

    // 5. Sync Announcements (Global)
    unsubs.push(onSnapshot(announcementsCollection, (snap) => {
      set({ announcements: snap.docs.map(d => ({ ...d.data(), id: d.id } as any)) });
    }));

    // 6. Sync Events
    unsubs.push(onSnapshot(eventsCollection, (snap) => {
      set({ events: snap.docs.map(d => ({ ...d.data(), id: d.id } as any)) });
    }));

    return () => unsubs.forEach(unsub => unsub());
  }
}));
