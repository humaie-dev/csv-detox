
import type { ReactNode } from "react";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (

    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body>
          <Providers>{children}</Providers>
          <Toaster />
        </body>
      </html>

    </ConvexAuthNextjsServerProvider>
  );
}
