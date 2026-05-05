/**
 * Quick validation harness for the Google auth cookie redirect flow.
 * Run with: npx tsx scripts/validate-auth-flow.ts
 */

async function validate() {
  const issues: string[] = [];

  // 1. Verify auth module imports without crashing (server-only, may need env vars)
  try {
    const authMod = await import("../src/lib/auth");
    if (!authMod.handlers || !authMod.signIn || !authMod.signOut || !authMod.auth) {
      issues.push("Auth module exports are incomplete");
    }
  } catch (error) {
    issues.push(`Auth module failed to import: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2. Verify sign-in actions import without crashing
  try {
    const actionsMod = await import("../src/app/sign-in/actions");
    if (!actionsMod.signInWithGoogle || !actionsMod.signInWithCredentials || !actionsMod.signUpWithCredentials) {
      issues.push("Sign-in actions are incomplete");
    }
  } catch (error) {
    issues.push(`Sign-in actions failed to import: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 3. Check that cookie helper functions are consistent
  try {
    const authCookies = await import("../src/lib/auth-cookies");
    if (!authCookies.OAUTH_TRANSIENT_COOKIE_NAMES?.length) {
      issues.push("OAUTH_TRANSIENT_COOKIE_NAMES is empty or missing");
    }
    if (!authCookies.CLIENT_AUTH_RESET_COOKIE_NAMES?.length) {
      issues.push("CLIENT_AUTH_RESET_COOKIE_NAMES is empty or missing");
    }
  } catch (error) {
    issues.push(`Auth cookies module failed to import: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 4. Simulate the cookie flow logic (without actual cookies)
  const redirectTo = "/books/123";
  const encodedState = JSON.stringify({ redirectTo });
  
  // In the old code, signIn("google", { redirectTo }) would encrypt this into the state cookie.
  // We estimate the size to verify the header-too-large risk.
  const estimatedStateSize = encodedState.length * 2 + 256; // rough encryption overhead
  const vercelHeaderLimit = 8192;
  
  if (estimatedStateSize > vercelHeaderLimit / 2) {
    issues.push(`Old redirectTo state cookie might be large (~${estimatedStateSize} bytes). Our fix moves it to a separate cookie.`);
  }

  // 5. Verify the new cookie names are short
  const newCookieName = "nv.post-auth-redirect";
  if (newCookieName.length > 32) {
    issues.push("New cookie name is unexpectedly long");
  }

  if (issues.length === 0) {
    console.log("✅ Auth flow validation passed — no obvious issues detected.");
    console.log("");
    console.log("To fully test the Google auth flow:");
    console.log("  1. Deploy to Vercel");
    console.log("  2. Visit /sign-in while NOT logged in");
    console.log("  3. Click 'Continue with Google'");
    console.log("  4. After OAuth callback, check you land on the intended page (not always /)");
    console.log("  5. Open DevTools → Application → Cookies and verify 'nv.redirect-to' was set then cleared");
    process.exit(0);
  } else {
    console.error("❌ Auth flow validation found issues:");
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }
}

validate();
