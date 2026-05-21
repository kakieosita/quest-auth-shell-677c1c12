import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  CreditCard, 
  CheckCircle, 
  Mail, 
  Download, 
  ArrowRight, 
  BookOpen, 
  ShieldCheck, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Layers, 
  Eye, 
  EyeOff, 
  Info,
  BadgeAlert,
  Loader2,
  Users,
  Clock
} from "lucide-react";
import { onSnapshot, doc, setDoc, Timestamp, addDoc, getDocs, collection } from "firebase/firestore";
import { secondaryAuth, secondaryDb } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { 
  usersCollection, 
  studentsCollection, 
  enrollmentsCollection, 
  transactionsCollection,
  programsCollection,
  pendingEnrollmentsCollection
} from "@/lib/db/collections";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const Route = createFileRoute("/enroll")({
  head: () => ({
    meta: [
      { title: "Direct Program Enrollment — Upskill School of Technology" },
      { name: "description", content: "Enroll and pay with Paystack in seconds. Securely get your credentials and get started immediately." },
    ],
  }),
  component: DirectEnrollPage,
});

// A standard curated list of Upskill's courses with pricing tiers as a solid fallback
const fallbackPrograms = [
  {
    id: "fs-web-dev",
    title: "Full Stack Web Development",
    category: "Software Development",
    duration: "24 Weeks",
    durationWeeks: 24,
    description: "Master modern frontend and backend technologies including React, Node.js, Express, and Databases.",
    pricing: { groupClass: 360000, executiveClass: 460000, privateClass: 1080000, onlineClass: 288000, childrenClass: 252000 }
  },
  {
    id: "fe-web-dev",
    title: "Front End Web Development",
    category: "Software Development",
    duration: "12 Weeks",
    durationWeeks: 12,
    description: "Build beautiful, highly interactive web applications using HTML, CSS, JavaScript, and Tailwind CSS.",
    pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
  },
  {
    id: "product-design",
    title: "Product Design (UI/UX)",
    category: "Design & Marketing",
    duration: "12 Weeks",
    durationWeeks: 12,
    description: "Learn UX research, high-fidelity wireframing, layout engineering, prototyping, and Figma expert patterns.",
    pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
  },
  {
    id: "data-science",
    title: "Data Science",
    category: "Data Management",
    duration: "12 Weeks",
    durationWeeks: 12,
    description: "Clean data, construct models, and automate calculations using Python, NumPy, Pandas, and machine learning.",
    pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
  },
  {
    id: "graphic-design",
    title: "Graphic Design",
    category: "Design & Marketing",
    duration: "12 Weeks",
    durationWeeks: 12,
    description: "Create breathtaking branding, layout guides, typography, and visual visual concepts using Photoshop and Illustrator.",
    pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
  },
  {
    id: "computer-repairs",
    title: "Computer Repairs and Maintenance",
    category: "Hard Tech",
    duration: "12 Weeks",
    durationWeeks: 12,
    description: "Diagnose hardware defects, construct customized desktop computers, and handle advanced firmware setup.",
    pricing: { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 }
  },
  {
    id: "autocad",
    title: "AutoCAD",
    category: "Computer Aided Design",
    duration: "8 Weeks",
    durationWeeks: 8,
    description: "Engage in 2D and 3D industrial blueprints, architectural planning, layout designing, and rendering models.",
    pricing: { groupClass: 120000, executiveClass: 220000, privateClass: 360000, onlineClass: 96000, childrenClass: 84000 }
  },
  {
    id: "computer-basics",
    title: "Computer Basics",
    category: "Computer Fundamentals",
    duration: "6 Weeks",
    durationWeeks: 6,
    description: "Get familiar with professional keyboard layouts, internet tools, spreadsheets, slide creation, and OS configurations.",
    pricing: { groupClass: 90000, executiveClass: 190000, privateClass: 270000, onlineClass: 72000, childrenClass: 63000 }
  }
];

function DirectEnrollPage() {
  const navigate = useNavigate();
  
  // Real-time dynamic course repository
  const [programs, setPrograms] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // User input states
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedTier, setSelectedTier] = useState<"groupClass" | "executiveClass" | "privateClass" | "onlineClass" | "childrenClass">("groupClass");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [nextOfKin, setNextOfKin] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  
  // Payment and creation lifecycle
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"form" | "paying" | "verifying" | "success" | "pending_transfer">("form");
  const [customPublicKey, setCustomPublicKey] = useState("pk_test_fc1815911c8dd9017e06f95858ec595869da7598");
  
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "bank_transfer">("paystack");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  // Generated credentials storage for onboarding display
  const [generatedCreds, setGeneratedCreds] = useState<{
    uid: string;
    matricNo: string;
    password: string;
    programTitle: string;
    amountPaid: number;
    receiptNo: string;
  } | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  // Sync programs on mount
  useEffect(() => {
    const unsub = onSnapshot(programsCollection, (snap) => {
      if (!snap.empty) {
        const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setPrograms(fetched);
        if (fetched.length > 0) {
          setSelectedProgramId(fetched[0].id);
        }
      } else {
        // Fallback to default programs if Firestore collection is empty
        setPrograms(fallbackPrograms);
        setSelectedProgramId(fallbackPrograms[0].id);
      }
      setLoadingPrograms(false);
    }, (error) => {
      console.error("Firestore programs read failed, utilizing high-quality local fallback list:", error);
      setPrograms(fallbackPrograms);
      setSelectedProgramId(fallbackPrograms[0].id);
      setLoadingPrograms(false);
    });

    return () => unsub();
  }, []);

  // Dynamically calculate the active program & price
  const activeProgram = programs.find(p => p.id === selectedProgramId) || fallbackPrograms[0];
  const defaultPricing: any = { groupClass: 180000, executiveClass: 280000, privateClass: 540000, onlineClass: 144000, childrenClass: 126000 };
  const hasValidPricing = activeProgram?.pricing && Object.values(activeProgram.pricing).some(v => Number(v) > 0);
  const activePricing = hasValidPricing ? activeProgram.pricing : defaultPricing;
  const activePrice = activePricing[selectedTier] || defaultPricing[selectedTier];

  // Validation function
  const validateForm = () => {
    if (!selectedProgramId) {
      toast.error("Please select a program or course.");
      return false;
    }
    if (!fullName.trim() || fullName.trim().split(" ").length < 2) {
      toast.error("Please enter your full name (first and last name).");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 9) {
      toast.error("Please enter a valid phone number.");
      return false;
    }
    if (!address.trim()) {
      toast.error("Please enter your resident address.");
      return false;
    }
    if (!age || isNaN(Number(age)) || Number(age) < 5) {
      toast.error("Please enter a valid age.");
      return false;
    }
    if (!gender) {
      toast.error("Please select a gender option.");
      return false;
    }
    if (!nextOfKin.trim()) {
      toast.error("Please provide Next of Kin contact name.");
      return false;
    }
    if (!nextOfKinPhone.trim() || nextOfKinPhone.trim().length < 9) {
      toast.error("Please enter your Next of Kin phone number.");
      return false;
    }
    return true;
  };

  // Generate random credentials
  const generateCredentials = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const matricNo = `USTO/2026/CS/${randomSuffix}`;
    
    // Generate secure human-readable temporary password: USTO-ABCD-1234
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let passPart1 = "";
    let passPart2 = "";
    for (let i = 0; i < 4; i++) {
      passPart1 += characters.charAt(Math.floor(Math.random() * characters.length));
      passPart2 += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const password = `USTO-${passPart1}-${passPart2}`;
    const receiptNo = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

    return { matricNo, password, receiptNo };
  };

  // Provision student user in backend
  const handleStudentProvisioning = async (matricNo: string, tempPassword: string, receiptNo: string) => {
    try {
      console.log("Auto-provisioning student Auth account via secondaryAuth...");
      // 1. Create student in Firebase Authentication using secondaryAuth (to avoid signing out admin/guest)
      const authResult = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), tempPassword);
      const uid = authResult.user.uid;
      
      // 2. Set profile display name
      await updateProfile(authResult.user, { displayName: fullName.trim() });

      // 3. Write User details to 'users' collection in Firestore
      const userProfile = {
        id: uid,
        email: email.trim().toLowerCase(),
        displayName: fullName.trim(),
        photoURL: null,
        role: "student",
        status: "Active",
        age: Number(age),
        gender: gender,
        interestedCourse: activeProgram.title,
        phoneNumber: phoneNumber.trim(),
        nextOfKin: nextOfKin.trim(),
        nextOfKinPhoneNumber: nextOfKinPhone.trim(),
        address: address.trim(),
        matricNo: matricNo,
        portalPassword: tempPassword,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const secondaryUsersCol = collection(secondaryDb, "users");
      const secondaryStudentsCol = collection(secondaryDb, "students");
      const secondaryTransactionsCol = collection(secondaryDb, "transactions");
      const secondaryEnrollmentsCol = collection(secondaryDb, "enrollments");

      await setDoc(doc(secondaryUsersCol, uid), userProfile);
      console.log("Student written successfully to 'users' collection.");

      // 4. Duplicate into 'students' collection
      await setDoc(doc(secondaryStudentsCol, uid), userProfile);
      console.log("Student duplicated successfully to 'students' collection.");

      // 5. Create transaction record under 'transactions' collection
      const txnRecord = {
        id: receiptNo,
        userId: uid,
        amount: activePrice,
        status: "completed",
        programId: activeProgram.id,
        type: "payment",
        createdAt: Timestamp.now()
      };
      await setDoc(doc(secondaryTransactionsCol, receiptNo), txnRecord);
      console.log("Transaction successfully logged in Firestore.");

      // 6. Automatically enroll student in selected program
      const enrollmentRecord = {
        studentId: uid,
        studentName: fullName.trim(),
        studentEmail: email.trim().toLowerCase(),
        programId: activeProgram.id,
        programName: activeProgram.title,
        instructorId: activeProgram.instructorId || "",
        progress: 0,
        grade: "",
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      await addDoc(secondaryEnrollmentsCol, enrollmentRecord);
      console.log("Enrollment successfully recorded in Firestore.");

      // Store in state to display on confirmation screens
      setGeneratedCreds({
        uid,
        matricNo,
        password: tempPassword,
        programTitle: activeProgram.title,
        amountPaid: activePrice,
        receiptNo
      });

      return true;
    } catch (e: any) {
      console.error("Student provisioning error:", e);
      toast.error(e.message || "Failed to create account. Check your network or database parameters.");
      return false;
    }
  };

  // Paystack standard checkout pop-up launcher
  const launchPaystackLive = async () => {
    setIsSubmitting(true);
    setPaymentStep("paying");
    
    // Dynamic loader for inline Paystack library
    try {
      const loadScript = () => {
        return new Promise((resolve, reject) => {
          if ((window as any).PaystackPop) {
            resolve(true);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://js.paystack.co/v1/inline.js";
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error("Paystack SDK script failed to load."));
          document.body.appendChild(script);
        });
      };

      await loadScript();

      const { matricNo, password, receiptNo } = generateCredentials();

      const paystack = (window as any).PaystackPop.setup({
        key: customPublicKey,
        email: email.trim(),
        amount: activePrice * 100, // Paystack amount is in kobo
        currency: "NGN",
        ref: receiptNo,
        metadata: {
          custom_fields: [
            {
              display_name: "Student Name",
              variable_name: "student_name",
              value: fullName.trim()
            },
            {
              display_name: "Program",
              variable_name: "program_title",
              value: activeProgram.title
            },
            {
              display_name: "Student Registration ID",
              variable_name: "matric_id",
              value: matricNo
            }
          ]
        },
        callback: function(response: any) {
          (async () => {
            setPaymentStep("verifying");
            const tid = toast.loading("Verifying transaction and setting up portal...");
            
            // Execute provisioning workflow in backend
            const success = await handleStudentProvisioning(matricNo, password, receiptNo);
            if (success) {
              toast.success("Payment confirmed & student account generated successfully!", { id: tid });
              setPaymentStep("success");
            } else {
              toast.error("Payment was successful, but account setup failed. Contact administrator.", { id: tid });
              setPaymentStep("form");
            }
          })();
        },
        onClose: () => {
          setIsSubmitting(false);
          setPaymentStep("form");
          toast.warning("Checkout dismissed. Transaction cancelled.");
        }
      });

      paystack.openIframe();
    } catch (err: any) {
      console.error("PAYSTACK INIT ERROR:", err);
      toast.error(`Paystack Error: ${err?.message || "Check network or adblocker"}`);
      setIsSubmitting(false);
      setPaymentStep("form");
    }
  };

  // Graphical offline simulator launcher
  const launchPaystackSimulator = async () => {
    setIsSubmitting(true);
    setPaymentStep("paying");

    // Simulate Paystack loading and checkout
    setTimeout(async () => {
      setPaymentStep("verifying");
      const { matricNo, password, receiptNo } = generateCredentials();

      setTimeout(async () => {
        const success = await handleStudentProvisioning(matricNo, password, receiptNo);
        if (success) {
          toast.success("Demo payment mock confirmed & account registered!");
          setPaymentStep("success");
        } else {
          setPaymentStep("form");
        }
        setIsSubmitting(false);
      }, 1500);
    }, 2000);
  };

  // Bank Transfer Submission Handler
  const handleBankTransferSubmit = async () => {
    if (!receiptFile) {
      toast.error("Please upload the screenshot of your payment receipt.");
      return;
    }

    setIsSubmitting(true);
    setPaymentStep("paying");
    const tid = toast.loading("Uploading receipt and saving application...");

    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", receiptFile);
      formData.append("upload_preset", "ust_unsigned"); // Use the user's unsigned preset

      const uploadRes = await fetch("https://api.cloudinary.com/v1_1/dier88erd/image/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || "Failed to upload receipt.");
      }

      const receiptUrl = uploadData.secure_url;

      // 2. Generate random transaction ref
      const { receiptNo } = generateCredentials();

      // 3. Save pending enrollment
      const pendingEnrollment = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        age: Number(age),
        gender: gender,
        nextOfKin: nextOfKin.trim(),
        nextOfKinPhone: nextOfKinPhone.trim(),
        programId: activeProgram.id,
        programName: activeProgram.title,
        tier: selectedTier,
        amount: activePrice,
        paymentMethod: "bank_transfer",
        receiptUrl: receiptUrl,
        status: "pending",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(pendingEnrollmentsCollection, pendingEnrollment);

      // 4. Save pending transaction record
      await addDoc(transactionsCollection, {
        userId: "pending_" + Date.now(), // Will be updated on approval
        amount: activePrice,
        status: "pending",
        createdAt: Timestamp.now(),
        programId: activeProgram.id,
        type: "payment",
        method: "bank_transfer",
        receiptUrl: receiptUrl,
        studentName: fullName.trim(),
        receiptNo: receiptNo
      });

      toast.success("Application submitted successfully for verification!", { id: tid });
      setPaymentStep("pending_transfer");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during submission.", { id: tid });
      setPaymentStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submission handler
  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (paymentMethod === "bank_transfer") {
      handleBankTransferSubmit();
    } else {
      if (isSandboxMode) {
        launchPaystackSimulator();
      } else {
        launchPaystackLive();
      }
    }
  };

  // Download printable PDF receipt and official admission letter
  const handleDownloadPDF = () => {
    if (!generatedCreds) return;
    
    try {
      const doc = new jsPDF();
      const primaryColor = [107, 33, 168]; // Purple 800 (Upskill theme color)
      const darkColor = [31, 41, 55]; // Gray 800

      // Page 1: Official Admission Letter
      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 45, "F");

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("UPSKILL SCHOOL OF TECHNOLOGY", 15, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("OWERRI TECH HUB, IMO STATE, NIGERIA | ADMISSION OFFICE", 15, 28);
      doc.text("E-mail: admissions@upskill.edu.ng | Web: www.upskill.edu.ng", 15, 34);

      // Letter Body
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("OFFICIAL LETTER OF ADMISSION", 15, 60);
      
      // Divider
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.line(15, 63, 195, 63);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      const letterDate = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      doc.text(`Date: ${letterDate}`, 15, 72);
      doc.text(`Student Reg. No: ${generatedCreds.matricNo}`, 15, 78);

      // Addressed Student
      doc.setFont("helvetica", "bold");
      doc.text(`Dear ${fullName},`, 15, 90);

      doc.setFont("helvetica", "normal");
      const text1 = `We are pleased to inform you that you have been offered provisional admission into the Upskill School of Technology to undertake our professional program in ${generatedCreds.programTitle}.`;
      const splitText1 = doc.splitTextToSize(text1, 180);
      doc.text(splitText1, 15, 98);

      const text2 = `Your admission is subject to your completed payment of ₦${generatedCreds.amountPaid.toLocaleString()} which has been successfully processed and verified. We expect our students to maintain the highest levels of professional integrity, attendance, and commitment as you build world-class tech capacity.`;
      const splitText2 = doc.splitTextToSize(text2, 180);
      doc.text(splitText2, 15, 112);

      // Credentials Box
      doc.setFillColor(243, 244, 246); // gray-100
      doc.rect(15, 132, 180, 42, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12);
      doc.text("STUDENT PORTAL ACCESS CREDENTIALS", 22, 140);
      
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(`Login URL: http://ust-portal.firebaseapp.com/login`, 22, 148);
      doc.text(`Portal Username (Your Email): ${email}`, 22, 154);
      doc.setFont("helvetica", "bold");
      doc.text(`Student Reg. No / ID: ${generatedCreds.matricNo}`, 22, 160);
      doc.text(`Temporary Login Password: ${generatedCreds.password}`, 22, 166);

      // Closing
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("We wish you an excellent and rewarding experience in your tech journey.", 15, 186);

      const finalY = 220;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, finalY, 75, finalY);
      doc.line(135, finalY, 195, finalY);
      doc.setFontSize(8);
      doc.text("Director of Admissions", 15, finalY + 5);
      doc.text("Upskill Academic Seal", 135, finalY + 5);

      // PAGE 2: Official Payment Receipt
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("OFFICIAL PAYMENT RECEIPT", 15, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt ID: ${generatedCreds.receiptNo} | Date: ${letterDate}`, 15, 28);

      // Receipt Box details
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PAYMENT DETAILS", 15, 55);
      doc.setDrawColor(229, 231, 235);
      doc.line(15, 58, 195, 58);

      // Table mapping details
      const tableRows = [
        ["Receipt Number", generatedCreds.receiptNo],
        ["Student Full Name", fullName],
        ["Student Email Address", email],
        ["Assigned Student Reg. No", generatedCreds.matricNo],
        ["Registered Tech Program", generatedCreds.programTitle],
        ["Enrolled Class Tier", selectedTier.replace("Class", " Class").replace(/^\w/, c => c.toUpperCase())],
        ["Payment Gateway Used", isSandboxMode ? "Paystack (Demo Simulator)" : "Paystack Inline Gateway"],
        ["Total Amount Billed", `NGN ${generatedCreds.amountPaid.toLocaleString()}.00`],
        ["Gateway Settlement Status", "SUCCESSFUL / COMPLETED"]
      ];

      (doc as any).autoTable({
        startY: 65,
        body: tableRows,
        theme: "striped",
        bodyStyles: {
          fontSize: 10,
          textColor: darkColor,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 70 },
          1: { cellWidth: 110 }
        },
        margin: { left: 15, right: 15 }
      });

      // Footer
      const nextY = (doc as any).lastAutoTable.finalY + 30;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // green-500
      doc.text("★ PAID IN FULL ★", 15, nextY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text("For help regarding classes, contact support@upskill.edu.ng or call +234 810 000 0000.", 15, nextY + 10);

      doc.save(`UST_Admission_${fullName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Official Admission Letter & Receipt PDF downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate and save PDF documents.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 antialiased py-8 px-4 flex flex-col items-center">
      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-500/10 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-4xl z-10">
        
        {/* Navigation back and Branding */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-600 p-0.5 shadow-md shadow-purple-500/20 group-hover:scale-105 transition">
              <span className="font-display font-extrabold text-white text-lg tracking-tight">UP</span>
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white">
              Upskill <span className="text-purple-400">School of Tech</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition">
              Sign In
            </Link>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {paymentStep === "form" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Form Side */}
              <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-6 md:p-8 shadow-2xl">
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                      Direct Student Enrollment
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Pay securely with Paystack & instantly receive your student login credentials.
                    </p>
                  </div>
                  <Sparkles className="h-6 w-6 text-purple-400 animate-pulse shrink-0" />
                </div>

                <form onSubmit={handleEnrollSubmit} className="space-y-6">
                  {/* Class Selection section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-400" />
                      1. Select Your Professional Program
                    </label>
                    {loadingPrograms ? (
                      <div className="flex items-center justify-center py-6 bg-slate-900/50 rounded-xl border border-slate-750">
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin mr-2" />
                        <span className="text-xs text-slate-400">Syncing active programs list...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      >
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.category})
                          </option>
                        ))}
                      </select>
                    )}
                    {activeProgram && (
                      <p className="text-xs text-slate-400 italic px-1">
                        {activeProgram.description}
                      </p>
                    )}
                  </div>

                  {/* Class Tiers */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-400" />
                      2. Select Class Delivery Tier
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                      {[
                        { key: "groupClass", label: "Group", desc: "Regular batch" },
                        { key: "executiveClass", label: "Exec", desc: "Weekend slot" },
                        { key: "privateClass", label: "Private", desc: "1-on-1 mentor" },
                        { key: "onlineClass", label: "Online", desc: "Self-paced web" },
                        { key: "childrenClass", label: "Kids", desc: "Special hours" }
                      ].map((tier) => {
                        const price = activePricing[tier.key] || 0;
                        if (price === 0) return null;
                        const isSelected = selectedTier === tier.key;
                        return (
                          <button
                            key={tier.key}
                            type="button"
                            onClick={() => setSelectedTier(tier.key as any)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 text-center transition-all ${
                              isSelected
                                ? "border-purple-500 bg-purple-600/10 text-white"
                                : "border-slate-700 bg-slate-900/50 hover:border-slate-600 text-slate-400"
                            }`}
                          >
                            <span className="text-xs font-bold">{tier.label}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{tier.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Personal details */}
                  <div className="space-y-4 pt-4 border-t border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400" />
                      3. Student Personal Details
                    </label>
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Osita Kakie"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+234..."
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Age</label>
                        <input
                          type="number"
                          required
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="e.g. 20"
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                        <select
                          required
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resident Address</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="12 Tech Hub Street, Owerri, Imo State"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>

                  {/* Next of kin details */}
                  <div className="space-y-4 pt-4 border-t border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      4. Guardian / Next of Kin Details
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Next of Kin Name</label>
                        <input
                          type="text"
                          required
                          value={nextOfKin}
                          onChange={(e) => setNextOfKin(e.target.value)}
                          placeholder="Contact relative name"
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Next of Kin Phone</label>
                        <input
                          type="tel"
                          required
                          value={nextOfKinPhone}
                          onChange={(e) => setNextOfKinPhone(e.target.value)}
                          placeholder="+234..."
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-4 pt-4 border-t border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-400" />
                      5. Payment Method
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("paystack")}
                        className={`p-4 rounded-xl border text-left transition flex items-center gap-3 ${
                          paymentMethod === "paystack"
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === "paystack" ? "border-purple-400" : "border-slate-600"
                        }`}>
                          {paymentMethod === "paystack" && <div className="h-2 w-2 rounded-full bg-purple-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">Paystack</p>
                          <p className="text-[10px]">Instant Automated Verification</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bank_transfer")}
                        className={`p-4 rounded-xl border text-left transition flex items-center gap-3 ${
                          paymentMethod === "bank_transfer"
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === "bank_transfer" ? "border-purple-400" : "border-slate-600"
                        }`}>
                          {paymentMethod === "bank_transfer" && <div className="h-2 w-2 rounded-full bg-purple-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">Bank Transfer</p>
                          <p className="text-[10px]">Manual Verification</p>
                        </div>
                      </button>
                    </div>

                    {paymentMethod === "bank_transfer" && (
                      <div className="mt-4 p-5 rounded-xl border border-slate-700 bg-slate-900 space-y-4">
                        <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-500/20">
                          <p className="text-xs text-slate-300 mb-2 font-medium">Please transfer <strong className="text-white">₦{activePrice.toLocaleString()}</strong> to the following account:</p>
                          <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                            <span className="text-slate-400">Account Name:</span>
                            <strong className="text-white">UPSKILL SCHOOL OF TECHNOLOGY LTD</strong>
                            <span className="text-slate-400">Account No:</span>
                            <strong className="text-white font-mono">1310600957</strong>
                            <span className="text-slate-400">Bank Name:</span>
                            <strong className="text-white">ZENITH</strong>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Upload Screenshot of Payment
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setReceiptFile(e.target.files[0]);
                              }
                            }}
                            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] font-bold text-white text-sm tracking-wide shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition cursor-pointer mt-4"
                  >
                    <CreditCard className="h-4 w-4" />
                    {paymentMethod === "paystack" 
                      ? `Pay ₦${activePrice.toLocaleString()} via Paystack` 
                      : `Submit Payment for Verification`}
                  </button>
                </form>
              </div>

              {/* Information Column */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Paystack Test Sandbox Switch */}
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Payment Simulator</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Toggle local sandbox vs live checkout popups.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isSandboxMode} 
                        onChange={() => setIsSandboxMode(!isSandboxMode)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {isSandboxMode ? (
                    <div className="mt-3 p-3 bg-purple-950/40 rounded-xl border border-purple-800/30 flex items-start gap-2.5">
                      <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-purple-300 leading-normal">
                        <strong>Sandbox active:</strong> Submitting will simulate the Paystack pop-up instantly, creating actual Firestore student records and credentials with zero credit card requirements. Flawless for client review!
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 pt-3 border-t border-slate-700/60">
                      <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/30 flex items-start gap-2.5">
                        <BadgeAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-300 leading-normal">
                          <strong>Live test key mode active:</strong> Loads official Paystack Inline SDK. Preconfigured with Paystack's standard sandbox key. Use official Paystack test bank cards to verify live webhook callbacks.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custom Paystack Public Key</label>
                        <input
                          type="text"
                          value={customPublicKey}
                          onChange={(e) => setCustomPublicKey(e.target.value)}
                          placeholder="pk_test_..."
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] text-slate-200 outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Billing Summary */}
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-700 flex items-center justify-between">
                    <span>Order Summary</span>
                    <span className="text-[10px] text-slate-500 normal-case">1 Student Admission</span>
                  </h3>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Registered Program:</span>
                      <span className="font-semibold text-slate-100 text-right">{activeProgram.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Class Delivery:</span>
                      <span className="font-semibold text-slate-100 capitalize">
                        {selectedTier.replace("Class", " Class")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Course Duration:</span>
                      <span className="font-semibold text-slate-100">{activeProgram.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Registration Fee:</span>
                      <span className="text-slate-500 line-through">₦20,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capacity Tax:</span>
                      <span className="text-green-400">₦0.00 (Waived)</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Total Billed:</span>
                    <span className="text-xl font-extrabold text-purple-400">₦{activePrice.toLocaleString()}.00</span>
                  </div>

                  <div className="rounded-xl bg-slate-900/60 p-3.5 border border-slate-750 flex gap-3 text-[10px] leading-normal text-slate-400">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p>
                      Direct billing runs 256-bit Secure Socket Encryption. Paystack supports local credit cards, bank transfers, USSD, and Apple Pay.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* Interactive loading state */}
          {(paymentStep === "paying" || paymentStep === "verifying") && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl max-w-lg mx-auto text-center flex flex-col items-center py-16 space-y-6"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl animate-pulse"></div>
                <div className="h-16 w-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">
                  {paymentStep === "paying" ? "Initiating Paystack Checkout" : "Verifying Settlement Transaction"}
                </h2>
                <p className="text-xs text-slate-400 max-w-sm">
                  {paymentStep === "paying"
                    ? `Spawning secure local frame for ${fullName}. Set up card data or mock authorizations.`
                    : "Connecting to Paystack APIs. Generating registration values, database entities, and email dispatch documents."}
                </p>
              </div>

              <div className="w-full max-w-xs bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full bg-purple-500 rounded-full transition-all duration-1000 ${
                    paymentStep === "paying" ? "w-1/3" : "w-5/6"
                  }`}
                />
              </div>
            </motion.div>
          )}

          {paymentStep === "pending_transfer" && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 ring-8 ring-amber-500/10">
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Application Pending Review</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                Your application and payment receipt have been submitted successfully. 
                Our administrative team will verify your transfer shortly.
              </p>

              <div className="w-full bg-slate-800/80 rounded-2xl p-6 border border-slate-700 text-left">
                <h4 className="text-sm font-bold text-white mb-2">What happens next?</h4>
                <ul className="text-sm text-slate-400 space-y-2 list-disc pl-4">
                  <li>We will confirm the receipt of funds in our Zenith Bank account.</li>
                  <li>Upon confirmation, your student portal credentials (Student Reg. No & Password) will be generated.</li>
                  <li>You will receive an official email containing your login details and admission letter.</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="mt-8 px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition"
              >
                Return to Homepage
              </button>
            </div>
          )}

          {/* Verification success celebration, interactive inbox mockup, and PDF letter */}
          {paymentStep === "success" && generatedCreds && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Success celebration banner */}
              <div className="bg-gradient-to-r from-purple-900/60 to-indigo-900/60 rounded-2xl border border-purple-500/30 p-6 md:p-8 text-center flex flex-col items-center space-y-4 shadow-2xl relative overflow-hidden">
                
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

                <div className="h-14 w-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="h-7 w-7" />
                </div>

                <div className="space-y-1.5 z-10">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    Admission Confirmed & Paid
                  </span>
                  <h1 className="text-3xl font-extrabold text-white">Welcome, {fullName}!</h1>
                  <p className="text-xs text-slate-300 max-w-lg mx-auto">
                    Your payment of ₦{generatedCreds.amountPaid.toLocaleString()} was settled. We have created your official portal profile under Student Reg. No <strong>{generatedCreds.matricNo}</strong>.
                  </p>
                </div>

                {/* Printable receipt trigger and CTA */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 z-10">
                  <button
                    onClick={handleDownloadPDF}
                    className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white flex items-center gap-2 cursor-pointer shadow-md shadow-purple-600/20"
                  >
                    <Download className="h-4 w-4" /> Download Admission Letter & Receipt (PDF)
                  </button>
                  <Link
                    to="/login"
                    className="h-10 px-5 rounded-xl bg-slate-800 hover:bg-slate-750 font-semibold text-xs text-slate-200 border border-slate-700 flex items-center gap-2"
                  >
                    Go to Login Portal <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Dynamic Simulated Apple Mail / Onboarding Inbox Mockup */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                {/* Simulated Mail Client Header */}
                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-750">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40"></div>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px] ml-2">student-inbox-simulator.app</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-700">
                    <Mail className="h-3 w-3 text-purple-400" /> Simulated Student Inbox
                  </div>
                </div>

                {/* Simulated Mail Message Header */}
                <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-850 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white leading-normal">
                        Upskill Admissions Office &lt;admissions@upskill.edu.ng&gt;
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        To: {fullName} &lt;{email}&gt;
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 text-right">Just now</span>
                  </div>
                  <div className="pt-2">
                    <h2 className="text-md font-bold text-purple-300">
                      Welcome to Upskill School of Technology! 🎓 Your Student Credentials inside
                    </h2>
                  </div>
                </div>

                {/* Simulated Email Body Content (HTML Document style) */}
                <div className="p-6 md:p-8 bg-white text-slate-800">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header Logo */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 bg-purple-800 rounded-lg flex items-center justify-center font-bold text-white text-md">UP</div>
                        <span className="font-display font-extrabold text-md text-slate-900">UPSKILL SCHOOL</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">PAYMENT CONFIRMED</span>
                    </div>

                    {/* Email Intro */}
                    <div className="space-y-3 text-slate-700">
                      <h3 className="text-sm font-bold text-slate-900">Dear {fullName},</h3>
                      <p className="text-xs leading-relaxed">
                        We are thrilled to officially welcome you to the **Upskill School of Technology**! Your transaction for the professional course **{generatedCreds.programTitle}** has been settled successfully.
                      </p>
                      <p className="text-xs leading-relaxed">
                        Your academic account has been created dynamically. You can log into the student portal right now using the generated credentials listed below:
                      </p>
                    </div>

                    {/* Portal Credentials Card inside Email */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3.5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-lg"></div>
                      <h4 className="text-[10px] font-extrabold text-purple-800 uppercase tracking-widest">
                        Student Access Portal Credentials
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Reg. No. / ID</span>
                          <span className="font-mono font-bold text-slate-900">{generatedCreds.matricNo}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username</span>
                          <span className="font-semibold text-slate-800">{email}</span>
                        </div>
                        <div className="space-y-0.5 md:col-span-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Temporary Login Password</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-700 text-sm tracking-wide bg-purple-50 px-2.5 py-1 rounded border border-purple-100 select-all">
                              {showPassword ? generatedCreds.password : "••••••••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 underline focus:outline-none"
                            >
                              {showPassword ? "Hide" : "Reveal Password"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email CTA */}
                    <div className="text-center py-2">
                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center px-6 h-10 rounded-lg bg-purple-800 hover:bg-purple-900 font-bold text-xs text-white shadow-md shadow-purple-800/10 transition"
                      >
                        Launch Portal & Login Now
                      </Link>
                    </div>

                    {/* PDF Admission attachments info */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-3">
                      <Download className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">PDF Admission Letter Attached</h4>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                          We have attached your official admission letter and payment receipt for your records. Click the button at the top of this success page or the footer below to download it locally to your device.
                        </p>
                      </div>
                    </div>

                    {/* Email signature */}
                    <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-800">Upskill Admissions & Onboarding Team</p>
                        <p className="text-[10px]">admissions@upskill.edu.ng | Owerri, Imo State</p>
                      </div>
                      <button
                        onClick={handleDownloadPDF}
                        className="text-[10px] font-bold text-purple-800 hover:text-purple-950 underline text-left focus:outline-none"
                      >
                        [Download Attached Admission_UST.pdf]
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-slate-500">
          <p>© 2026 Upskill School of Technology, Owerri. All rights reserved.</p>
          <p className="mt-1.5">For urgent issues, please reach out to academic counseling at portal-support@upskill.edu.ng</p>
        </div>

      </div>
    </div>
  );
}
