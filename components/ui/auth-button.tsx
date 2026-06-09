"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function AuthButton({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    });
  }

  if (email) {
    return (
      <div className="flex items-center gap-4">
        <span className="hidden md:block text-label text-smoke">{email}</span>
        <button onClick={signOut} className="text-body text-wax/60 hover:text-wax">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button onClick={signIn} className="bg-ember text-wax rounded-lg px-6 py-3 text-body hover:brightness-110">
      Log in
    </button>
  );
}
