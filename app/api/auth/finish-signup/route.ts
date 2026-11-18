import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generatePublicId } from "@/lib/utils/public-id";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const fd = await req.formData();
  const admin = supabaseAdmin();

  const email = String(fd.get("email") || user.email || "").toLowerCase();
  const adm = String(fd.get("adm_number") || "").trim();
  const fullName = String(fd.get("full_name") || "").trim();
  const idPhoto = fd.get("id_photo") as File | null;
  if (!idPhoto) return NextResponse.json({ error: "ID photo required" }, { status: 400 });

  const domain = email.split("@")[1];
  const { data: uni } = await admin.from("universities").select("id").eq("email_domain", domain).single();
  if (!uni) return NextResponse.json({ error: "Unknown school" }, { status: 400 });

  // Move selfie from pending folder
  const safeKey = email.replace(/[^a-z0-9]/gi, "_");
  const pendingPrefix = `pending/${safeKey}`;
  let selfieUrl: string | null = null;
  try {
    const { data: files } = await admin.storage.from("selfies").list(pendingPrefix);
    if (files && files.length > 0) {
      const src = `${pendingPrefix}/${files[0].name}`;
      const dst = `${user.id}/selfie-${Date.now()}.jpg`;
      await admin.storage.from("selfies").copy(src, dst);
      const { data } = admin.storage.from("selfies").getPublicUrl(dst);
      selfieUrl = data.publicUrl;
      await admin.storage.from("selfies").remove([src]);
    }
  } catch (_) {}

  // Upload ID photo
  const idPath = `${user.id}/id-${Date.now()}.jpg`;
  const { error: idErr } = await admin.storage.from("ids").upload(idPath, idPhoto, { upsert: true, contentType: idPhoto.type });
  if (idErr) return NextResponse.json({ error: "ID upload failed" }, { status: 500 });
  const { data: idData } = admin.storage.from("ids").getPublicUrl(idPath);

  // Set password (user was created via OTP)
  const { error: pwdErr } = await admin.auth.admin.updateUserById(user.id, {
    password: String(fd.get("password") || ""),
  });
  if (pwdErr) return NextResponse.json({ error: pwdErr.message }, { status: 400 });

  // Upsert profile
  const { error } = await admin.from("users").upsert({
    id: user.id,
    university_id: uni.id,
    public_id: generatePublicId(),
    first_name: String(fd.get("first_name") || ""),
    full_name: fullName,
    adm_number: adm,
    email,
    phone: String(fd.get("phone") || ""),
    course: String(fd.get("course") || ""),
    year_of_study: Number(fd.get("year_of_study") || 1),
    campus: String(fd.get("campus") || ""),
    gender: String(fd.get("gender") || ""),
    home_county_id: Number(fd.get("home_county_id")) || null,
    selfie_url: selfieUrl,
    id_photo_url: idData.publicUrl,
    verified: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("wallets").upsert({ user_id: user.id, balance_ksh: 0 });

  return NextResponse.json({ ok: true });
}
