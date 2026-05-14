import { create } from "zustand";
import {
  type InstructorCourse,
  type EnrolledStudent,
  type InstructorAssignment,
  type Submission,
  type ActivityItem,
  type ScheduleSession,
  type Announcement,
  type EarningRecord,
  type Credential,
} from "@/lib/instructor-data";
import { 
  onSnapshot, 
  query, 
  where, 
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { 
  programsCollection, 
  enrollmentsCollection, 
  activitiesCollection, 
  usersCollection,
  announcementsCollection,
  assignmentsCollection,
  submissionsCollection,
  timetableCollection,
} from "@/lib/db/collections";
import { User as DbUser } from "@/lib/db/schema";

type Profile = DbUser;

type InstructorState = {
  courses: InstructorCourse[];
  students: EnrolledStudent[];
  assignments: InstructorAssignment[];
  submissions: Submission[];
  activity: ActivityItem[];
  schedules: ScheduleSession[];
  announcements: Announcement[];
  earnings: EarningRecord[];
  credentials: Credential[];
  profile: Profile;
  addCourse: (course: Omit<InstructorCourse, "id" | "students" | "rating" | "revenue" | "completionRate" | "updatedAt">) => void;
  deleteCourse: (id: string) => void;
  updateCourse: (id: string, patch: Partial<InstructorCourse>) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addSchedule: (session: Omit<ScheduleSession, "id">) => Promise<void>;
  postAnnouncement: (announcement: Omit<Announcement, "id" | "date">) => Promise<void>;
  addAssignment: (assignment: Omit<InstructorAssignment, "id" | "submissions" | "graded" | "totalStudents">) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  gradeSubmission: (submissionId: string, assignmentId: string, grade: string, feedback?: string) => Promise<void>;
  markAttendance: (sessionId: string, studentId: string, status: "present" | "absent") => void;
  initialize: (instructorId: string) => () => void;
};

export const useInstructorStore = create<InstructorState>((set, get) => ({
  courses: [],
  students: [],
  assignments: [],
  submissions: [],
  activity: [],
  schedules: [],
  announcements: [],
  earnings: [],
  credentials: [],
  profile: {} as any,
  addCourse: (course) =>
    set((state) => ({
      courses: [
        {
          ...course,
          id: `ic${Date.now()}`,
          students: 0,
          rating: 0,
          revenue: 0,
          completionRate: 0,
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        ...state.courses,
      ],
    })),
  deleteCourse: (id) =>
    set((state) => ({ courses: state.courses.filter((c) => c.id !== id) })),
  updateCourse: (id, patch) =>
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
  addSchedule: async (session: any) => {
    const instructorId = get().profile.id;
    const program = get().courses.find(c => c.id === session.courseId);
    await addDoc(timetableCollection, {
      title: session.title,
      programId: session.courseId,
      programName: program?.title || "",
      instructorId,
      instructorName: get().profile.displayName || "",
      date: session.date,
      day: session.date ? new Date(session.date).toLocaleDateString("en-US", { weekday: "long" }) : "",
      startTime: session.time,
      endTime: session.time,
      type: session.type,
      location: session.location,
    } as any);
  },
  postAnnouncement: async (announcement) => {
    const instructorId = get().profile.id;
    await addDoc(announcementsCollection, {
      ...announcement,
      authorId: instructorId,
      date: Timestamp.now()
    } as any);
  },
  addAssignment: async (assignment) => {
    const instructorId = get().profile.id;
    const programId = assignment.courseId;
    await addDoc(assignmentsCollection, {
      ...assignment,
      programId,
      programName: assignment.courseName,
      instructorId,
      submissionsCount: 0,
      gradedCount: 0,
      totalStudents: 0 // In a real app, this would be the count of students in the course
    } as any);
  },
  deleteAssignment: async (id) => {
    await deleteDoc(doc(assignmentsCollection, id));
  },
  gradeSubmission: async (submissionId, assignmentId, grade, feedback) => {
    await updateDoc(doc(submissionsCollection, submissionId), {
      status: "graded",
      grade,
      feedback
    } as any);
    
    // Also increment gradedCount on the assignment
    // (In a real app, use a transaction or cloud function)
    const assignment = get().assignments.find(a => a.id === assignmentId);
    if (assignment) {
      await updateDoc(doc(assignmentsCollection, assignmentId), {
        gradedCount: (assignment.graded || 0) + 1
      } as any);
    }
  },
  markAttendance: (sessionId, studentId, status) => {
    console.log(`Marked student ${studentId} as ${status} for session ${sessionId}`);
  },
  initialize: (instructorId) => {
    const unsubs: (() => void)[] = [];

    // 1. Sync Profile
    unsubs.push(onSnapshot(doc(usersCollection, instructorId), (snap) => {
      if (snap.exists()) set({ profile: snap.data() as any });
    }));

    // Helpers to merge enrollments + submitted students. All reads must be
    // scoped to this instructor to satisfy Firestore permissions.
    let rawEnrollments: any[] = [];
    let rawSubmissions: any[] = [];
    let courseList: any[] = [];

    const recomputeStudents = () => {
      const courseIds = new Set(courseList.map((c) => c.id));

      const enrolled = rawEnrollments
        .filter((e) => e.instructorId === instructorId || (e.programId && courseIds.has(e.programId)))
        .map((data) => ({
          id: data.studentId || data.id,
          name: data.studentName || "Unknown Student",
          email: data.studentEmail || "No Email",
          courseId: data.programId || "",
          progress: data.progress || 0,
          lastActive: data.updatedAt?.toDate?.().toLocaleDateString() || data.updatedAt || "N/A",
          grade: data.grade || "",
        }));

      const enrolledStudentIds = new Set(enrolled.map((e) => e.id).filter(Boolean));
      const submitters = rawSubmissions
        .filter((s) => s.studentId && !enrolledStudentIds.has(s.studentId))
        .map((s) => ({
          id: s.studentId,
          name: s.studentName || "Student",
          email: s.studentEmail || "",
          courseId: s.programId || courseList.find((c) => c.title === s.courseName || c.title === s.programName)?.id || "",
          progress: 0,
          lastActive: s.submittedAt?.toDate?.().toLocaleDateString() || s.submittedAt || "Submitted",
          grade: s.grade || "",
        }));

      set({ students: [...enrolled, ...submitters] as any });
    };

    // 2. Sync Instructor's Courses
    unsubs.push(onSnapshot(query(programsCollection, where("instructorId", "==", instructorId)), (snap) => {
      courseList = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      set({ 
        courses: courseList.map((data: any) => ({
          ...data,
          students: data.students || 0,
          revenue: data.revenue || 0,
          completionRate: data.completionRate || 0,
          rating: data.rating || 0,
          status: data.status || "published",
          thumbnail: data.thumbnail || "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        })) as any 
      });
      recomputeStudents();
    }));

    // 3. Sync only this instructor's enrollments
    unsubs.push(onSnapshot(query(enrollmentsCollection, where("instructorId", "==", instructorId)), (snap) => {
      rawEnrollments = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      recomputeStudents();
    }, (error) => {
      console.error("Instructor enrollments subscription error:", error);
    }));

    // 4. Sync Announcements
    unsubs.push(onSnapshot(query(announcementsCollection, where("authorId", "==", instructorId)), (snap) => {
      set({ announcements: snap.docs.map(d => ({ ...d.data(), id: d.id, date: (d.data().date as any)?.toDate?.().toLocaleDateString() || d.data().date } as any)) });
    }));

    // 5. Sync Assignments
    unsubs.push(onSnapshot(query(assignmentsCollection, where("instructorId", "==", instructorId)), (snap) => {
      set({ 
        assignments: snap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            submissions: data.submissionsCount || 0,
            graded: data.gradedCount || 0,
            totalStudents: data.totalStudents || 0,
            dueDate: (data.dueDate as any)?.toDate?.().toISOString() || data.dueDate
          } as any;
        }) 
      });
    }));

    // 6. Sync Submissions
    unsubs.push(onSnapshot(query(submissionsCollection, where("instructorId", "==", instructorId)), (snap) => {
      rawSubmissions = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      recomputeStudents();
      set({ 
        submissions: rawSubmissions.map(d => ({ 
          ...d.data(), 
          id: d.id,
          submittedAt: (d.submittedAt as any)?.toDate?.().toLocaleDateString() || d.submittedAt
        } as any)) 
      });
    }));

    // 7. Sync Timetable (sessions admin scheduled for this instructor)
    unsubs.push(onSnapshot(query(timetableCollection, where("instructorId", "==", instructorId)), (snap) => {
      set({
        schedules: snap.docs.map(d => {
          const data: any = d.data();
          return {
            id: d.id,
            title: data.title || "Untitled Session",
            courseId: data.programId || "",
            date: data.date || data.day || "",
            time: `${data.startTime || ""}${data.endTime ? " - " + data.endTime : ""}`,
            type: data.type === "virtual" ? "virtual" : "physical",
            location: data.location || "",
          } as any;
        })
      });
    }));

    return () => unsubs.forEach(unsub => unsub());
  }
}));

