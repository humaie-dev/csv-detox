"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";
import { SignInForm } from "@/components/SignInForm";
import { UserMenu } from "@/components/UserMenu";

function HomePageContent() {
  const router = useRouter();
  const pipelines = useQuery(api.pipelines.listAll);

  useEffect(() => {
    // Redirect to first pipeline if any exist
    if (pipelines && pipelines.length > 0) {
      router.push(`/pipeline/${pipelines[0]._id}`);
    }
  }, [pipelines, router]);

  // Loading state
  if (pipelines === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Spinner className="size-5" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If pipelines exist, show loading while redirecting
  if (pipelines.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Spinner className="size-5" />
          <p className="text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  // No pipelines exist - show create button
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with UserMenu */}
      <div className="flex-shrink-0 border-b px-8 py-4">
        <div className="flex justify-end">
          <UserMenu />
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center flex-1 p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome to CSV Detox</CardTitle>
            <CardDescription>
              Create your first pipeline to start transforming data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/create-pipeline")}
              size="lg"
              className="w-full"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Spinner className="size-5" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <HomePageContent />
      </Authenticated>
    </>
  );
}
