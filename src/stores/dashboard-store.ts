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

    const recomputeAssignments = () => {
      const titleToId: Record<string, string> = {};
      allPrograms.forEach((p) => { titleToId[String(p.title || "").toLowerCase()] = p.id; });
      const idToTitle: Record<string, string> = {};
      allPrograms.forEach((p) => { idToTitle[p.id] = p.title; });

      const interestedId = userProfile.interestedCourse
        ? titleToId[String(userProfile.interestedCourse).toLowerCase()]
        : undefined;

      const programIds = new Set<string>([...enrolledProgramIds, ...(interestedId ? [interestedId] : [])]);

      const visible = allAssignments
        .filter((a) => a.programId && programIds.has(a.programId))
        .map((a) => ({
          ...a,
          course: idToTitle[a.programId] || a.course || "",
          status: a.status || "pending",
          dueDate: (a.dueDate as any)?.toDate?.().toISOString?.() || a.dueDate,
        }));

      set({ assignments: visible as any, loading: false });
    };

    // 1. Sync User Profile
    unsubs.push(onSnapshot(doc(usersCollection, userId), (snap) => {
      if (snap.exists()) {
        userProfile = snap.data();
        set({ user: userProfile as any });
        recomputeAssignments();
      }
    }));

    // 2. Sync all programs (so we can map title <-> id)
    unsubs.push(onSnapshot(programsCollection, (snap) => {
      allPrograms = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      recomputeAssignments();
    }));

    // 3. Sync Enrollments
    unsubs.push(onSnapshot(query(enrollmentsCollection, where("studentId", "==", userId)), (snap) => {
      enrolledProgramIds = snap.docs.map((d) => (d.data() as any).programId).filter(Boolean);
      recomputeAssignments();
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
