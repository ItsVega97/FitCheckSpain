import { NextResponse } from "next/server";
import { getAllDeals } from "@/lib/data";

export async function GET() {
  const deals = await getAllDeals();
  return NextResponse.json({ deals });
}
