import { NextRequest } from "next/server";

// Simple admin credentials - change in production
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "mahay2024";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return Response.json({ success: true, token: "admin-session-token" });
  }
  return Response.json({ success: false, message: "Invalid credentials" }, { status: 401 });
}
