import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get("authorization");

    // آدرس بک‌اند جنگو
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://mental-shop-api.liara.run";

    // 🔴 اصلاح شده: استفاده از endpoint صحیح در بک‌اند
    const response = await fetch(`${BACKEND_URL}/api/credit-requests/create/`, {
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