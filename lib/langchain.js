import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAIEmbeddings } from "@langchain/openai";

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-ada-002", 
  apiKey: process.env.OPENAI_API_KEY,
});
