import { Timestamp } from "firebase/firestore";

// User Roles
export type UserRole = "admin" | "alumni" | "partner" | "student" | "instructor";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  status?: "Active" | "Suspended" | "Inactive";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  programsAssigned?: string[];
  contractUrl?: string;
  // Specific role data can be added as nested objects or separate collections,
  // but for simplicity we keep basic info here.
  age?: number;
  gender?: string;
  interestedCourse?: string;
  nextOfKin?: string;
  nextOfKinPhoneNumber?: string;
  phoneNumber?: string;
  phone?: string;
  address?: string;
  portalPassword?: string;
  matricNo?: string;
  joinedAt?: Timestamp;
  location?: string;
  bio?: string;
  demographics?: {
    age?: number;
    gender?: string;
    location?: string;
  };
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  programId: string;
  progress?: number;
  grade?: string;
  status: "active" | "completed" | "dropped";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  createdAt: Timestamp;
  programId?: string;
  type?: "payment" | "refund";
}

export interface Activity {
  id: string;
  type: "registration" | "payment" | "partner_request" | "enrollment" | "other";
  description: string;
  createdAt: Timestamp;
  userId?: string;
  metadata?: Record<string, any>;
}


export interface PageSection {
  id: string;
  type: "hero" | "text" | "image" | "features" | "gallery" | "call_to_action";
  content: Record<string, any>;
  order: number;
}

export interface Page {
  id?: string;
  title: string;
  slug: string; // e.g. 'about-us', 'contact'
  description: string;
  status: "draft" | "published";
  sections: PageSection[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Program {
  id?: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  duration: string; // e.g., '4 Years', '6 Months'
  durationWeeks?: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  pricing?: {
    groupClass?: number;
    executiveClass?: number;
    privateClass?: number;
    onlineClass?: number;
    childrenClass?: number;
  };
  sessions?: {
    name: string;
    schedule: string;
  }[];
  featuredImage?: string;
  curriculum: { term: string; courses: string[] }[];
  isFeatured: boolean;
  instructorId?: string;
  instructorName?: string;
  materialsUrl?: string;
  status?: "published" | "draft" | "archived";
  students?: number;
  revenue?: number;
  completionRate?: number;
  rating?: number;
  thumbnail?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Event {
  id?: string;
  title: string;
  description: string;
  date: Timestamp;
  location: string;
  isVirtual: boolean;
  registrationLink?: string;
  featuredImage?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Partner {
  id?: string;
  name: string;
  logoUrl: string;
  website?: string;
  partnershipType: "Industry" | "Academic" | "Technology" | "Corporate";
  description?: string;
  createdAt: Timestamp;
}

export interface Testimonial {
  id?: string;
  authorName: string;
  authorRole: string; // e.g., "Alumni, Class of 2023"
  authorImage?: string;
  content: string;
  rating?: number;
  isFeatured: boolean;
  createdAt: Timestamp;
}

export interface Assignment {
  id: string;
  programId: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  type: "assignment" | "quiz";
  instructorId: string;
  totalStudents?: number;
  submissionsCount?: number;
  gradedCount?: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  instructorId: string;
  fileUrl: string;
  fileName: string;
  status: "pending" | "graded";
  grade?: string | number;
  feedback?: string;
  submittedAt: Timestamp;
}

export interface Certificate {
  id?: string;
  studentId: string;
  programId: string;
  programName: string;
  issueDate: Timestamp;
  verificationId: string;
  url?: string;
}

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  date: Timestamp;
  authorId: string;
  targetRole?: UserRole | "all";
}
export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  programId: string;
  instructorId: string;
  status: "present" | "absent";
  date: Timestamp;
}

export interface PendingEnrollment {
  id?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  age: number;
  gender: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  programId: string;
  programName: string;
  tier: string;
  amount: number;
  paymentMethod: "bank_transfer" | "paystack";
  receiptUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
