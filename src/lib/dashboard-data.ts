export type Course = {
  id: string;
  title: string;
  instructor: string;
  instructorId?: string;
  category: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  lessons: Lesson[];
};

export type Lesson = {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
};

export type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded" | "overdue";
  grade?: string;
  feedback?: string;
};

export type Certificate = {
  id: string;
  course: string;
  issuedAt: string;
  credentialId: string;
};

export type Activity = {
  id: string;
  type: "lesson" | "assignment" | "certificate" | "enroll";
  text: string;
  time: string;
};

const thumbs = [
  "linear-gradient(135deg, oklch(0.55 0.18 258), oklch(0.7 0.15 220))",
  "linear-gradient(135deg, oklch(0.6 0.18 320), oklch(0.7 0.15 280))",
  "linear-gradient(135deg, oklch(0.65 0.17 175), oklch(0.6 0.15 220))",
  "linear-gradient(135deg, oklch(0.7 0.18 50), oklch(0.65 0.2 25))",
  "linear-gradient(135deg, oklch(0.6 0.2 145), oklch(0.7 0.16 175))",
  "linear-gradient(135deg, oklch(0.55 0.2 290), oklch(0.65 0.18 330))",
];

const makeLessons = (n: number, completed: number): Lesson[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `l${i + 1}`,
    title: `Lesson ${i + 1}: ${["Introduction", "Core concepts", "Hands-on lab", "Deep dive", "Patterns", "Project work", "Review", "Assessment"][i % 8]}`,
    duration: `${8 + ((i * 3) % 22)} min`,
    completed: i < completed,
  }));

export const mockCourses: Course[] = [
  {
    id: "c1",
    title: "Full-Stack Web Development with React & Node",
    instructor: "Dr. Chinwe Okafor",
    category: "Web Development",
    thumbnail: thumbs[0],
    progress: 68,
    totalLessons: 24,
    completedLessons: 16,
    duration: "12 weeks",
    lessons: makeLessons(24, 16),
  },
  {
    id: "c2",
    title: "Data Science & Machine Learning Foundations",
    instructor: "Engr. Tunde Bakare",
    category: "Data Science",
    thumbnail: thumbs[1],
    progress: 42,
    totalLessons: 20,
    completedLessons: 8,
    duration: "10 weeks",
    lessons: makeLessons(20, 8),
  },
  {
    id: "c3",
    title: "Cloud Engineering with AWS",
    instructor: "Mrs. Aisha Ibrahim",
    category: "Cloud",
    thumbnail: thumbs[2],
    progress: 90,
    totalLessons: 18,
    completedLessons: 16,
    duration: "8 weeks",
    lessons: makeLessons(18, 16),
  },
  {
    id: "c4",
    title: "UI/UX Design Principles",
    instructor: "Mr. Emeka Nwosu",
    category: "Design",
    thumbnail: thumbs[3],
    progress: 25,
    totalLessons: 16,
    completedLessons: 4,
    duration: "6 weeks",
    lessons: makeLessons(16, 4),
  },
  {
    id: "c5",
    title: "Cybersecurity Essentials",
    instructor: "Mr. Femi Adeyemi",
    category: "Security",
    thumbnail: thumbs[4],
    progress: 12,
    totalLessons: 22,
    completedLessons: 3,
    duration: "10 weeks",
    lessons: makeLessons(22, 3),
  },
  {
    id: "c6",
    title: "Mobile App Development with React Native",
    instructor: "Ms. Ngozi Eze",
    category: "Mobile",
    thumbnail: thumbs[5],
    progress: 100,
    totalLessons: 14,
    completedLessons: 14,
    duration: "7 weeks",
    lessons: makeLessons(14, 14),
  },
];

export const mockAssignments: Assignment[] = [
  { id: "a1", title: "Build a REST API with Express", course: "Full-Stack Web Development", dueDate: "2026-04-28", status: "pending" },
  { id: "a2", title: "Linear Regression Notebook", course: "Data Science Foundations", dueDate: "2026-04-25", status: "submitted" },
  { id: "a3", title: "Deploy a Static Site to S3", course: "Cloud Engineering with AWS", dueDate: "2026-04-22", status: "graded", grade: "A" },
  { id: "a4", title: "Wireframe a Banking App", course: "UI/UX Design Principles", dueDate: "2026-04-20", status: "overdue" },
  { id: "a5", title: "Threat Modeling Exercise", course: "Cybersecurity Essentials", dueDate: "2026-05-02", status: "pending" },
  { id: "a6", title: "Final Capstone Submission", course: "Mobile App Development", dueDate: "2026-04-18", status: "graded", grade: "A+" },
];

export const mockCertificates: Certificate[] = [
  { id: "cert1", course: "Mobile App Development with React Native", issuedAt: "2026-04-15", credentialId: "USTO-MOB-2026-0142" },
  { id: "cert2", course: "Intro to Programming with Python", issuedAt: "2026-02-08", credentialId: "USTO-PY-2026-0089" },
  { id: "cert3", course: "Git & GitHub Mastery", issuedAt: "2025-11-20", credentialId: "USTO-GIT-2025-0233" },
];

export const mockActivity: Activity[] = [
  { id: "ac1", type: "lesson", text: "Completed 'React Hooks Deep Dive' in Full-Stack Web Development", time: "2 hours ago" },
  { id: "ac2", type: "assignment", text: "Submitted 'Linear Regression Notebook'", time: "Yesterday" },
  { id: "ac3", type: "certificate", text: "Earned certificate for Mobile App Development", time: "5 days ago" },
  { id: "ac4", type: "enroll", text: "Enrolled in Cybersecurity Essentials", time: "1 week ago" },
];

export const mockUser = {
  name: "Adaeze Okonkwo",
  email: "adaeze.okonkwo@upskill.edu.ng",
  role: "Student",
  matricNo: "USTO/2024/CS/0142",
  joinedAt: "September 2024",
  bio: "Aspiring full-stack engineer passionate about building products that solve real African problems.",
  phone: "+234 803 456 7890",
  location: "Owerri, Imo State",
};

export type Quiz = {
  id: string;
  title: string;
  course: string;
  duration: number; // in minutes
  questions: number;
  status: "available" | "completed" | "missed";
  score?: number;
};

export const mockQuizzes: Quiz[] = [
  { id: "q1", title: "React Fundamentals", course: "Full-Stack Web Development", duration: 30, questions: 20, status: "available" },
  { id: "q2", title: "Intro to Python Data Types", course: "Data Science Foundations", duration: 15, questions: 10, status: "completed", score: 85 },
  { id: "q3", title: "AWS IAM & Security", course: "Cloud Engineering with AWS", duration: 45, questions: 30, status: "available" },
];

export type Grade = {
  id: string;
  course: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  credits: number;
};

export const mockGrades: Grade[] = [
  { id: "g1", course: "Mobile App Development with React Native", score: 92, grade: "A", credits: 4 },
  { id: "g2", course: "Intro to Programming with Python", score: 88, grade: "B", credits: 3 },
  { id: "g3", course: "Git & GitHub Mastery", score: 95, grade: "A", credits: 2 },
];

export type Attendance = {
  id: string;
  course: string;
  totalClasses: number;
  attendedClasses: number;
};

export type AttendanceHistory = {
  id: string;
  courseId: string;
  courseName: string;
  sessionTitle: string;
  date: string;
  status: 'present' | 'absent' | 'pending';
};

export const mockAttendance: Attendance[] = [
  { id: "at1", course: "Full-Stack Web Development", totalClasses: 24, attendedClasses: 22 },
  { id: "at2", course: "Data Science Foundations", totalClasses: 20, attendedClasses: 15 },
  { id: "at3", course: "Cloud Engineering with AWS", totalClasses: 18, attendedClasses: 18 },
];

export type Invoice = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "overdue";
};

export const mockInvoices: Invoice[] = [
  { id: "inv1", description: "Tuition Fee - Fall Semester", amount: 150000, date: "2026-01-10", status: "paid" },
  { id: "inv2", description: "Cloud AWS Certification Fee", amount: 45000, date: "2026-03-15", status: "paid" },
  { id: "inv3", description: "Tuition Fee - Spring Semester", amount: 150000, date: "2026-05-10", status: "pending" },
];

export type ForumPost = {
  id: string;
  author: string;
  title: string;
  category: string;
  replies: number;
  lastActive: string;
};

export const mockForumPosts: ForumPost[] = [
  { id: "fp1", author: "Chinedu E.", title: "Help with React useEffect dependencies", category: "Full-Stack Web Development", replies: 12, lastActive: "1 hour ago" },
  { id: "fp2", author: "Aisha M.", title: "Best resources for learning Pandas?", category: "Data Science", replies: 5, lastActive: "3 hours ago" },
  { id: "fp3", author: "Admin", title: "Welcome to the Spring 2026 Cohort!", category: "General Announcements", replies: 45, lastActive: "1 day ago" },
];

export type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "Workshop" | "Webinar" | "Social";
};

export const mockEvents: Event[] = [
  { id: "ev1", title: "Tech Career Fair 2026", date: "2026-05-15", time: "10:00 AM", type: "Social" },
  { id: "ev2", title: "Mastering TypeScript Workshop", date: "2026-04-28", time: "2:00 PM", type: "Workshop" },
  { id: "ev3", title: "Industry Insights: AI in Fintech", date: "2026-05-02", time: "5:00 PM", type: "Webinar" },
];

export type Announcement = {
  id: string;
  title: string;
  content: string;
  date: string;
};

export const mockAnnouncements: Announcement[] = [
  { id: "an1", title: "Platform Maintenance", content: "The portal will undergo scheduled maintenance on Sunday from 2 AM to 4 AM.", date: "Today" },
  { id: "an2", title: "New Course Available", content: "Check out the new Advanced Go Programming course in the catalog.", date: "Yesterday" },
];

