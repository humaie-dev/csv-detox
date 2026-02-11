"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to projects page
    router.push("/projects");
  }, [router]);

  // Show nothing while redirecting
  return null;
}
