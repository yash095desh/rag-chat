import { NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { v4 as uuid } from "uuid";
import { embeddings, qdrantClient } from "@/lib/langchain";
import fs from "fs";
import path from "path";

export async function POST(req) {
  let tempFilePath = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a PDF file" 
      }, { status: 400 });
    }

    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB" 
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create temporary file in /tmp (which is writable on Vercel)
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name}`;
    tempFilePath = path.join("/tmp", uniqueFileName);
    
    // Write to /tmp directory which is available on Vercel
    fs.writeFileSync(tempFilePath, buffer);

    // Load PDF
    const loader = new PDFLoader(tempFilePath);
    const docId = uuid();
    
    try {
      const docs = await loader.load();
      
      if (!docs || docs.length === 0) {
        throw new Error("No content could be extracted from the PDF");
      }

      const docsWithMeta = docs.map((d) => ({
        pageContent: d.pageContent,
        metadata: {
          userId,
          docId,
          name: file.name,
          type: "pdf",
          source: file.name,
          uploadedAt: new Date().toISOString(),
          fileSize: buffer.length,
          pageCount: docs.length,
        },
      }));

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.splitDocuments(docsWithMeta);

      if (chunks.length === 0) {
        throw new Error("No text chunks could be created from the PDF");
      }

      const collectionName = `${userId}_collection`;

      // Ensure collection exists
      try {
        await qdrantClient.getCollection(collectionName);
      } catch {
        await qdrantClient.createCollection(collectionName, {
          vectors: { size: 1536, distance: "Cosine" },
        });
      }

      // Create index for metadata.docId
      try {
        await qdrantClient.createPayloadIndex(collectionName, {
          field_name: "docId",
          field_schema: "keyword",
        });
      } catch (err) {
        if (err?.response?.status !== 409) {
          console.error("Failed to create index:", err);
        }
      }

      // Insert chunks into Qdrant
      await QdrantVectorStore.fromDocuments(chunks, embeddings, {
        client: qdrantClient,
        collectionName,
      });

      return NextResponse.json({
        message: "PDF uploaded and processed successfully!",
        docId,
        pageCount: docs.length,
        chunksCreated: chunks.length,
        textLength: docsWithMeta.reduce((acc, doc) => acc + doc.pageContent.length, 0),
      });

    } catch (processingError) {
      console.error("PDF processing error:", processingError);
      throw new Error(`Failed to process PDF: ${processingError.message}`);
    }

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to process PDF upload" 
    }, { status: 500 });
  } finally {
    // Always cleanup the temporary file
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error("Failed to clean up temporary file:", cleanupError);
        // Don't throw here as the main operation might have succeeded
      }
    }
  }
}