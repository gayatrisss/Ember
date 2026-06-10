"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const ease = [0.4, 0, 0.2, 1] as const;

export function AuthButton({ email, name }: { email: string | null; name: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

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

  if (!email) {
    return (
      <button
        onClick={signIn}
        className="bg-ember text-wax rounded-lg p-4 text-body font-medium hover:brightness-110"
      >
        Log in
      </button>
    );
  }

  const firstName = name?.split(" ")[0] ?? email.split("@")[0];
  const initial = (name ?? email)[0].toUpperCase();

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-3 p-4 ${open ? "rounded-t-xl" : "rounded-xl"}`}
      >
        <Avatar initial={initial} />
        <span className="hidden md:block text-body text-wax">{firstName}</span>
        <ChevronDown size={24} className="text-wax" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease }}
            className="absolute top-full left-0 right-0 rounded-b-xl px-4 pb-4 whitespace-nowrap w-full"
          >
            <div className="bg-ash p-3 rounded-xl">
              <button
                onClick={signOut}
                className="flex items-center gap-3 text-body text-wax hover:text-ember transition-colors w-full"
              >
                <LogOut size={24} />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ initial }: { initial: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-smoke flex items-center justify-center shrink-0">
      <span className="text-body text-wax">{initial}</span>
    </div>
  );
}
