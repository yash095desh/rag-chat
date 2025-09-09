// app/api/delete-doc/route.js
import { NextResponse } from "next/server";
import { qdrantClient } from "@/lib/langchain";

export async function POST(req) {
  try {
    const { userId, docId } = await req.json();

    if (!userId || !docId) {
      return NextResponse.json(
        { error: "userId and docId are required" },
        { status: 400 }
      );
    }

    const collectionName = `${userId}_collection`;

    // Check if collection exists first
    try {
      await qdrantClient.getCollection(collectionName);
    } catch (error) {
      console.log(`Collection ${collectionName} does not exist`);
      return NextResponse.json({
        message: `Collection ${collectionName} does not exist - nothing to delete`,
      });
    }

    // Method 1: Use the correct Qdrant Cloud API format for deletion
    try {
      console.log(`Attempting to delete points with docId: ${docId}`);
      
      // For Qdrant Cloud, use the points deletion with proper filter
      const deleteResponse = await qdrantClient.delete(collectionName, {
        filter: {
          must: [
            {
              key: "docId",
              match: {
                value: docId
              }
            }
          ]
        }
      });

      console.log("Delete response:", deleteResponse);
      
      return NextResponse.json({
        message: `Successfully deleted document ${docId} from user ${userId}`,
        result: deleteResponse,
      });

    } catch (deleteError) {
      console.log("Standard delete failed, trying scroll approach:", deleteError);
      console.log("Delete error details:", deleteError.response?.data);

      // Method 2: Scroll to find points first, then delete by IDs
      try {
        console.log("Scrolling to find points...");
        
        const scrollResponse = await qdrantClient.scroll(collectionName, {
          filter: {
            must: [
              {
                key: "docId",
                match: {
                  value: docId
                }
              }
            ]
          },
          limit: 1000,
          with_payload: false,
          with_vector: false
        });

        console.log(`Found ${scrollResponse.points?.length || 0} points to delete`);

        if (!scrollResponse.points || scrollResponse.points.length === 0) {
          return NextResponse.json({
            message: `No points found for document ${docId}`,
            searchedDocId: docId
          });
        }

        // Extract point IDs
        const pointIds = scrollResponse.points.map(point => point.id);
        console.log("Point IDs to delete:", pointIds);

        // Delete by point IDs
        const deleteByIdsResponse = await qdrantClient.delete(collectionName, {
          points: pointIds
        });

        console.log("Delete by IDs response:", deleteByIdsResponse);

        return NextResponse.json({
          message: `Successfully deleted ${pointIds.length} chunks for document ${docId}`,
          deletedCount: pointIds.length,
          pointIds: pointIds
        });

      } catch (scrollError) {
        console.error("Scroll method also failed:", scrollError);
        console.error("Scroll error details:", scrollError.response?.data);

        // Method 3: Try with HTTP fetch directly (last resort)
        try {
          console.log("Trying direct HTTP approach...");
          
          // Get the Qdrant config from your client

          const baseUrl = process.env.QDRANT_URL;
          const apiKey = process.env.QDRANT_API_KEY;

          const response = await fetch(`${baseUrl}/collections/${collectionName}/points/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey
            },
            body: JSON.stringify({
              filter: {
                must: [
                  {
                    key: "docId",
                    match: {
                      value: docId
                    }
                  }
                ]
              },
              wait: true
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("HTTP delete failed:", response.status, errorText);
            throw new Error(`HTTP delete failed: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          console.log("HTTP delete response:", result);

          return NextResponse.json({
            message: `Successfully deleted document ${docId} using HTTP method`,
            result: result
          });

        } catch (httpError) {
          console.error("HTTP method also failed:", httpError);
          throw httpError;
        }
      }
    }

  } catch (err) {
    console.error("❌ Delete error:", err);
    
    // Enhanced error logging
    if (err.response?.data) {
      console.error("Full error data:", JSON.stringify(err.response.data, null, 2));
    }
    
    return NextResponse.json(
      { 
        error: err.message || "Failed to delete document",
        details: err.response?.data || "No additional details"
      },
      { status: 500 }
    );
  }
}