import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { compile } from "html-to-text";
import { qdrantClient, embeddings } from "@/lib/langchain";
import { v4 as uuid } from "uuid";

export async function POST(req) {
  try {
    console.log("🌐 Web indexing route called");

    const { url, userId } = await req.json();

    if (!url || !userId) {
      return NextResponse.json(
        { error: "URL and userId are required" },
        { status: 400 }
      );
    }

    // 1. Use html-to-text for cleaner extraction
    const compiledConvert = compile({ wordwrap: 130 });

    // 2. Load website content (depth 3 for crawling subpages)
    const loader = new RecursiveUrlLoader(url, {
      maxDepth: 3,
      extractor: compiledConvert,
    });

    const docId = uuid();

    const docs = await loader.load();
    const docsWithMeta = docs.map((d) => ({
      pageContent: d.pageContent,
      metadata: {
        userId,
        docId,
        name: url,
        type: "url",
        source: d.metadata.source,
      },
    }));
    console.log(` Loaded ${docsWithMeta.length} documents from ${url}`);

    if (!docs.length) {
      return NextResponse.json(
        { error: "No documents found to index" },
        { status: 404 }
      );
    }

    // 3. Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docsWithMeta);

    // 4. Store in Qdrant
    const collectionName = `${userId}_collection`;

    //  Ensure collection exists
    try {
      await qdrantClient.getCollection(collectionName);
    } catch {
      await qdrantClient.createCollection(collectionName, {
        vectors: { size: 768, distance: "Cosine" },
      });
    }

    // Ensure index for metadata.docId (needed for filtering/deleting later)
    try {
      await qdrantClient.createPayloadIndex(collectionName, {
        field_name: "docId",
        field_schema: "keyword", // or "uuid" if docId always UUID
      });
    } catch (err) {
      if (err?.response?.status !== 409) {
        console.error("Failed to create index:", err);
      }
    }

    await QdrantVectorStore.fromDocuments(chunks, embeddings, {
      client: qdrantClient,
      collectionName,
    });

    return NextResponse.json({
      message: `Successfully indexed ${url} for user ${userId}`,
      docId,
      collection: collectionName,
      documents: docs.length,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error(" Web indexing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
