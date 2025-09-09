import { NextResponse } from "next/server";
import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings, qdrantClient } from "@/lib/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { LRUCache } from "lru-cache";

// Rate limiting setup
const windowMs = 60 * 60 * 1000; // 15 minutes
const maxRequests = 20;

const rateLimitCache = new LRUCache({
  max: 5000, 
  ttl: windowMs, 
});

function rateLimiter(userId) {
  const current = rateLimitCache.get(userId) || { count: 0, start: Date.now() };

  // Check if the window has expired
  if (Date.now() - current.start > windowMs) {
    // Reset the counter for a new window
    const newWindow = { count: 1, start: Date.now() };
    rateLimitCache.set(userId, newWindow);
    return {
      allowed: true,
      remaining: maxRequests - 1
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((windowMs - (Date.now() - current.start)) / 1000),
      remaining: 0
    };
  }

  current.count += 1;
  rateLimitCache.set(userId, current);
  return {
    allowed: true,
    remaining: maxRequests - current.count
  };
}

export async function POST(req) {
  try {
    const { query, userId, history = [] } = await req.json();

    if (!query || !userId) {
      return NextResponse.json({ error: "Query and userId are required" }, { status: 400 });
    }

    // Rate limiting check
    const { allowed, retryAfter, remaining } = rateLimiter(userId);

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          remaining: 0
        },
        { status: 429 }
      );
    }

    const collectionName = `${userId}_collection`;

    // 1. Retrieve relevant chunks from Qdrant
    const vectorStore = new QdrantVectorStore(embeddings, {
      client: qdrantClient,
      collectionName,
    });
    
    const retriever = vectorStore.asRetriever({ k: 3 });
    const relevantChunks = await retriever.invoke(query);

    // 2. System prompt
    const SYSTEM_PROMPT = `
      You are an AI assistant who answers only using the provided context 
      from PDF documents. If the answer is not in the context, say 
      "I don't know from the documents."

      Context:
      ${relevantChunks.map(chunk => chunk.pageContent).join('\n\n')}
    `;

    // 3. Trim last 10 messages (if more provided)
    const lastMessages = history.slice(-10);

    // 4. Build messages array
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...lastMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: query },
    ];

    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    });

    // 6. Get response
    const response = await model.invoke(messages);

    return NextResponse.json({
      answer: response.content,
      context: relevantChunks,
      messages: [...lastMessages, { role: "user", content: query }, { role: "assistant", content: response.content }],
      remaining: remaining
    });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}