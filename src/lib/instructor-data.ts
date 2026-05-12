export type InstructorCourse = {
  id: string;
  title: string;
  category: string;
  status: "published" | "draft" | "archived";
  thumbnail: string;
  students: number;
  lessons: number;
  rating: number;
  revenue: number;
  completionRate: number;
  updatedAt: string;
  materialsUrl?: string;
  description?: string;
  duration?: string;
};

export type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  courseId: string;
  progress: number;
  lastActive: string;
  grade?: string;
};

export type InstructorAssignment = {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  type: "assignment" | "quiz";
  dueDate: string;
  submissions: number;
  totalStudents: number;
  graded: number;
  description?: string;
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  status: "pending" | "graded";
  grade?: string;
  feedback?: string;
  fileName: string;
  fileUrl: string;
};

export type ActivityItem = {
  id: string;
  type: "enroll" | "submission" | "review" | "completion";
  text: string;
  time: string;
};

export type ScheduleSession = {
  id: string;
  title: string;
  courseId: string;
  date: string;
  time: string;
  type: "physical" | "virtual";
  location: string; // "Hall A" or "Zoom Link"
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "absent";
};

export type Announcement = {
  id: string;
  courseId: string;
  title: string;
  content: string;
  date: string;
};

export type EarningRecord = {
  id: string;
  amount: number;
  date: string;
  status: "paid" | "pending";
};

export type Credential = {
  id: string;
  title: string;
  issuer: string;
  date: string;
  status: "verified" | "pending";
  file?: string;
};

const thumbs = [
  "linear-gradient(135deg, oklch(0.55 0.18 258), oklch(0.7 0.15 220))",
  "linear-gradient(135deg, oklch(0.6 0.18 320), oklch(0.7 0.15 280))",
  "linear-gradient(135deg, oklch(0.65 0.17 175), oklch(0.6 0.15 220))",
  "linear-gradient(135deg, oklch(0.7 0.18 50), oklch(0.65 0.2 25))",
  "linear-gradient(135deg, oklch(0.6 0.2 145), oklch(0.7 0.16 175))",
];

export const instructorCourses: InstructorCourse[] = [
  { id: "ic1", title: "Full-Stack Web Development with React & Node", category: "Web Development", status: "published", thumbnail: thumbs[0], students: 248, lessons: 24, rating: 4.8, revenue: 1240000, completionRate: 72, updatedAt: "2026-04-18" },
  { id: "ic2", title: "Advanced TypeScript Patterns", category: "Programming", status: "published", thumbnail: thumbs[1], students: 156, lessons: 18, rating: 4.7, revenue: 780000, completionRate: 65, updatedAt: "2026-04-12" },
  { id: "ic3", title: "Cloud Engineering with AWS", category: "Cloud", status: "published", thumbnail: thumbs[2], students: 192, lessons: 22, rating: 4.9, revenue: 960000, completionRate: 81, updatedAt: "2026-04-20" },
  { id: "ic4", title: "GraphQL APIs from Scratch", category: "Backend", status: "draft", thumbnail: thumbs[3], students: 0, lessons: 12, rating: 0, revenue: 0, completionRate: 0, updatedAt: "2026-04-22" },
  { id: "ic5", title: "Intro to System Design", category: "Architecture", status: "published", thumbnail: thumbs[4], students: 84, lessons: 14, rating: 4.6, revenue: 420000, completionRate: 58, updatedAt: "2026-03-30" },
];

const firstNames = ["Adaeze", "Tunde", "Aisha", "Emeka", "Ngozi", "Femi", "Chioma", "Bola", "Yemi", "Ifeanyi", "Halima", "Kunle"];
const lastNames = ["Okonkwo", "Bakare", "Ibrahim", "Nwosu", "Eze", "Adeyemi", "Okafor", "Olawale", "Adeleke", "Obi", "Musa", "Ojo"];

export const enrolledStudents: EnrolledStudent[] = Array.from({ length: 36 }, (_, i) => {
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[(i * 3) % lastNames.length];
  const course = instructorCourses[i % 4];
  const progress = Math.min(100, 10 + ((i * 13) % 95));
  return {
    id: `s${i + 1}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@upskill.edu.ng`,
    courseId: course.id,
    progress,
    lastActive: ["Today", "Yesterday", "2 days ago", "1 week ago"][i % 4],
    grade: progress > 80 ? ["A", "A-", "B+"][i % 3] : undefined,
  };
});

export const instructorAssignments: InstructorAssignment[] = [
  { id: "ia1", title: "Build a REST API with Express", courseId: "ic1", courseName: "Full-Stack Web Development", type: "assignment", dueDate: "2026-04-28", submissions: 198, totalStudents: 248, graded: 142 },
  { id: "ia2", title: "TypeScript Generics Quiz", courseId: "ic2", courseName: "Advanced TypeScript Patterns", type: "quiz", dueDate: "2026-04-25", submissions: 134, totalStudents: 156, graded: 134 },
  { id: "ia3", title: "Deploy a Static Site to S3", courseId: "ic3", courseName: "Cloud Engineering with AWS", type: "assignment", dueDate: "2026-04-30", submissions: 87, totalStudents: 192, graded: 40 },
  { id: "ia4", title: "System Design: URL Shortener", courseId: "ic5", courseName: "Intro to System Design", type: "assignment", dueDate: "2026-05-05", submissions: 22, totalStudents: 84, graded: 0 },
];

export const submissions: Submission[] = [
  { id: "sub1", assignmentId: "ia1", studentId: "s1", studentName: "Adaeze Okonkwo", studentEmail: "adaeze.okonkwo@upskill.edu.ng", submittedAt: "2 hours ago", status: "pending", fileName: "rest-api.zip", fileUrl: "#" },
  { id: "sub2", assignmentId: "ia1", studentId: "s2", studentName: "Tunde Bakare", studentEmail: "tunde.bakare@upskill.edu.ng", submittedAt: "5 hours ago", status: "graded", grade: "A", feedback: "Excellent implementation of middleware.", fileName: "express-api.zip", fileUrl: "#" },
  { id: "sub3", assignmentId: "ia3", studentId: "s3", studentName: "Aisha Ibrahim", studentEmail: "aisha.ibrahim@upskill.edu.ng", submittedAt: "Yesterday", status: "pending", fileName: "s3-deploy.pdf", fileUrl: "#" },
  { id: "sub4", assignmentId: "ia2", studentId: "s4", studentName: "Emeka Nwosu", studentEmail: "emeka.nwosu@upskill.edu.ng", submittedAt: "Yesterday", status: "graded", grade: "B+", feedback: "Good effort, but check the closure questions again.", fileName: "quiz-attempt-1.json", fileUrl: "#" },
  { id: "sub5", assignmentId: "ia1", studentId: "s5", studentName: "Ngozi Eze", studentEmail: "ngozi.eze@upskill.edu.ng", submittedAt: "2 days ago", status: "graded", grade: "A-", feedback: "Very clean code.", fileName: "api-final.zip", fileUrl: "#" },
];

export const instructorSchedules: ScheduleSession[] = [
  { id: "sess1", title: "Advanced React Hooks", courseId: "ic1", date: "2026-04-24", time: "14:00", type: "virtual", location: "https://zoom.us/j/123456789" },
  { id: "sess2", title: "AWS Architecture Workshop", courseId: "ic3", date: "2026-04-25", time: "10:00", type: "physical", location: "Hall C, Main Campus" },
  { id: "sess3", title: "TypeScript Interface Q&A", courseId: "ic2", date: "2026-04-26", time: "16:30", type: "virtual", location: "https://meet.google.com/abc-defg-hij" },
];

export const instructorAnnouncements: Announcement[] = [
  { id: "an1", courseId: "ic1", title: "Welcome to Week 4!", content: "This week we dive into performance optimization and server-side rendering.", date: "2026-04-20" },
  { id: "an2", courseId: "ic3", title: "Assignment Deadline Extended", content: "The AWS deployment assignment is now due on Friday, 30th April.", date: "2026-04-22" },
];

export const earningsHistory: EarningRecord[] = [
  { id: "er1", amount: 245000, date: "2026-03-31", status: "paid" },
  { id: "er2", amount: 188000, date: "2026-02-28", status: "paid" },
  { id: "er3", amount: 212000, date: "2026-04-15", status: "pending" },
];

export const instructorCredentials: Credential[] = [
  { id: "cr1", title: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", date: "2023-06-15", status: "verified" },
  { id: "cr2", title: "Google Developers Expert (Web)", issuer: "Google", date: "2024-01-20", status: "verified" },
];

export const recentActivity: ActivityItem[] = [
  { id: "ra1", type: "enroll", text: "12 new students enrolled in Cloud Engineering with AWS", time: "1 hour ago" },
  { id: "ra2", type: "submission", text: "Adaeze Okonkwo submitted 'Build a REST API with Express'", time: "2 hours ago" },
  { id: "ra3", type: "review", text: "New 5★ review on Full-Stack Web Development", time: "5 hours ago" },
  { id: "ra4", type: "completion", text: "8 students completed Advanced TypeScript Patterns", time: "Yesterday" },
  { id: "ra5", type: "enroll", text: "5 new students enrolled in Intro to System Design", time: "2 days ago" },
];

// Last 7 months engagement
export const enrollmentTrend = [
  { month: "Oct", enrollments: 42, completions: 18 },
  { month: "Nov", enrollments: 58, completions: 26 },
  { month: "Dec", enrollments: 71, completions: 34 },
  { month: "Jan", enrollments: 89, completions: 45 },
  { month: "Feb", enrollments: 104, completions: 58 },
  { month: "Mar", enrollments: 128, completions: 72 },
  { month: "Apr", enrollments: 156, completions: 88 },
];

export const revenueTrend = [
  { month: "Oct", revenue: 320000 },
  { month: "Nov", revenue: 480000 },
  { month: "Dec", revenue: 540000 },
  { month: "Jan", revenue: 620000 },
  { month: "Feb", revenue: 710000 },
  { month: "Mar", revenue: 820000 },
  { month: "Apr", revenue: 940000 },
];

export const instructorProfile = {
  name: "Dr. Chinwe Okafor",
  email: "chinwe.okafor@upskill.edu.ng",
  role: "Senior Instructor",
  title: "Lead Web Development Instructor",
  bio: "Full-stack engineer with 12+ years of experience building scalable web applications. Passionate about mentoring the next generation of African software engineers.",
  phone: "+234 803 555 0142",
  location: "Owerri, Imo State",
  expertise: ["React", "Node.js", "TypeScript", "System Design"],
  joinedAt: "August 2023",
};
