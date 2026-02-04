"use client";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL!
  );

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
};