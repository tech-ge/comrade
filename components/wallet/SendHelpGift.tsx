"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

type GiftOption = { id: number; name: string; icon_url: string; price_ksh: number };

export default function SendHelpGift({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [gifts, setGifts] = useState<GiftOption[]>([]);
  const [giftId, setGiftId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setOpen(value => !value);
    setMessage("");
    if (gifts.length) return;
    const response = await fetch("/api/gifts");
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not load gifts."); return; }
    setGifts(data.gifts || []);
    if (data.gifts?.length) setGiftId(String(data.gifts[0].id));
  }

  async function send(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/gifts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_type: "help", context_id: postId, gift_id: Number(giftId), quantity: Number(quantity) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gift could not be sent.");
      setMessage("Gift sent. Thank you for supporting a student!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gift could not be sent.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-3">
      <button type="button" className="profile-photo-button" onClick={() => void reveal()}><Gift size={16} /> Send a gift</button>
      {open && <form onSubmit={send} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1 text-xs font-semibold">Choose a gift
          <select className="input mt-1" value={giftId} onChange={event => setGiftId(event.target.value)} required>
            {gifts.map(gift => <option key={gift.id} value={gift.id}>{gift.name} · Ksh {gift.price_ksh}</option>)}
          </select>
        </label>
        <label className="w-24 text-xs font-semibold">Quantity
          <input className="input mt-1" type="number" min={1} max={20} value={quantity} onChange={event => setQuantity(event.target.value)} required />
        </label>
        <button className="btn-primary" disabled={busy || !gifts.length}>{busy ? "Sending…" : "Send"}</button>
        {message && <p className="w-full text-xs" role="status">{message}</p>}
      </form>}
    </div>
  );
}
