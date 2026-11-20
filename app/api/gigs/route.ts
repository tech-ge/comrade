import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { stripContacts } from "@/lib/validators/contact-stripper";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb.from("gigs").select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (typeof body.title !== "string" || !body.title.trim() || typeof body.description !== "string" || !body.description.trim() || typeof body.private_contact !== "string" || !body.private_contact.trim()) {
    return NextResponse.json({ error: "Title, description, and contact details are required." }, { status: 400 });
  }
  if (!["school", "country"].includes(body.scope)) return NextResponse.json({ error: "Choose a valid audience for this gig." }, { status: 400 });
  const cleaned = stripContacts(body.description || "");
  if (cleaned !== body.description) {
    return NextResponse.json(
      { error: "Description cannot contain phone numbers or links — those go in private fields" },
      { status: 400 }
    );
  }

  const { data: profile } = await sb.from("users").select("university_id,read_only").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });
  if (profile.read_only) return NextResponse.json({ error: "Your account is read-only while reports are reviewed." }, { status: 403 });

  const { data, error } = await sb.from("gigs").insert({
    user_id: user.id,
    university_id: profile.university_id,
    title: body.title,
    description: body.description,
    scope: body.scope,
    bid_limit: Number(body.bid_limit) || 10,
    private_contact: body.private_contact,
    private_links: body.private_links || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
