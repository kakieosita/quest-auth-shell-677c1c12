import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
  applyActionCode,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp, addDoc, getDocs, query, where } from "firebase/firestore";
import { auth } from "./firebase";
import { useAuthStore } from "@/stores/auth-store";
import { User as DbUser } from "./db/schema";
import { usersCollection, studentsCollection, instructorsCollection, programsCollection, enrollmentsCollection } from "./db/collections";

const TOKEN_KEY = "edu_auth_token";
const USER_KEY = "edu_auth_user";

export type Role = "student" | "instructor" | "alumni" | "partner" | "admin";

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  age?: number;
  gender?: string;
  interestedCourse?: string;
  phoneNumber?: string;
  nextOfKin?: string;
  nextOfKinPhoneNumber?: string;
  address?: string;
}

function isFirebaseConfigError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("api-key") || message.includes("auth/invalid-api-key");
}

export const authApi = {
  async login(input: LoginInput) {
    const userCredential = await signInWithEmailAndPassword(auth, input.email, input.password);
    
    /* 
    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      // Optional: resend verification email if they try to login without verification
      await sendEmailVerification(userCredential.user);
      throw new Error("Please verify your email address. A new verification link has been sent to your inbox.");
    }
    */

    const token = await userCredential.user.getIdToken();
    sessionStorage.setItem(TOKEN_KEY, token);

    // Fetch the user's role from Firestore
    const userDoc = await getDoc(doc(usersCollection, userCredential.user.uid));
    if (!userDoc.exists()) {
       throw new Error("User profile not found in database.");
    }
    const userData = userDoc.data() as DbUser;

    // Check for suspension
    if (userData.status === "Suspended" || userData.status === "Inactive") {
      await signOut(auth);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      throw new Error("Your account has been suspended or is inactive. Please contact the administrator.");
    }
    
    // Update store immediately to avoid race conditions with onAuthStateChanged
    useAuthStore.getState().setUser(userData);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));

    return { token, user: userData };
  },

  async signup(input: SignupInput) {
    // 1. Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, input.email, input.password);
    
    // 2. Update their display name in Auth
    await updateProfile(userCredential.user, { displayName: input.fullName });

    const userData: DbUser = {
      id: userCredential.user.uid,
      email: input.email,
      displayName: input.fullName,
      photoURL: null,
      role: input.role,
      age: input.age,
      gender: input.gender,
      interestedCourse: input.interestedCourse,
      phoneNumber: input.phoneNumber,
      nextOfKin: input.nextOfKin,
      nextOfKinPhoneNumber: input.nextOfKinPhoneNumber,
      address: input.address,
      status: "Active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // 3. Create the user document in Firestore
    await setDoc(doc(usersCollection, userCredential.user.uid), userData);
    
    // 4. Duplicate into students collection if student
    if (input.role === "student") {
      await setDoc(doc(studentsCollection, userCredential.user.uid), userData);

      // 4b. Auto-enroll the student in their interested course so the instructor sees them
      if (input.interestedCourse) {
        try {
          const programsSnap = await getDocs(programsCollection);
          const target = programsSnap.docs.find(
            (d) => String((d.data() as any).title || "").trim().toLowerCase() ===
              String(input.interestedCourse).trim().toLowerCase()
          );
          if (target) {
            const program: any = target.data();
            await addDoc(enrollmentsCollection, {
              studentId: userCredential.user.uid,
              studentName: input.fullName,
              studentEmail: input.email,
              programId: target.id,
              programName: program.title,
              instructorId: program.instructorId || "",
              progress: 0,
              grade: "",
              status: "active",
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            } as any);
          }
        } catch (e) {
          console.error("Auto-enrollment failed:", e);
        }
      }
    } else if (input.role === "instructor") {
      await setDoc(doc(instructorsCollection, userCredential.user.uid), userData);
    }
    
    // 5. Send verification email
    await sendEmailVerification(userCredential.user);

    const token = await userCredential.user.getIdToken();
    sessionStorage.setItem(TOKEN_KEY, token);

    useAuthStore.getState().setUser(userData);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));

    return { token, user: userData };
  },

  async forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
    return { message: `Reset link sent to ${email}` };
  },

  async sendPasswordReset(email: string) {
    return this.forgotPassword(email);
  },

  async resetPassword(actionCode: string, password: string) {
    // Verify the code before confirming
    await verifyPasswordResetCode(auth, actionCode);
    await confirmPasswordReset(auth, actionCode, password);
    return { message: "Password updated" };
  },

  async verifyEmail(actionCode: string) {
    // Verify the email action code
    await checkActionCode(auth, actionCode);
    await applyActionCode(auth, actionCode);
    return { verified: true };
  },

  async google() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if user already exists in Firestore
    const userDocRef = doc(usersCollection, userCredential.user.uid);
    const userDocSnap = await getDoc(userDocRef);

    let role: Role = "student";

    // If it's a new Google user, create their document in Firestore
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        id: userCredential.user.uid,
        email: userCredential.user.email || "",
        displayName: userCredential.user.displayName || "Google User",
        photoURL: userCredential.user.photoURL || null,
        role: "student", // default role for social login
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      role = userDocSnap.data().role as Role;
    }

    const token = await userCredential.user.getIdToken();
    sessionStorage.setItem(TOKEN_KEY, token);

    const finalUserDoc = await getDoc(userDocRef);
    const userData = finalUserDoc.data() as DbUser;

    // Check for suspension
    if (userData.status === "Suspended" || userData.status === "Inactive") {
      await signOut(auth);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      throw new Error("Your account has been suspended or is inactive. Please contact the administrator.");
    }
    
    useAuthStore.getState().setUser(userData);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));

    return { token, user: userData };
  },

  async logout() {
    await signOut(auth);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    useAuthStore.getState().setUser(null);
  },

  async resendVerificationEmail() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      return { message: "Verification email resent" };
    }
    throw new Error("No user is currently signed in. Please sign in again to verify your email.");
  },

  getToken() {
    // Note: In a robust app, we'd rely on Firebase's auth state listener (onAuthStateChanged).
    // For synchronous router checks, we rely on the sessionStorage marker.
    return typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  },

  getDashboardRoute(role: Role): string {
    switch (role) {
      case "admin":
        return "/admin";
      case "instructor":
        return "/instructor";
      case "alumni":
        return "/alumni";
      case "partner":
        return "/partner";
      default:
        return "/dashboard";
    }
  },
};
