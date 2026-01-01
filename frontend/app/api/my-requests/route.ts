import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND = "http://127.0.0.1:8000";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";

    const r = await fetch(`${BACKEND}/api/my-requests/`, {
      method: "GET",
      headers: {
        Authorization: auth,
      },
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { detail: "Backend unreachable", error: e?.message || "unknown" },
      { status: 502 }
    );
  }
}
