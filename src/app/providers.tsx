"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not defined");
  }
  const convex = new ConvexReactClient(convexUrl);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};
