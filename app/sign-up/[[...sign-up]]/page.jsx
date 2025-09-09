"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) router.push("/chat");
  }, [isSignedIn, router]);

  return (
    <div className="flex items-center justify-center min-h-screen min-w-full">
      <SignUp/>
    </div>
  );
}
