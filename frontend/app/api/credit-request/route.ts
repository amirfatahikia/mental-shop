import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND = "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const bodyText = await req.text(); // همون JSON ارسالی از فرانت

    const r = await fetch(`${BACKEND}/api/credit-requests/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: bodyText,
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
