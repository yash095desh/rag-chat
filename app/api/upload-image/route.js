import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { v4 as uuid } from "uuid";
import { embeddings, qdrantClient } from "@/lib/langchain";
import { OpenAI } from "openai";

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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload an image file (JPEG, PNG, GIF, WebP)" 
      }, { status: 400 });
    }

    // Convert file to buffer - no filesystem operations needed
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const docId = uuid();

    try {
      // Extract text from image using GPT-4 Vision
      // Pass the buffer directly along with the MIME type
      const extractedText = await extractTextFromImageOpenAI(buffer, file.type);

      if (!extractedText.trim()) {
        return NextResponse.json({ 
          error: "No text could be extracted from the image" 
        }, { status: 400 });
      }

      const docsWithMeta = [{
        pageContent: extractedText,
        metadata: {
          userId,
          docId,
          name: file.name,
          type: "image",
          source: file.name,
          extractedAt: new Date().toISOString(),
          fileSize: buffer.length,
          mimeType: file.type,
        },
      }];

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.splitDocuments(docsWithMeta);

      const collectionName = `${userId}_collection`;

      try {
        await qdrantClient.getCollection(collectionName);
      } catch {
        await qdrantClient.createCollection(collectionName, {
          vectors: { size: 1536, distance: "Cosine" },
        });
      }

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

      await QdrantVectorStore.fromDocuments(chunks, embeddings, {
        client: qdrantClient,
        collectionName,
      });

      return NextResponse.json({
        message: "Image uploaded and processed successfully!",
        docId,
        extractedTextLength: extractedText.length,
        chunksCreated: chunks.length,
      });

    } catch (error) {
      console.error("Processing error:", error);
      return NextResponse.json({ 
        error: error.message || "Failed to process image" 
      }, { status: 500 });
    }

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function extractTextFromImageOpenAI(buffer, mimeType) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text and data from this invoice/document image. Please provide a comprehensive extraction that includes:

1. Company/Business Information (names, addresses, contact details)
2. Invoice Details (invoice number, date, due date)
3. Customer/Client Information
4. Line Items (products/services, quantities, rates, amounts)
5. Totals (subtotal, tax, total amount)
6. Payment Information (if any)
7. Any other relevant text or data

Format the extracted text in a clear, structured way that preserves the document's information hierarchy. If this is not an invoice, extract all visible text maintaining its context and structure.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${buffer.toString('base64')}`
              }
            }
          ],
        },
      ],
      max_tokens: 4096,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI Vision Error:", error);

    if (error.code === 'insufficient_quota') {
      throw new Error("OpenAI API quota exceeded. Please check your billing.");
    } else if (error.code === 'invalid_api_key') {
      throw new Error("Invalid OpenAI API key. Please check your configuration.");
    } else if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }
}