import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "langchain/document";
import { qdrantClient, embeddings } from "@/lib/langchain";
import { v4 as uuid } from "uuid";

export async function POST(req) {
  try {
    console.log(" Text upload route called");

    const { text, userId } = await req.json();

    if (!text || !userId) {
      return NextResponse.json(
        { error: " Missing text or userId" },
        { status: 400 }
      );
    }

    const docId = uuid();
    const docs = [
      new Document({
        pageContent: text,
        metadata: {
          userId,
          name: text.substring(0, 30) + "...",
          docId,
          type: "text",
          source: "manual-upload",
        },
      }),
    ];

    // 1. Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docs);

    const collectionName = `${userId}_collection`;

    //  Ensure collection exists
    try {
      await qdrantClient.getCollection(collectionName);
    } catch {
      await qdrantClient.createCollection(collectionName, {
        vectors: { size: 1536, distance: "Cosine" },
      });
    }

    //  Ensure index for metadata.docId
    try {
      await qdrantClient.createPayloadIndex(collectionName, {
        field_name: "metadata.docId",
        field_schema: "keyword", // or "uuid"
      });
    } catch (err) {
      if (err?.response?.status !== 409) {
        console.error("Failed to create index:", err);
      }
    }

    //  Insert into Qdrant
    await QdrantVectorStore.fromDocuments(chunks, embeddings, {
      client: qdrantClient,
      collectionName,
    });

    return NextResponse.json({
      message: " Text uploaded and embedded successfully!",
      docId,
    });
  } catch (err) {
    console.error(" Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
