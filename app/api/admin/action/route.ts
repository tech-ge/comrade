import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { action?: unknown; id?: unknown; value?: unknown; title?: unknown; description?: unknown; goal_ksh?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { action, id, value } = body;
  if (typeof action !== "string") {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  const admin = supabaseAdmin();
  let error: { message: string } | null = null;

  if (action === "create_cause") {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const goal = Number(body.goal_ksh);
    if (!title || !description || !Number.isFinite(goal) || goal <= 0) return NextResponse.json({ error: "Enter a title, description and positive fundraising goal" }, { status: 400 });
    if (title.length > 120 || description.length > 5000) return NextResponse.json({ error: "Title or description is too long" }, { status: 400 });
    ({ error } = await admin.from("causes").insert({ admin_id: user.id, title, description, goal_ksh: goal }));
  } else if (typeof id !== "string") {
    return NextResponse.json({ error: "Missing record" }, { status: 400 });
  } else if (action === "suspend_user") {
    ({ error } = await admin.from("users").update({ suspended: true, suspension_reason: String(value || "Suspended by admin") }).eq("id", id));
  } else if (action === "unsuspend_user") {
    ({ error } = await admin.from("users").update({ suspended: false, suspension_reason: null }).eq("id", id));
  } else if (action === "set_role") {
    if (!["user", "admin", "sponsor"].includes(String(value))) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (id === user.id && value !== "admin") return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
    ({ error } = await admin.from("users").update({ role: value }).eq("id", id));
  } else if (action === "reply_suggestion") {
    if (!String(value || "").trim()) return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });
    ({ error } = await admin.from("suggestions").update({ admin_reply: String(value).trim(), replied_at: new Date().toISOString() }).eq("id", id));
  } else if (action === "approve_withdrawal" || action === "reject_withdrawal") {
    ({ error } = await admin.from("wallet_transactions").update({
      status: action === "approve_withdrawal" ? "success" : "failed",
    }).eq("id", id).eq("type", "withdrawal").eq("status", "pending"));
  } else if (action === "set_cause_status") {
    if (!["active", "paused", "closed"].includes(String(value))) return NextResponse.json({ error: "Invalid cause status" }, { status: 400 });
    ({ error } = await admin.from("causes").update({ status: value, closed_at: value === "closed" ? new Date().toISOString() : null }).eq("id", id));
  } else if (action === "review_flag") {
    ({ error } = await admin.from("moderation_flags").update({ reviewed_at: new Date().toISOString() }).eq("id", id));
  } else if (action === "dismiss_report") {
    const { data: report, error: reportError } = await admin.from("reports").select("target_type, target_id").eq("id", id).maybeSingle();
    if (reportError) error = reportError;
    else if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    else {
      ({ error } = await admin.from("reports").delete().eq("id", id));
      if (!error) {
        const { error: flagError } = await admin.from("moderation_flags").update({ reviewed_at: new Date().toISOString() }).eq("target_type", report.target_type).eq("target_id", report.target_id);
        if (flagError) error = flagError;
      }
    }
  } else if (action === "hide_flagged_content" || action === "restore_flagged_content" || action === "remove_flagged_content") {
    const { data: flag, error: flagError } = await admin.from("moderation_flags").select("target_type, target_id").eq("id", id).maybeSingle();
    if (flagError) error = flagError;
    else if (!flag) return NextResponse.json({ error: "Moderation item not found" }, { status: 404 });
    else {
      const hidden = action === "hide_flagged_content";
      const tableByType: Record<string, { table: string; field?: string; hidden?: string; restored?: string; removable?: boolean }> = {
        story: { table: "stories", field: "status", hidden: "deleted", restored: "active" },
        anonymous: { table: "anonymous_posts", removable: true },
        gig: { table: "gigs", field: "status", hidden: "hidden", restored: "active" },
        help: { table: "help_posts", field: "status", hidden: "closed", restored: "active" },
        couple: { table: "couple_posts", field: "status", hidden: "closed", restored: "active" },
        advice: { table: "advice_posts", removable: true },
        comment: { table: "comments", removable: true },
      };
      const target = tableByType[flag.target_type];
      if (!target) return NextResponse.json({ error: "This content type cannot be changed here" }, { status: 400 });
      if (target.removable) {
        if (action !== "remove_flagged_content") return NextResponse.json({ error: "This content type can only be removed" }, { status: 400 });
        ({ error } = await admin.from(target.table).delete().eq("id", flag.target_id));
      } else {
        ({ error } = await admin.from(target.table).update({ [target.field as string]: hidden ? target.hidden : target.restored }).eq("id", flag.target_id));
      }
    }
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
