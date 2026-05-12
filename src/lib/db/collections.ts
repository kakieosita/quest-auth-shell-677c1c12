import { collection, CollectionReference, DocumentData } from "firebase/firestore";
import { db } from "../firebase";
import {
  User,
  Page,
  Program,
  Event,
  Partner,
  Testimonial,
  Enrollment,
  Transaction,
  Activity,
  Assignment,
  Certificate,
  Announcement
} from "./schema";

// Helper to create a typed collection reference
const createCollection = <T = DocumentData>(collectionName: string) => {
  return collection(db, collectionName) as CollectionReference<T>;
};

// Export typed collections
export const usersCollection = createCollection<User>("users");
export const pagesCollection = createCollection<Page>("pages");
export const programsCollection = createCollection<Program>("programs");
export const eventsCollection = createCollection<Event>("events");
export const partnersCollection = createCollection<Partner>("partners");
export const testimonialsCollection = createCollection<Testimonial>("testimonials");
export const enrollmentsCollection = createCollection<Enrollment>("enrollments");
export const transactionsCollection = createCollection<Transaction>("transactions");
export const activitiesCollection = createCollection<Activity>("activities");
export const assignmentsCollection = createCollection<Assignment>("assignments");
export const certificatesCollection = createCollection<Certificate>("certificates");
export const announcementsCollection = createCollection<Announcement>("announcements");
export const studentsCollection = createCollection<any>("students");
export const instructorsCollection = createCollection<any>("instructors");
export const submissionsCollection = createCollection<any>("submissions");
export const cohortsCollection = createCollection<any>("cohorts");
export const timetableCollection = createCollection<any>("timetable");
