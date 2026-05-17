import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

async function inspect() {
  console.log("--- TIMETABLE ---");
  const ttSnap = await getDocs(collection(db, "timetable"));
  ttSnap.forEach(d => {
    console.log(`Session: ${d.data().title}, ProgramId: ${d.data().programId}, InstructorId: ${d.data().instructorId}`);
  });

  console.log("\n--- ENROLLMENTS ---");
  const enSnap = await getDocs(collection(db, "enrollments"));
  enSnap.forEach(d => {
    console.log(`Student: ${d.data().studentName}, ProgramId: ${d.data().programId}, InstructorId: ${d.data().instructorId}`);
  });

  console.log("\n--- PROGRAMS ---");
  const prSnap = await getDocs(collection(db, "programs"));
  prSnap.forEach(d => {
    console.log(`Program: ${d.data().title}, Id: ${d.id}, InstructorId: ${d.data().instructorId}`);
  });
}

inspect().catch(console.error);
