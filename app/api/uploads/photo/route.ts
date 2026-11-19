import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or GIF image." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: "Photo must be 5 MB or smaller." }, { status: 400 });
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/${randomUUID()}.${extension}`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from("user-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Photo upload failed. Please try again." }, { status: 400 });
  const { data: signed, error: signError } = await admin.storage.from("user-photos").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signError || !signed) return NextResponse.json({ error: "Could not prepare your photo." }, { status: 400 });
  return NextResponse.json({ path, url: signed.signedUrl });
}
