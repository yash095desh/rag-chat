"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, User, Send, FileText, Upload, MessageCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { toast } from "sonner";

// Empty State Component
const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center">
      <div className="flex flex-col items-center space-y-6 max-w-md">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30">
            <FileText size={32} className="text-muted-foreground/60" />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            No Documents Uploaded
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Upload your documents first to start chatting with them. I'll be ready to answer questions and help you explore your content once you've added some files.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-muted-foreground/20">
          <MessageCircle size={16} className="text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/60 font-medium">
            Chat will appear here
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ChatUI({ uploads, remaining, setRemaining }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([
    {
      id: "init",
      role: "assistant",
      content:
        "👋 Hello! I can help answer your questions based on your uploaded documents. Try asking me something!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasUploads = uploads && uploads.length > 0;

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const newMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/chat", {
        query: input,
        userId: user.id,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      if (data.remaining !== undefined) {
        setRemaining(data.remaining);
      }

      const assistantMessage = {
        id: Date.now().toString() + "-ai",
        role: "assistant",
        content: data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat API error:", err);
      const errorMsg = err.response?.data?.error || err.message;
      const remainingCount = err.response?.data?.remaining;

      if (remainingCount !== undefined) {
        setRemaining(remainingCount);
      }

      toast({
        title: "Chat failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!hasUploads) {
    return (
      <div className="h-full w-full border rounded-xl bg-background shadow-md">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[82vh] w-full border rounded-xl bg-background shadow-md">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-start gap-2",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Bot size={16} />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted rounded-bl-none"
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot size={16} />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Chat input"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="flex items-center gap-1"
          >
            <Send size={16} /> Send
          </Button>
        </div>

        {/* Remaining requests info */}
        {remaining !== null && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Remaining requests: {remaining}
          </div>
        )}
      </div>
    </div>
  );
}
