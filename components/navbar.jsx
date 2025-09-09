"use client"

import { UserButton } from "@clerk/nextjs"
import { ThemeToggle } from "@/components/theme-toggle"
import { MessageSquare } from "lucide-react"

export default function Navbar({ remaining }) {
  return (
    <header className="w-full border-b bg-sidebar dark:bg-sidebar backdrop-blur-sm shadow-md">
      <div className="mx-auto max-w-screen-2xl px-6 h-16 flex items-center justify-between">
        
        {/* Project name */}
        <div className="text-xl font-bold tracking-wide text-foreground dark:text-foreground">
          RAG Chat
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Simple requests counter with icon */}
          {remaining !== null && remaining !== undefined && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{remaining}</span>
            </div>
          )}
          
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
      
      {/* Glow effect bottom border */}
      <div className="h-[1px] w-full bg-ring dark:bg-ring shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
    </header>
  )
}