import { NextResponse } from "next/server";
import { qdrantClient } from "@/lib/langchain";

// Add this temporary route at app/api/debug-collection/route.js
export async function POST(req) {
  const { userId } = await req.json();
  const collectionName = `${userId}_collection`;
  
  try {
    const points = await qdrantClient.scroll(collectionName, {
      limit: 5,
      with_payload: true,
    });
    
    console.log("Sample points:", JSON.stringify(points.points, null, 2));
    return NextResponse.json({ points: points.points });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}