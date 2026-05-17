import { create } from "zustand";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserRole, User } from "@/lib/db/schema";
import { usersCollection } from "@/lib/db/collections";

const LOCAL_USER_KEY = "edu_auth_user";

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(LOCAL_USER_KEY) || "null") as User | null;
  } catch {
    sessionStorage.removeItem(LOCAL_USER_KEY);
    return null;
  }
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  initialize: () => {
    // Prevent multiple initializations
    if (useAuthStore.getState().initialized) return;

    const storedUser = getStoredUser();
    if (storedUser) {
      set({ user: storedUser, firebaseUser: null, loading: false, initialized: true });
      return;
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
      set({ firebaseUser, initialized: true });

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(usersCollection, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { ...userDoc.data(), id: userDoc.id } as User;
            if (userData.status === "Suspended" || userData.status === "Inactive") {
              await signOut(auth);
              sessionStorage.removeItem(LOCAL_USER_KEY);
              set({ user: null, loading: false });
            } else {
              set({ user: userData, loading: false });
            }
          } else {
            // Handle case where auth user exists but Firestore doc doesn't yet
            set({ user: null, loading: false });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          set({ user: null, loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }
    });
  },
}));
