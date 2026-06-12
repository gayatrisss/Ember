import { NextRequest, NextResponse } from "next/server";
import { fetchMonthAvailability } from "@/lib/availability";

// Returns raw Recreation.gov availability for a single month.
// ?facilityId=XXX            → defaults to current calendar month
// ?facilityId=XXX&month=2026-07  → explicit month (YYYY-MM)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const facilityId = searchParams.get("facilityId");

  if (!facilityId) {
    return NextResponse.json({ error: "Missing facilityId" }, { status: 400 });
  }

  // Resolve target month
  const monthParam = searchParams.get("month"); // "YYYY-MM" or null
  let year: number;
  let month: number; // 0-indexed

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12) {
      return NextResponse.json({ error: "Invalid month param, expected YYYY-MM" }, { status: 400 });
    }
    year = y;
    month = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
  }

  const data = await fetchMonthAvailability(facilityId, year, month);
  if (data == null) {
    return NextResponse.json({ error: "Failed to reach Recreation.gov" }, { status: 502 });
  }
  return NextResponse.json(data);
}
