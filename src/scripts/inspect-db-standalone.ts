import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2TvVX-hR-wcJ2Kmg9nPPSXo5bHvQDWI8",
  authDomain: "ust-portal.firebaseapp.com",
  projectId: "ust-portal",
  storageBucket: "ust-portal.firebasestorage.app",
  messagingSenderId: "511127200404",
  appId: "1:511127200404:web:40758a42a93c729ddf8a81",
};

const app = initializeApp(firebaseConfig, "inspector");
const db = getFirestore(app);

async function inspect() {
  console.log("--- TIMETABLE ---");
  const ttSnap = await getDocs(collection(db, "timetable"));
  ttSnap.forEach(d => {
    const data = d.data();
    console.log(`Session: ${data.title}, ProgramId: ${data.programId}, InstructorId: ${data.instructorId}`);
  });

  console.log("\n--- ENROLLMENTS ---");
  const enSnap = await getDocs(collection(db, "enrollments"));
  enSnap.forEach(d => {
    const data = d.data();
    console.log(`Student: ${data.studentName}, ProgramId: ${data.programId}, InstructorId: ${data.instructorId}`);
  });

  console.log("\n--- PROGRAMS ---");
  const prSnap = await getDocs(collection(db, "programs"));
  prSnap.forEach(d => {
    const data = d.data();
    console.log(`Program: ${data.title}, Id: ${d.id}, InstructorId: ${data.instructorId}`);
  });
}

inspect().catch(console.error);
