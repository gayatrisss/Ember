import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const url = `https://ridb.recreation.gov/api/v1/facilities?query=${encodeURIComponent(q)}&limit=10&&apikey=${process.env.RIDB_API_KEY ?? ""}`;
  console.log("[ridb] GET", url);   
  const res = await fetch(url);

  if (!res.ok) return NextResponse.json({ RECDATA: [] });
  return NextResponse.json(await res.json());
}
