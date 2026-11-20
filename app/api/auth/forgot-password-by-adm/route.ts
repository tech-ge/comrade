import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";

// Keep the previous endpoint working while using the admission-number email-code flow.
export async function POST(request: Request) {
  let body: { adm_number?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Enter your admission number." }, { status: 400 }); }
  return forgotPassword(new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adm_number: body.adm_number }),
  }));
}
