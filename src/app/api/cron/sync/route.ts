import { NextRequest, NextResponse } from "next/server";
import { syncData } from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Optional verification if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await syncData();

    return NextResponse.json({
      status: "success",
      message: "Regional solar rates and insolation updated successfully",
      lastUpdated: db.lastUpdated,
    });
  } catch (error) {
    console.error("[Cron Sync] Error:", error);
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
