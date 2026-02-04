"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn("anonymous");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Sign in failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [step, setStep] = useState<"signUp" | "signIn">("signIn");


  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Welcome to CSV Detox</CardTitle>
          <CardDescription>
            Sign in to start transforming your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 border border-destructive bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              void signIn("password", formData);
            }}
          >
            <input name="email" placeholder="Email" type="text" />
            <input name="password" placeholder="Password" type="password" />
            <input name="flow" type="hidden" value={step} />
            <Button
              type="submit"
              onClick={() => {
                setStep(step === "signIn" ? "signUp" : "signIn");
              }}
            >

              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}

              {step === "signIn" ? "Sign up instead" : "Sign in instead"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
