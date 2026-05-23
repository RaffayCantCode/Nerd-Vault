import { SiteHeader } from "@/components/site-header";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="container auth-screen">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
