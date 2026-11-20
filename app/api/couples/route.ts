import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await sb.from("couple_posts").select("*")
    .eq("status", "active").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const posts = await Promise.all((data || []).map(async post => ({ ...post, photo_url: await resolvePhotoUrl(post.photo_url) || "/placeholder-couple.png" })));
  return NextResponse.json({ data: posts });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.photo_path && (typeof body.photo_path !== "string" || !body.photo_path.startsWith(`${user.id}/`))) return NextResponse.json({ error: "Upload your own photo first." }, { status: 400 });
  if (typeof body.description !== "string" || !body.description.trim()) return NextResponse.json({ error: "Describe who you are hoping to meet." }, { status: 400 });
  if (!["country", "county", "school"].includes(body.target_scope)) return NextResponse.json({ error: "Choose a valid audience." }, { status: 400 });
  const { data: profile } = await sb.from("users").select("university_id, gender").eq("id", user.id).single();
  if (!profile || !["male", "female"].includes(profile.gender)) return NextResponse.json({ error: "Profile needs a valid gender before creating a couple search." }, { status: 400 });
  const lookingFor = profile.gender === "male" ? "female" : "male";
  if (body.looking_for_gender !== lookingFor) return NextResponse.json({ error: "Couple searches must be for the other gender." }, { status: 400 });
  const countyId = body.target_scope === "county" ? Number(body.target_county_id) : null;
  if (body.target_scope === "county" && (!Number.isInteger(countyId) || !countyId)) return NextResponse.json({ error: "Choose a county for this search." }, { status: 400 });
  if (countyId) {
    const { data: county } = await supabaseAdmin().from("counties").select("id").eq("id", countyId).maybeSingle();
    if (!county) return NextResponse.json({ error: "Choose a valid county." }, { status: 400 });
  }

  const { data, error } = await sb.from("couple_posts").insert({
    user_id: user.id,
    university_id: profile.university_id,
    photo_url: body.photo_path || "/placeholder-couple.png",
    description: body.description,
    poster_gender: profile.gender,
    looking_for_gender: lookingFor,
    target_scope: body.target_scope,
    target_county_id: countyId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
