import { NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { v4 as uuid } from "uuid";
import { embeddings, qdrantClient } from "@/lib/langchain";
import fs from "fs";
import path from "path";
import os from "os"; // Import os to get tmp directory

export async function POST(req) {
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use the system's tmp directory
    const tmpDir = path.join(os.tmpdir(), "uploads");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const filePath = path.join(tmpDir, file.name);
    fs.writeFileSync(filePath, buffer);

    const loader = new PDFLoader(filePath);

    const docId = uuid();
    const docs = await loader.load();
    const docsWithMeta = docs.map((d) => ({
      pageContent: d.pageContent,
      metadata: {
        userId,
        docId,
        name: file.name,
        type: "pdf",
        source: file.name,
      },
    }));

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docsWithMeta);

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

    // Cleanup the uploaded file
    fs.unlinkSync(filePath);

    return NextResponse.json({
      message: "PDF uploaded successfully!",
      docId,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
