"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/manager/logout", { method: "POST" });
        router.refresh();
      }}
      className="text-sm text-foreground/60 underline hover:text-coral"
    >
      Sign out
    </button>
  );
}
