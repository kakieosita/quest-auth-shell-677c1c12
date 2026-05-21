import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { SocialButton } from "@/components/auth/SocialButton";
import { Divider } from "@/components/auth/Divider";
import { InlineAlert } from "@/components/auth/Alert";
import { authApi } from "@/lib/auth-api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LumenEd" },
      { name: "description", content: "Sign in to your LumenEd learning account." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const { user } = await authApi.login({ email: data.email, password: data.password });
      navigate({ to: authApi.getDashboardRoute(user.role) });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setServerError(null);
    try {
      const { user } = await authApi.google();
      navigate({ to: authApi.getDashboardRoute(user.role) });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Google sign in failed");
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to keep learning where you left off."
      footer={
        <span className="text-muted-foreground">
          New to UST?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <InlineAlert variant="error" message={serverError} />}

        <FormField
          label="Email address"
          type="email"
          placeholder="you@university.edu"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordField
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          value={watch("password") ?? ""}
          {...register("password")}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
              {...register("remember")}
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton type="submit" loading={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </SubmitButton>

        <Divider />

        <SocialButton
          provider="google"
          onClick={handleGoogle}
          disabled={loadingGoogle}
        />
      </form>

      {/* Paystack Enrolled Student Banner */}
      <div className="bg-purple-950/20 rounded-xl border border-purple-500/20 p-4 mt-4 text-left shadow-soft flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-200">Newly Enrolled via Paystack?</h4>
          <p className="text-[10px] text-slate-400 leading-normal">
            Use the <span className="font-semibold text-slate-200">Student Reg. No (or Email)</span> and the generated <span className="font-semibold text-slate-200">Password</span> sent to your email simulation box to sign in immediately.
          </p>
        </div>
      </div>

      {/* Cross-portal links */}
      <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 space-y-2">
        <p className="text-xs text-center font-medium text-muted-foreground uppercase tracking-wide">Other portals</p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link
            to="/alumni/login"
            className="font-medium text-primary hover:underline"
          >
            Alumni Portal
          </Link>
          <span className="text-border">·</span>
          <Link
            to="/partner/login"
            className="font-medium text-primary hover:underline"
          >
            Partner Portal
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
