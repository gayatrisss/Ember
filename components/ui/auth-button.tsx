"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (email) {
    return (
      <div className="flex items-center gap-4">
        <span className="hidden md:block text-label text-smoke">{email}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-body text-wax/60 hover:text-wax"
        >
          Sign out
        </button>
      </div>
    );
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    });
  }

  return (
    <button
      onClick={signIn}
      className="bg-ember text-wax rounded-lg px-6 py-3 text-body hover:brightness-110"
    >
      Log in
    </button>
  );
}
