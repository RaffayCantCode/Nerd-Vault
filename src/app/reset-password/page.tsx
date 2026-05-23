import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="container auth-screen">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
