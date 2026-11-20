"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminContentTools({ type, id, field1, field2 = "", status }: {
  type: string; id: string; field1: string; field2?: string; status?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(field1);
  const [second, setSecond] = useState(field2);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function call(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, id, content_type: type }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Admin action failed.");
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await call({ action: "update_content", field1: first, field2: second });
      setEditing(false); setMessage("Saved"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
    finally { setBusy(false); }
  }

  async function visibility() {
    const hiddenValues: Record<string, string> = { story: "deleted", gig: "hidden", help: "closed", couple: "closed", anonymous: "hidden" };
    const next = status === "active" ? hiddenValues[type] : "active";
    if (!window.confirm(next === "hidden" ? "Hide this content from members?" : "Restore this content to member feeds?")) return;
    setBusy(true); setMessage("");
    try { await call({ action: "set_content_status", value: next }); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update visibility."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Permanently delete this content? This cannot be undone.")) return;
    setBusy(true); setMessage("");
    try { await call({ action: "delete_content" }); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete content."); }
    finally { setBusy(false); }
  }

  return <div className="admin-content-tools">
    <div className="admin-content-tool-buttons">
      <button className="admin-action" type="button" onClick={() => setEditing(value => !value)} disabled={busy}>{editing ? "Cancel edit" : "Edit"}</button>
      {status !== null && status !== undefined && <button className="admin-action" type="button" onClick={() => void visibility()} disabled={busy}>{status === "active" ? "Hide" : "Restore"}</button>}
      <button className="admin-action danger" type="button" onClick={() => void remove()} disabled={busy}>Delete</button>
    </div>
    {editing && <form className="admin-content-edit" onSubmit={save}>
      <label>Content<textarea className="input" rows={4} maxLength={5000} value={first} onChange={event => setFirst(event.target.value)} required /></label>
      {field2 !== "" && <label>Additional field<textarea className="input" rows={3} maxLength={5000} value={second} onChange={event => setSecond(event.target.value)} required /></label>}
      <button className="admin-action primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>}
    {message && <small className="admin-content-message" role="status">{message}</small>}
  </div>;
}
