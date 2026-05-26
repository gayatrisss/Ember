import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const res = await fetch(
    `https://www.recreation.gov/api/search/geo?q=${encodeURIComponent(q)}&exact=false&size=20&fg=lodging&sort=score&start=0`
  );

  if (!res.ok) return NextResponse.json({ results: [] });
  return NextResponse.json(await res.json());
}
