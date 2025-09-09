"use client";

import ChatUI from "@/components/chat-ui";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { getWithExpiry } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChatDashboard() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [uploads, setUploads] = useState([]);
  const [remaining, setRemaining] = useState(null); 
  const router = useRouter();

  useEffect(() => {
  const storedUploads = getWithExpiry("uploads");
    if (storedUploads) setUploads(storedUploads);
  }, []);


  useEffect(() => {
    if (!isLoaded) return; 
    if (!isSignedIn) {
      router.push("/sign-up");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <div className=" flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-foreground dark:text-foreground"/>
    </div>; 
  }

  return (
    <div className="flex flex-col h-screen min-w-full">
      <Navbar remaining={remaining}/>
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar uploads={uploads} setUploads={setUploads} />

        {/* Chat Area */}
        <main className="flex-1 p-4">
          <ChatUI uploads={uploads} remaining={remaining} setRemaining={setRemaining}/>
        </main>
      </div>
    </div>
  );
}




