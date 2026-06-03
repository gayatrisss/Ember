import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ cabins: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cabins")
    .select("facility_id, facility_name, rec_area_name")
    .ilike("facility_name", `%${q}%`)
    .order("facility_name")
    .limit(8);

  if (error) {
    console.error("[ember] search error", error.message);
    return NextResponse.json({ cabins: [] });
  }

  const cabins = (data ?? []).map((row) => ({
    id: row.facility_id,
    name: row.facility_name as string,
    area: row.rec_area_name as string | null,
  }));

  return NextResponse.json({ cabins });
}
