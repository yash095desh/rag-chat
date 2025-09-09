"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, saveWithExpiry } from "@/lib/utils";
import { Upload, Link, FileText, X, Loader2, ImageIcon, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { toast } from "sonner";

export default function Sidebar({ uploads, setUploads }) {
  const { user } = useUser();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  // modal states
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);

  // loading states
  const [isUrlSubmitting, setIsUrlSubmitting] = useState(false);
  const [isTextSubmitting, setIsTextSubmitting] = useState(false);
  const [deleting, setDeleting] = useState({}); // {docId: true}

  // =========================
  // HANDLE DELETE
  // =========================
  const handleDelete = async (docId) => {
    setDeleting((prev) => ({ ...prev, [docId]: true }));
    try {
      await axios.post("/api/delete-doc", { userId: user.id, docId });

      const newUploads = uploads.filter((item) => item.docId !== docId);
      setUploads(newUploads);
      saveWithExpiry("uploads", newUploads, 2 * 24 * 60 * 60 * 1000);
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error("Delete failed", { description: err.message });
    } finally {
      setDeleting((prev) => ({ ...prev, [docId]: false }));
    }
  };

  // =========================
  // HANDLE DROP / UPLOAD PDF
  // =========================
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0]; // only one file

    if (!file || file.type !== "application/pdf") {
      toast.error("Upload failed", {
        description: "Only PDF files are allowed!",
      });
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.id);

      const { data } = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const docId = data.docId || "";
      const newUpload = [
        ...uploads,
        {
          type: "pdf",
          name: file.name,
          uploadedAt: new Date().toLocaleString(),
          docId,
        },
      ];

      toast.success("Upload successful", {
        description: `${file.name} uploaded successfully.`,
      });

      await setUploads(newUpload);
      saveWithExpiry("uploads", newUpload, 2 * 24 * 60 * 60 * 1000);
    } catch (err) {
      console.error("Error uploading PDF:", err);
      toast({
        variant: "destructive",
        title: "Upload error",
        description: "Something went wrong while uploading.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleDrop({
      preventDefault: () => {},
      dataTransfer: { files: [file] },
    });
  };

  // =========================
  // HANDLE IMAGE DROP / UPLOAD
  // =========================
  const handleImageDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0]; // only one file

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!file || !allowedTypes.includes(file.type)) {
      toast.error("Upload failed", {
        description: "Only image files (JPEG, PNG, GIF, WebP) are allowed!",
      });
      return;
    }

    try {
      setIsImageUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.id);

      const { data } = await axios.post("/api/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const docId = data.docId || "";
      const newUpload = [
        ...uploads,
        {
          type: "image",
          name: file.name,
          uploadedAt: new Date().toLocaleString(),
          docId,
          extractedTextLength: data.extractedTextLength,
          chunksCreated: data.chunksCreated,
        },
      ];

      toast.success("Image processed successfully", {
        description: `${file.name} processed and ${data.chunksCreated} chunks created.`,
      });

      await setUploads(newUpload);
      saveWithExpiry("uploads", newUpload, 2 * 24 * 60 * 60 * 1000);
    } catch (err) {
      console.error("Error uploading image:", err);
      toast({
        variant: "destructive",
        title: "Upload error",
        description: err.response?.data?.error || "Something went wrong while processing the image.",
      });
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleImageDrop({
      preventDefault: () => {},
      dataTransfer: { files: [file] },
    });
  };

  // =========================
  // HANDLE URL SUBMIT
  // =========================
  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    setIsUrlSubmitting(true);
    try {
      const { data } = await axios.post("/api/web-ingest", {
        url,
        userId: user.id,
      });

      const docId = data?.docId;
      const newUpload = [
        ...uploads,
        {
          type: "url",
          name: url,
          uploadedAt: new Date().toLocaleString(),
          docId,
        },
      ];

      setUploads(newUpload);
      saveWithExpiry("uploads", newUpload, 2 * 24 * 60 * 60 * 1000);

      setUrl("");
      setUrlModalOpen(false);

      toast.success("URL Indexed", {
        description: `${data.documents} documents (${data.chunks} chunks) saved for ${url}`,
      });
    } catch (err) {
      toast.error("URL Indexing Failed", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsUrlSubmitting(false);
    }
  };

  // =========================
  // HANDLE TEXT SUBMIT
  // =========================
  const handleTextSubmit = async () => {
    if (!text.trim()) return;

    setIsTextSubmitting(true);
    try {
      const { data } = await axios.post("/api/ingest-text", {
        text,
        userId: user.id,
      });

      const docId = data?.docId;
      const newUpload = [
        ...uploads,
        {
          type: "text",
          name: text.substring(0, 30) + "...",
          uploadedAt: new Date().toLocaleString(),
          docId,
        },
      ];

      setUploads(newUpload);
      saveWithExpiry("uploads", newUpload, 2 * 24 * 60 * 60 * 1000);

      setText("");
      setTextModalOpen(false);

      toast.success("Text added", {
        description: "Your note has been saved & embedded successfully.",
      });
    } catch (err) {
      console.error("Text upload error:", err);
      toast.error("Upload failed", {
        description: err.response?.data?.error || err.message,
      });
    } finally {
      setIsTextSubmitting(false);
    }
  };

  // Helper function to get icon by type
  const getTypeIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-blue-500" />;
      case "url":
        return <Link className="h-4 w-4 text-green-500" />;
      case "text":
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    console.log("User", user);
  }, [user]);

  return (
    <aside
      className={cn(
        "w-80 h-full shrink-0 flex flex-col p-4 space-y-4",
        "bg-sidebar dark:bg-sidebar text-foreground"
      )}
    >
      {/* Uploaded items preview */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent Uploads ({uploads.length})
          </h2>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {uploads.map((item, i) => (
              <div
                key={item.docId || i}
                className="group flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getTypeIcon(item.type)}
                  <span className="truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(item.docId)}
                  className="ml-2 transition flex-shrink-0"
                  disabled={deleting[item.docId]}
                >
                  {deleting[item.docId] ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  )}
                </button>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
        </div>
      )}

      {/* PDF Drag & Drop + Browse Upload */}
      <Card
        className="relative border-dashed border-2 flex items-center justify-center h-32 cursor-pointer transition hover:border-primary"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
          <Upload className="h-7 w-7 mb-2" />
          <span className="text-sm font-medium">Upload PDF Documents</span>
          <span className="text-xs text-muted-foreground">
            {isUploading ? "Uploading..." : "Drag & drop or click to browse"}
          </span>
        </CardContent>
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
      </Card>

      {/* Image/Invoice Drag & Drop + Browse Upload */}
      <Card
        className="relative border-dashed border-2 border-blue-200 flex items-center justify-center h-32 cursor-pointer transition hover:border-blue-400"
        onDrop={handleImageDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => imageInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
          <Receipt className="h-7 w-7 mb-2 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">Upload Images/Invoices</span>
          <span className="text-xs text-muted-foreground">
            {isImageUploading ? "Processing..." : "JPEG, PNG, GIF, WebP supported"}
          </span>
        </CardContent>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          ref={imageInputRef}
          onChange={handleImageSelect}
          className="hidden"
        />
      </Card>

      {/* Modal for URL Upload */}
      <Dialog open={urlModalOpen} onOpenChange={setUrlModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full flex items-center gap-2">
            <Link className="h-4 w-4" /> Upload URL
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload a URL</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handleUrlSubmit} disabled={isUrlSubmitting}>
              {isUrlSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal for Text Upload */}
      <Dialog open={textModalOpen} onOpenChange={setTextModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full flex items-center gap-2">
            <FileText className="h-4 w-4" /> Upload Text
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Text</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Paste or write your content..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] w-full max-w-md"
            />
            <Button onClick={handleTextSubmit} disabled={isTextSubmitting}>
              {isTextSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}