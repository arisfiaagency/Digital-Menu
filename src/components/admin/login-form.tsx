"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { signInAdmin } from "@/lib/firebase/auth";
import { hasFirebaseClientConfig } from "@/lib/firebase/client";
import { pulseAndFocusField } from "@/lib/utils/focus-invalid-field";
import {
  AdminPreferences,
  useAdminLocale,
} from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { BrandCredit } from "@/components/brand-credit";

export function LoginForm() {
  const router = useRouter();
  const { text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // Already signed in as approved staff → skip the login page and go straight to
  // the admin panel. AdminShell bounces employees without dashboard access to
  // their first allowed section.
  const alreadySignedIn = !auth.loading && auth.isAdmin;
  useEffect(() => {
    if (alreadySignedIn) router.replace("/admin/dashboard");
  }, [alreadySignedIn, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Validate in-app (site-styled inline errors) instead of the browser's
    // native "please fill out this field" bubble — the form is noValidate.
    const nextFieldErrors = {
      identifier: identifier.trim() ? undefined : text.requiredField,
      password: password ? undefined : text.requiredField,
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.identifier || nextFieldErrors.password) {
      const invalidId = nextFieldErrors.identifier ? "identifier" : "password";
      requestAnimationFrame(() => pulseAndFocusField(document.getElementById(invalidId)));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInAdmin(identifier, password);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? friendlyAuthError(err.message, text)
          : text.loginFailed,
      );
    } finally {
      setLoading(false);
    }
  }

  if (alreadySignedIn) {
    // Redirecting to the dashboard — show a login-shaped skeleton, not a text/spinner loader.
    return (
      <main dir="ltr" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main
      dir="ltr"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <Card className="w-full max-w-md" dir="ltr">
        <CardHeader>
          <AdminPreferences />
          <CardTitle dir={textDir}>{text.loginTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasFirebaseClientConfig() ? (
            <p
              dir={textDir}
              className="mb-4 rounded-md border border-accent bg-accent/15 p-3 text-sm">
              {text.missingFirebase}
            </p>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              label={text.usernameOrEmail}
              labelDir={textDir}
              htmlFor="identifier"
              error={fieldErrors.identifier}>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  if (fieldErrors.identifier)
                    setFieldErrors((prev) => ({
                      ...prev,
                      identifier: undefined,
                    }));
                }}
                required
              />
            </Field>
            <Field
              label={text.password}
              labelDir={textDir}
              htmlFor="password"
              error={fieldErrors.password}>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={text.showPassword}>
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </Field>
            {error ? (
              <p dir={textDir} className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={loading}>
              <span dir={textDir}>
                {loading ? text.signingIn : text.signIn}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>
      <BrandCredit />
    </main>
  );
}

function friendlyAuthError(
  message: string,
  text: ReturnType<typeof useAdminLocale>["text"],
) {
  if (message.includes("auth/invalid-credential"))
    return text.invalidCredential;
  if (message.includes("auth/too-many-requests")) return text.tooManyRequests;
  if (message.includes("not approved")) return message;
  if (message.includes("not configured")) return message;
  return text.authFailed;
}
