import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get("authorization");

    // آدرس بک‌اند جنگو شما (اگر در لوکال هستید معمولا 8000 است)
    // در زمان دیپلوی روی ورسل، این آدرس باید آدرس آنلاین بک‌اندمان باشد
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${BACKEND_URL}/api/credit/request/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token || "",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error("Connection to Django failed:", error);
    return NextResponse.json({ message: "بک‌اند در دسترس نیست" }, { status: 502 });
  }
}