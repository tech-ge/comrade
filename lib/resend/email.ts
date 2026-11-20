import { Resend } from "resend";
function emailClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}
export async function sendOtp(to: string, code: string) {
  return emailClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "Your Comrade Hub verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}


export async function sendPasswordResetCode(to: string, code: string) {
  return emailClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "Your Comrade Hub password reset code",
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });
}

export async function sendAdminEmail(to: string, subject: string, message: string) {
  return emailClient().emails.send({ from: process.env.RESEND_FROM_EMAIL!, to, subject, text: message });
}
