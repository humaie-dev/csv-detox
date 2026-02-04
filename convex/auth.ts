import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Anonymous],
  jwt: {
    // Use CONVEX_URL instead of CONVEX_SITE_URL for JWT issuer
    // This ensures JWT issuer is .convex.cloud instead of .convex.site
    issuer: process.env.CONVEX_URL,
  },
});
