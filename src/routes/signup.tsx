import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Mail, User, GraduationCap, Briefcase } from "lucide-react";
import { onSnapshot } from "firebase/firestore";
import { programsCollection } from "@/lib/db/collections";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { SocialButton } from "@/components/auth/SocialButton";
import { Divider } from "@/components/auth/Divider";
import { InlineAlert } from "@/components/auth/Alert";
import { authApi } from "@/lib/auth-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — LumenEd" },
      { name: "description", content: "Join LumenEd as a student or instructor." },
    ],
  }),
  component: SignupPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[0-9]/, "Add a number"),
  role: z.enum(["student", "instructor"]),
  age: z.string().optional().refine(val => !val || !isNaN(Number(val)), "Age must be a number"),
  gender: z.string().optional(),
  interestedCourse: z.string().optional(),
  phoneNumber: z.string().optional(),
  nextOfKin: z.string().optional(),
  nextOfKinPhoneNumber: z.string().optional(),
  address: z.string().optional(),
  terms: z.boolean().refine((v) => v === true, { message: "You must accept the terms" }),
});
type FormData = z.infer<typeof schema>;

function SignupPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [programs, setPrograms] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(programsCollection, (snap) => {
      setPrograms(snap.docs.map(d => ({ id: d.id, title: (d.data() as any).title || "Untitled" })));
    });
    return () => unsub();
  }, []);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { role: "student" },
  });

  const watchRole = watch("role");
  const password = watch("password") ?? "";

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await authApi.signup({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
        age: data.age ? Number(data.age) : undefined,
        gender: data.gender,
        interestedCourse: data.interestedCourse,
        phoneNumber: data.phoneNumber,
        nextOfKin: data.nextOfKin,
        nextOfKinPhoneNumber: data.nextOfKinPhoneNumber,
        address: data.address,
      });
      
      navigate({ to: "/verify-email", search: { email: data.email } });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const { user } = await authApi.google();
      navigate({ to: authApi.getDashboardRoute(user.role) });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Google sign up failed");
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start learning or teaching on LumenEd today."
      footer={
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <InlineAlert variant="error" message={serverError} />}

        {/* Role selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">I'm joining as a</label>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              icon={<GraduationCap className="h-5 w-5" />}
              label="Student"
              description="Take courses"
              selected={watchRole === "student"}
              onClick={() => setValue("role", "student", { shouldValidate: true })}
            />
            <RoleCard
              icon={<Briefcase className="h-5 w-5" />}
              label="Instructor"
              description="Teach courses"
              selected={watchRole === "instructor"}
              onClick={() => setValue("role", "instructor", { shouldValidate: true })}
            />
          </div>
        </div>

        <FormField
          label="Full name"
          placeholder="Ada Lovelace"
          autoComplete="name"
          icon={<User className="h-4 w-4" />}
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <FormField
          label="Email address"
          type="email"
          placeholder="you@university.edu"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />

        {(watchRole === "student" || watchRole === "instructor") && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4 pt-2 border-t border-border mt-4"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Student Information</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Age"
                type="number"
                placeholder="18"
                error={errors.age?.message}
                {...register("age")}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Gender</label>
                <select 
                  className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register("gender")}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <FormField
              label={watchRole === "student" ? "Course/Skill Interested In" : "Course/Skill You Will Teach"}
              placeholder="e.g. Data Science, Web Dev"
              error={errors.interestedCourse?.message}
              {...register("interestedCourse")}
            />

            <FormField
              label="Resident Address"
              placeholder="123 Street Name, City"
              error={errors.address?.message}
              {...register("address")}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Phone Number"
                placeholder="+234..."
                error={errors.phoneNumber?.message}
                {...register("phoneNumber")}
              />
              <FormField
                label="Next of Kin Name"
                placeholder="Name of relative"
                error={errors.nextOfKin?.message}
                {...register("nextOfKin")}
              />
              <FormField
                label="Next of Kin Phone"
                placeholder="+234..."
                error={errors.nextOfKinPhoneNumber?.message}
                {...register("nextOfKinPhoneNumber")}
              />
            </div>
          </motion.div>
        )}

        <PasswordField
          autoComplete="new-password"
          placeholder="Create a strong password"
          showStrength
          value={password}
          error={errors.password?.message}
          {...register("password")}
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            {...register("terms")}
          />
          <span>
            I agree to the{" "}
            <a href="#" className="font-medium text-primary hover:underline">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>.
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs font-medium text-destructive">{errors.terms.message}</p>
        )}

        <SubmitButton type="submit" loading={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </SubmitButton>

        <Divider />
        <SocialButton
          provider="google"
          onClick={handleGoogle}
          disabled={loadingGoogle}
        />
      </form>
    </AuthLayout>
  );
}

function RoleCard({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        selected
          ? "border-primary bg-accent/40 shadow-soft"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          selected ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <span className="mt-1 font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
