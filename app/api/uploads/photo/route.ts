import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  try {
    const sb = supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in again before uploading." }, { status: 401 });
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or GIF image." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: "Photo must be 5 MB or smaller." }, { status: 400 });
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${randomUUID()}.${extension}`;
    const bucket = supabaseAdmin().storage.from("user-photos");
    const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("Photo upload failed:", error.message);
      const missingBucket = /bucket not found|does not exist/i.test(error.message);
      return NextResponse.json({ error: missingBucket ? "Photo storage is not configured yet. Apply migration 007_user_photo_uploads.sql in Supabase, then try again." : "Photo upload failed. Check your connection and try again." }, { status: 503 });
    }
    const { data: signed, error: signError } = await bucket.createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signError || !signed) {
      console.error("Photo URL creation failed:", signError?.message || "No signed URL returned");
      return NextResponse.json({ error: "Photo uploaded, but its preview could not be prepared. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ path, url: signed.signedUrl });
  } catch (error) {
    console.error("Photo upload request failed:", error);
    return NextResponse.json({ error: "Could not upload this photo. Please try again." }, { status: 500 });
  }
}
