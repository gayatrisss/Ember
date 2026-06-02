import { NextRequest, NextResponse } from "next/server";

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

  const startDate = new Date(Date.UTC(year, month, 1)).toISOString().replace(/\.\d{3}Z$/, ".000Z");

  const url = `https://www.recreation.gov/api/camps/availability/campground/${facilityId}/month?start_date=${encodeURIComponent(startDate)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.log(
        "[ember] availability route: rec.gov returned",
        res.status,
        "for facility",
        facilityId
      );
      return NextResponse.json({ error: `Recreation.gov returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.log("[ember] availability route: fetch failed", err);
    return NextResponse.json({ error: "Failed to reach Recreation.gov" }, { status: 502 });
  }
}
