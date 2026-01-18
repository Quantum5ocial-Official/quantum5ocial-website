
import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  try {
    const { type, data, action } = await req.json();

    if (action === 'delete') {
      const linkId = type === "organization" ? data.slug : data.id;
      if (linkId) {
        await supabase.from("search_documents").delete().match({ "metadata->>link": linkId });
      }
      return NextResponse.json({ success: true });
    }

    let content = "";
    let metadata: any = { type };

    switch (type) {
      case "job":
        content = `Type: Job\nTitle: ${data.title}\nCompany: ${data.company_name}\nLocation: ${data.location || "Remote"}\nDetails: ${data.additional_description || ""}`;
        metadata.title = data.title;
        break;
      case "product":
        content = `Type: Product\nName: ${data.name}\nCompany: ${data.company_name}\nCategory: ${data.category}\nDescription: ${data.description || ""}`;
        metadata.title = data.name;
        break;
      case "organization":
        content = `Type: Organization\nName: ${data.name}\nIndustry: ${data.industry}\nFocus: ${data.focus_areas}\nDescription: ${data.description || ""}`;
        metadata.title = data.name;
        break;
      case "profile":
        content = `Type: User Profile\nName: ${data.full_name}\nRole: ${data.role}\nAffiliation: ${data.affiliation}\nBio: ${data.short_bio}\nSkills: ${data.skills}`;
        metadata.title = data.full_name;
        break;
      case "question":
        content = `Type: Q&A Question\nTitle: ${data.title}\nBody: ${data.body}\nTags: ${data.tags?.join(", ")}`;
        metadata.title = data.title;
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Generate embedding
    const { embedding } = await embed({
        model: openai.textEmbeddingModel("text-embedding-3-small"),
        value: content.replaceAll("\n", " "),
    });

    // Determine valid link ID: strictly slug for orgs, ID for others
    const linkId = type === "organization" ? data.slug : data.id;

    if (!linkId) {
      return NextResponse.json({ error: "Missing ID/Slug for search sync" }, { status: 400 });
    }

    // 1. Delete existing document for this item (avoids duplicates)
    await supabase.from("search_documents").delete().eq("metadata->>link", linkId);
    
    // 2. Insert new document
    const { error: insertError } = await supabase.from("search_documents").insert({
         content: content,
         embedding,
         metadata: { ...metadata, link: linkId }
    });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
