import { NextResponse } from "next/server";
import { getSchoolEmailDomain } from "@/lib/auth/school-email";

export async function POST(req: Request) {
  const { email } = await req.json();
  const domain = getSchoolEmailDomain(email);
  if (!domain) {
    return NextResponse.json(
      { error: "Enter a valid email address. Gmail, Yahoo, and Outlook addresses are not accepted." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, domain });
}