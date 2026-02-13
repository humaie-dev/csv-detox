"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to projects page
    router.push("/projects");
  }, [router]);

  // Show nothing while redirecting
  return null;
}
