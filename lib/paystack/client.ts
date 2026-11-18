export async function initializePaystack(amountKsh: number, reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "geoffrey@gmail.com",
      amount: Math.round(amountKsh * 100),
      reference,
      currency: "KES",
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/wallet`,
    }),
  });

  return res.json();
}
