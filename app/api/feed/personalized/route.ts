import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      // Fallback for unauthenticated or generic feed request if we want to separate logic
      // But for now, require userId for personalization.
      return NextResponse.json({ postIds: [] }); 
    }

    // 1. Fetch user profile + connections in parallel
    const [profileRes, connectionsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("role, skills, focus_areas, short_bio")
        .eq("id", userId)
        .single(),
      supabase
        .from("connections")
        .select("user_id, target_user_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},target_user_id.eq.${userId}`)
    ]);

    const profile = profileRes.data;
    const connections = connectionsRes.data || [];

    // Extract connected user IDs
    const connectedUserIds = connections.map(c => 
      c.user_id === userId ? c.target_user_id : c.user_id
    );

    // 2. Strategy A: Get posts from connections (Social Graph)
    let socialPostIds: string[] = [];
    if (connectedUserIds.length > 0) {
      const { data: socialPosts } = await supabase
        .from("posts")
        .select("id")
        .in("user_id", connectedUserIds)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (socialPosts) {
        socialPostIds = socialPosts.map(p => p.id);
      }
    }

    // 3. Strategy B: Get posts from semantic match (Interest Graph)
    let semanticPostIds: string[] = [];
    if (profile) {
      const textToEmbed = `
        Role: ${profile.role || ""}
        Skills: ${profile.skills || ""}
        Focus: ${profile.focus_areas || ""}
        Bio: ${profile.short_bio || ""}
      `.trim();

      if (textToEmbed) {
        const { embedding } = await embed({
          model: openai.textEmbeddingModel("text-embedding-3-small"),
          value: textToEmbed,
        });

        const { data: documents } = await supabase
          .rpc("match_documents", {
            query_embedding: embedding,
            match_threshold: 0.1, 
            match_count: 40,
          });

        if (documents) {
           semanticPostIds = documents
            .filter((doc: any) => doc.metadata?.type === "post")
            .map((doc: any) => doc.metadata.link);
        }
      }
    }

    // 4. Merge and Rank
    // Logic: Interleave simple approach or just dedup. 
    // Let's create a combined Set.
    // Prioritize social posts slightly? or just mix?
    // User asked for "tailor made... depending upon skills... AND focussed on connections".
    
    // Let's just combine unique IDs.
    const uniqueIds = Array.from(new Set([...socialPostIds, ...semanticPostIds]));
    
    // If we have very few results, we might want to fetch latest global posts as fallback, 
    // but the frontend already has a 'loadFeed' that fetches latest.
    // We can return these IDs and let frontend decide how to merge or replace.
    
    return NextResponse.json({ 
      postIds: uniqueIds,
      meta: {
        socialCount: socialPostIds.length,
        semanticCount: semanticPostIds.length
      }
    });

  } catch (error: any) {
    console.error("Personalized feed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
