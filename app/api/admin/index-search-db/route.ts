import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role key needed for admin writes if RLS is strict

// NOTE: We need the SERVICE ROLE KEY to bypass RLS or write to the table if public doesn't have access.
// If you only have anon key, ensure RLS allows inserts.
const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Imports are already at the top of the file, so we just export the function here.

export async function POST(req: Request) {
  let insertedCount = 0;
  let skippedCount = 0;
  const errors: any[] = [];

  // --- 1. JOBS ---
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, company_name, location, employment_type, additional_description")
    .eq("is_published", true);

  if (jobs) {
    for (const job of jobs) {
      try {
        const content = `Type: Job\nTitle: ${job.title}\nCompany: ${job.company_name}\nLocation: ${job.location || "Remote"}\nDetails: ${job.additional_description || ""}`;
        const inserted = await indexItem(job.id, content, { type: "job", title: job.title });
        if (inserted) insertedCount++; else skippedCount++;
      } catch (e: any) {
        errors.push({ id: job.id, type: "job", error: e.message });
      }
    }
  }

  // --- 2. PRODUCTS ---
  const { data: products } = await supabase
    .from("products")
    .select("id, name, company_name, category, description:short_description");
    
  if (products) {
    for (const p of products) {
      try {
        const content = `Type: Product\nName: ${p.name}\nCompany: ${p.company_name}\nCategory: ${p.category}\nDescription: ${p.description || ""}`;
        const inserted = await indexItem(p.id, content, { type: "product", title: p.name });
        if (inserted) insertedCount++; else skippedCount++;
      } catch (e: any) {
        errors.push({ id: p.id, type: "product", error: e.message });
      }
    }
  }

  // --- 3. ORGANIZATIONS ---
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, industry, description, focus_areas")
    .eq("is_active", true);

  if (orgs) {
    for (const org of orgs) {
      try {
        const content = `Type: Organization\nName: ${org.name}\nIndustry: ${org.industry}\nFocus: ${org.focus_areas}\nDescription: ${org.description || ""}`;
        const inserted = await indexItem(org.slug, content, { type: "organization", title: org.name });
        if (inserted) insertedCount++; else skippedCount++;
      } catch (e: any) {
        errors.push({ id: org.slug, type: "organization", error: e.message });
      }
    }
  }

  // --- 4. PROFILES (Users) ---
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, short_bio, role, affiliation, skills");

  if (profiles) {
    for (const profile of profiles) {
      if (!profile.full_name) continue; 
      try {
        const content = `Type: User Profile\nName: ${profile.full_name}\nRole: ${profile.role}\nAffiliation: ${profile.affiliation}\nBio: ${profile.short_bio}\nSkills: ${profile.skills}`;
        const inserted = await indexItem(profile.id, content, { type: "profile", title: profile.full_name });
        if (inserted) insertedCount++; else skippedCount++;
      } catch (e: any) {
        errors.push({ id: profile.id, type: "profile", error: e.message });
      }
    }
  }

  // --- 5. Q&A QUESTIONS ---
  const { data: questions } = await supabase
    .from("qna_questions")
    .select("id, title, body, tags");

  if (questions) {
    for (const q of questions) {
      try {
        const content = `Type: Q&A Question\nTitle: ${q.title}\nBody: ${q.body}\nTags: ${q.tags?.join(", ")}`;
        const inserted = await indexItem(q.id, content, { type: "question", title: q.title });
        if (inserted) insertedCount++; else skippedCount++;
      } catch (e: any) {
        errors.push({ id: q.id, type: "question", error: e.message });
      }
    }
  }

  return NextResponse.json({ 
    message: `Indexing complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}.`, 
    insertedCount,
    skippedCount, 
    errors 
  });
}

async function indexItem(id: string, text: string, metadata: any) {
  // Check if already exists to avoid duplicates and save embedding costs
  const { data: existing } = await supabase
    .from("search_documents")
    .select("id")
    .eq("metadata->>link", id)
    .maybeSingle();

  if (existing) {
    return false; // Already present, skip
  }

  const { embedding } = await embed({
    model: openai.textEmbeddingModel("text-embedding-3-small"),
    value: text.replaceAll("\n", " "),
  });
  
  const { error } = await supabase
    .from("search_documents")
    .insert({
       content: text,
       embedding,
       metadata: { ...metadata, link: id }
    });

  if (error) throw error;
  return true;
}
