import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

class PaystackRequestError extends Error {
  constructor(message: string, readonly outcomeUnknown = false) { super(message); }
}

async function paystackRequest<T = Record<string, unknown>>(path: string, method = "GET", body?: Record<string, unknown>): Promise<T> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  let response: Response;
  try {
    response = await fetch(`https://api.paystack.co${path}`, {
      method,
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new PaystackRequestError("Could not reach Paystack; transfer result is unknown", true);
  }
  let data: { status?: boolean; message?: string; data?: unknown };
  try { data = await response.json(); }
  catch { throw new PaystackRequestError("Paystack response could not be read", true); }
  if (!response.ok || !data.status) throw new PaystackRequestError(data.message || "Paystack request failed");
  return data.data as T;
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { action?: unknown; id?: unknown; value?: unknown; title?: unknown; description?: unknown; goal_ksh?: unknown; content_type?: unknown; field1?: unknown; field2?: unknown };
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
  } else if (action === "approve_withdrawal") {
    const { data: withdrawal, error: withdrawalError } = await admin.from("wallet_transactions")
      .select("id, wallet_id, amount_ksh, paystack_ref, status, withdrawal_details")
      .eq("id", id).eq("type", "withdrawal").maybeSingle();
    if (withdrawalError) return NextResponse.json({ error: withdrawalError.message }, { status: 500 });
    if (!withdrawal || withdrawal.status !== "pending") return NextResponse.json({ error: "This withdrawal is no longer awaiting approval" }, { status: 409 });

    const { error: reserveError } = await admin.rpc("reserve_wallet_withdrawal", { p_transaction_id: id, p_admin_id: user.id });
    if (reserveError) return NextResponse.json({ error: reserveError.message }, { status: 400 });

    const details = withdrawal.withdrawal_details as { payout_method?: string; account_name?: string; account_number?: string; mobile_number?: string; bank_code?: string };
    const mobile = details.payout_method === "mpesa";
    let recipient: { recipient_code?: string };
    try {
      recipient = await paystackRequest<{ recipient_code?: string }>("/transferrecipient", "POST", {
        type: mobile ? "mobile_money" : "kepss",
        name: details.account_name,
        account_number: mobile ? details.mobile_number : details.account_number,
        bank_code: mobile ? "MPESA" : details.bank_code,
        currency: "KES",
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Could not create the Paystack recipient";
      await admin.rpc("finish_wallet_withdrawal", { p_paystack_ref: withdrawal.paystack_ref, p_transfer_status: "failed", p_error: reason });
      return NextResponse.json({ error: reason }, { status: 502 });
    }
    if (!recipient.recipient_code) {
      const reason = "Paystack did not return a transfer recipient code";
      await admin.rpc("finish_wallet_withdrawal", { p_paystack_ref: withdrawal.paystack_ref, p_transfer_status: "failed", p_error: reason });
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    let transfer: { status?: string; transfer_code?: string };
    try {
      transfer = await paystackRequest<{ status?: string; transfer_code?: string }>("/transfer", "POST", {
        source: "balance",
        amount: Math.round(Number(withdrawal.amount_ksh) * 100),
        recipient: recipient.recipient_code,
        reference: withdrawal.paystack_ref,
        currency: "KES",
        reason: `Comrade Hub withdrawal ${id.slice(0, 8)}`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Paystack transfer result is unclear; check Paystack before retrying";
      if (!(err instanceof PaystackRequestError) || !err.outcomeUnknown) {
        await admin.rpc("finish_wallet_withdrawal", { p_paystack_ref: withdrawal.paystack_ref, p_transfer_status: "failed", p_error: reason });
        return NextResponse.json({ error: reason }, { status: 502 });
      }
      await admin.from("wallet_transactions").update({ withdrawal_error: reason }).eq("id", id).eq("status", "processing");
      return NextResponse.json({ ok: true, status: "processing", message: reason });
    }

    const transferStatus = String(transfer.status || "pending");
    await admin.from("wallet_transactions").update({
      withdrawal_transfer_code: transfer.transfer_code || null,
      withdrawal_transfer_status: transferStatus,
      withdrawal_error: transferStatus === "otp" ? "Paystack requires a transfer OTP" : null,
    }).eq("id", id).eq("status", "processing");
    if (transferStatus === "success" || transferStatus === "failed") {
      const { error: finishError } = await admin.rpc("finish_wallet_withdrawal", {
        p_paystack_ref: withdrawal.paystack_ref,
        p_transfer_status: transferStatus,
        p_transfer_code: transfer.transfer_code || null,
      });
      if (finishError) return NextResponse.json({ error: finishError.message }, { status: 500 });
    }
  } else if (action === "reject_withdrawal") {
    const { data: withdrawal, error: withdrawalError } = await admin.from("wallet_transactions")
      .select("id, wallet_id, amount_ksh, status")
      .eq("id", id).eq("type", "withdrawal").maybeSingle();
    if (withdrawalError) return NextResponse.json({ error: withdrawalError.message }, { status: 500 });
    if (!withdrawal || withdrawal.status !== "pending") return NextResponse.json({ error: "This withdrawal is no longer awaiting approval" }, { status: 409 });
    ({ error } = await admin.from("wallet_transactions").update({ status: "failed", withdrawal_error: "Rejected by admin" }).eq("id", id).eq("status", "pending"));
    if (!error) {
      const { data: wallet } = await admin.from("wallets").select("user_id").eq("id", withdrawal.wallet_id).maybeSingle();
      if (wallet) await admin.from("system_messages").insert({ user_id: wallet.user_id, type: "withdrawal", title: "Withdrawal declined", body: "Your withdrawal request was declined. No money was deducted from your wallet." });
    }
  } else if (action === "verify_withdrawal" || action === "finalize_withdrawal") {
    const { data: withdrawal, error: withdrawalError } = await admin.from("wallet_transactions")
      .select("id, amount_ksh, paystack_ref, status, withdrawal_transfer_code")
      .eq("id", id).eq("type", "withdrawal").maybeSingle();
    if (withdrawalError) return NextResponse.json({ error: withdrawalError.message }, { status: 500 });
    if (!withdrawal || withdrawal.status !== "processing") return NextResponse.json({ error: "This withdrawal is not processing" }, { status: 409 });
    let transfer: { status?: string; transfer_code?: string; amount?: number; currency?: string; reference?: string };
    try {
      if (action === "finalize_withdrawal") {
        const otp = String(value || "").trim();
        if (!/^\d{4,10}$/.test(otp) || !withdrawal.withdrawal_transfer_code) return NextResponse.json({ error: "Enter the Paystack transfer OTP" }, { status: 400 });
        transfer = await paystackRequest<{ status?: string; transfer_code?: string }>("/transfer/finalize_transfer", "POST", { transfer_code: withdrawal.withdrawal_transfer_code, otp });
      } else {
        transfer = await paystackRequest<{ status?: string; transfer_code?: string; amount?: number; currency?: string; reference?: string }>(`/transfer/verify/${encodeURIComponent(withdrawal.paystack_ref)}`);
      }
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Paystack transfer check failed" }, { status: 502 });
    }
    const transferStatus = String(transfer.status || "pending");
    if (action === "verify_withdrawal" && (transfer.currency !== "KES" || Number(transfer.amount) !== Math.round(Number(withdrawal.amount_ksh) * 100) || transfer.reference !== withdrawal.paystack_ref)) {
      return NextResponse.json({ error: "Paystack transfer details do not match this withdrawal" }, { status: 400 });
    }
    await admin.from("wallet_transactions").update({ withdrawal_transfer_code: transfer.transfer_code || withdrawal.withdrawal_transfer_code, withdrawal_transfer_status: transferStatus, withdrawal_error: transferStatus === "otp" ? "Paystack requires a transfer OTP" : null }).eq("id", id).eq("status", "processing");
    if (transferStatus === "success" || transferStatus === "failed") {
      const { error: finishError } = await admin.rpc("finish_wallet_withdrawal", { p_paystack_ref: withdrawal.paystack_ref, p_transfer_status: transferStatus, p_transfer_code: transfer.transfer_code || withdrawal.withdrawal_transfer_code });
      if (finishError) return NextResponse.json({ error: finishError.message }, { status: 500 });
    }
  } else if (action === "set_cause_status") {
    if (!["active", "paused", "closed"].includes(String(value))) return NextResponse.json({ error: "Invalid cause status" }, { status: 400 });
    ({ error } = await admin.from("causes").update({ status: value, closed_at: value === "closed" ? new Date().toISOString() : null }).eq("id", id));
  } else if (action === "review_flag") {
    ({ error } = await admin.from("moderation_flags").update({ reviewed_at: new Date().toISOString() }).eq("id", id));
  } else if (action === "update_content") {
    const type = String(body.content_type || "");
    const first = String(body.field1 || "").trim();
    const second = String(body.field2 || "").trim();
    const editMap: Record<string, { table: string; first: string; second?: string }> = {
      story: { table: "stories", first: "body" },
      anonymous: { table: "anonymous_posts", first: "body" },
      help: { table: "help_posts", first: "description" },
      advice: { table: "advice_posts", first: "what_happened", second: "advice_needed" },
      gig: { table: "gigs", first: "title", second: "description" },
      couple: { table: "couple_posts", first: "description" },
      comment: { table: "comments", first: "body" },
    };
    const target = editMap[type];
    if (!target || !first || first.length > 5000 || second.length > 5000 || (target.second && !second)) return NextResponse.json({ error: "Enter valid content before saving." }, { status: 400 });
    const updates: Record<string, string> = { [target.first]: first };
    if (target.second) updates[target.second] = second;
    ({ error } = await admin.from(target.table).update(updates).eq("id", id));
  } else if (action === "set_content_status") {
    const type = String(body.content_type || "");
    const status = String(value || "");
    const statusMap: Record<string, { table: string; field: string; values: string[] }> = {
      story: { table: "stories", field: "status", values: ["active", "deleted"] },
      gig: { table: "gigs", field: "status", values: ["active", "hidden"] },
      help: { table: "help_posts", field: "status", values: ["active", "closed"] },
      couple: { table: "couple_posts", field: "status", values: ["active", "closed"] },
      anonymous: { table: "anonymous_posts", field: "is_flagged", values: ["active", "hidden"] },
    };
    const target = statusMap[type];
    if (!target || !target.values.includes(status)) return NextResponse.json({ error: "This content cannot use that visibility state." }, { status: 400 });
    const updateValue: string | boolean = type === "anonymous" ? status === "hidden" : status;
    ({ error } = await admin.from(target.table).update({ [target.field]: updateValue }).eq("id", id));
  } else if (action === "delete_content") {
    const type = String(body.content_type || "");
    const tableByType: Record<string, string> = { story: "stories", anonymous: "anonymous_posts", help: "help_posts", advice: "advice_posts", gig: "gigs", couple: "couple_posts", comment: "comments" };
    const table = tableByType[type];
    if (!table) return NextResponse.json({ error: "Unknown content type." }, { status: 400 });
    ({ error } = await admin.from(table).delete().eq("id", id));
    if (!error) {
      await Promise.all([
        admin.from("reports").delete().eq("target_type", type).eq("target_id", id),
        admin.from("moderation_flags").delete().eq("target_type", type).eq("target_id", id),
      ]);
    }
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
