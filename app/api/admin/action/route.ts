import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, id, value } = await req.json();
  const admin = supabaseAdmin();

  if (action === "suspend_user") {
    await admin.from("users").update({ suspended: true, suspension_reason: String(value || "Suspended by admin") }).eq("id", id);
  } else if (action === "unsuspend_user") {
    await admin.from("users").update({ suspended: false, suspension_reason: null }).eq("id", id);
  } else if (action === "set_role") {
    if (!["user", "admin", "sponsor"].includes(String(value))) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    await admin.from("users").update({ role: value }).eq("id", id);
  } else if (action === "reply_suggestion") {
    await admin.from("suggestions").update({ admin_reply: String(value || ""), replied_at: new Date().toISOString() }).eq("id", id);
  } else if (action === "approve_withdrawal" || action === "reject_withdrawal") {
    await admin.from("wallet_transactions").update({
      status: action === "approve_withdrawal" ? "success" : "failed",
    }).eq("id", id);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
