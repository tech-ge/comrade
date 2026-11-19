"use client";

import { useEffect, useState } from "react";

type Transaction = {
  id: string;
  type: string;
  amount_ksh: number;
  status: string;
  created_at: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawUnlocked, setWithdrawUnlocked] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/wallet/status");
    const data = await response.json();
    if (response.ok) {
      setBalance(Number(data.balance_ksh || 0));
      setTransactions(data.transactions || []);
      setWithdrawUnlocked(Boolean(data.withdraw_unlocked));
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (!reference) {
      load();
      return;
    }

    let cancelled = false;
    (async () => {
      setMessage("Verifying your Paystack payment…");
      const response = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
      const data = await response.json();
      if (cancelled) return;
      if (response.ok && data.status === "success") {
        setMessage(`Deposit of Ksh ${Number(data.amount_ksh).toLocaleString()} added to your wallet.`);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (data.status === "ongoing" || data.status === "pending") {
        setMessage("Your payment is still processing. Your wallet will update when Paystack confirms it.");
        window.history.replaceState({}, "", window.location.pathname);
      } else if (data.status === "failed" || data.status === "abandoned") {
        setMessage("Payment was not completed, so nothing was added to your wallet.");
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setMessage(data.error || "We could not confirm this payment. Contact support if you were charged.");
      }
      await load();
    })().catch(() => {
      if (!cancelled) setMessage("We could not verify the payment right now. Your wallet will update once Paystack confirms it.");
    });
    return () => { cancelled = true; };
  }, []);

  async function deposit() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_ksh: Number(amount) }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Deposit failed");
      return;
    }
    window.location.href = data.authorization_url;
  }

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_ksh: Number(amount),
        account_name: accountName,
        account_number: accountNumber,
        bank_name: bankName,
        mobile_number: mobileNumber,
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Withdrawal failed");
      return;
    }
    setMessage("Withdrawal request submitted for admin review.");
    setAmount("");
    await load();
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      <h1 className="text-2xl font-bold mb-3">Wallet</h1>

      <div className="card mb-4">
        <p className="text-sm text-brand-gray">Available balance</p>
        <p className="text-3xl font-bold">Ksh {balance.toLocaleString()}</p>
      </div>

      <div className="card mb-4 space-y-3">
        <h2 className="font-bold">Deposit</h2>
        <input
          className="input"
          type="number"
          min={10}
          placeholder="Amount (Ksh)"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <button className="btn-primary w-full" onClick={deposit} disabled={loading || !amount}>
          {loading ? "Opening Paystack…" : "Deposit"}
        </button>
      </div>

      <form className="card mb-4 space-y-3" onSubmit={withdraw}>
        <h2 className="font-bold">Withdraw</h2>
        <p className="text-sm text-brand-gray">
          Withdrawals unlock after receiving at least one gift within the past 7 days.
        </p>
        {withdrawUnlocked ? (
          <>
            <input className="input" placeholder="Account name" value={accountName} onChange={(event) => setAccountName(event.target.value)} required />
            <input className="input" placeholder="Account number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} required />
            <input className="input" placeholder="Bank name" value={bankName} onChange={(event) => setBankName(event.target.value)} required />
            <input className="input" placeholder="Mobile number (optional)" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} />
            <input className="input" type="number" min={100} placeholder="Amount (Ksh)" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Submitting…" : "Request withdrawal"}
            </button>
          </>
        ) : (
          <p className="text-sm text-brand-red">Not unlocked: receive a gift within the last 7 days.</p>
        )}
      </form>

      {message && <p className="text-sm mb-4">{message}</p>}

      <h2 className="font-bold mb-2">Transactions</h2>
      {transactions.length === 0 ? (
        <p className="text-sm text-brand-gray">No transactions yet.</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold capitalize">{transaction.type.replace("_", " ")}</p>
                <p className="text-xs text-brand-gray">{new Date(transaction.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Ksh {Number(transaction.amount_ksh).toLocaleString()}</p>
                <p className="text-xs">{transaction.status}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
