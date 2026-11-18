import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generatePublicId } from "@/lib/utils/public-id";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await req.formData();
  const admin = supabaseAdmin();

  async function upload(field: string, bucket: string) {
    const f = fd.get(field) as File | null;
    if (!f) return null;
    const path = `${user!.id}/${field}-${Date.now()}.jpg`;
    const { error } = await admin.storage.from(bucket).upload(path, f, { upsert: true, contentType: f.type });
    if (error) throw error;
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  let selfieUrl: string | null = null;
  let idUrl: string | null = null;
  try {
    selfieUrl = await upload("selfie", "selfies");
    idUrl = await upload("id_photo", "ids");
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 400 });
  }

  const domain = String(user.email).split("@")[1];
  const { data: uni } = await admin.from("universities").select("id").eq("email_domain", domain).single();
  if (!uni) return NextResponse.json({ error: "Unknown school domain" }, { status: 400 });

  const { error } = await admin.from("users").upsert({
    id: user.id,
    university_id: uni.id,
    public_id: generatePublicId(),
    first_name: String(fd.get("first_name")),
    full_name: String(fd.get("full_name")),
    adm_number: String(fd.get("adm_number")),
    email: user.email!,
    phone: String(fd.get("phone")),
    course: String(fd.get("course")),
    year_of_study: Number(fd.get("year_of_study")),
    campus: String(fd.get("campus")),
    gender: String(fd.get("gender")),
    home_county_id: Number(fd.get("home_county_id")) || null,
    selfie_url: selfieUrl,
    id_photo_url: idUrl,
    verified: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("wallets").upsert({ user_id: user.id, balance_ksh: 0 });

  return NextResponse.json({ ok: true });
}
