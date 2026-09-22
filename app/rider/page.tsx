import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RiderScreen from "./RiderScreen";

export default async function RiderHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  await supabase
    .from("riders")
    .upsert({ rider_id: user.id, display_name: user.email }, { onConflict: "rider_id" });

  return <RiderScreen email={user.email ?? "rider"} />;
}
