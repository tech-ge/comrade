import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import NewCoupleForm from "@/components/couples/NewCoupleForm";

export const dynamic = "force-dynamic";

export default async function NewCouplePage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("gender, home_county_id").eq("id", user.id).single();
  if (!profile || !["male", "female"].includes(profile.gender)) redirect("/profile/setup");
  const { data: counties } = await supabaseAdmin().from("counties").select("id, name").order("name");
  return <NewCoupleForm gender={profile.gender as "male" | "female"} counties={counties || []} homeCountyId={profile.home_county_id} />;
}
