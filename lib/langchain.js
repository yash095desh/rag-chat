import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL ,
    apiKey:process.env.QDRANT_API_KEY,
});
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/embedding-001",
  apiKey: process.env.GOOGLE_API_KEY,
  dimensions: 1536,
});

