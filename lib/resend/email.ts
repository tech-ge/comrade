import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export async function sendOtp(to: string, code: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "Your Comrade Hub verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}
