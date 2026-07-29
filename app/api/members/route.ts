import { NextRequest } from "next/server";
import { readData, writeData, Member } from "@/lib/db";

export async function GET() {
  const members = readData<Member>("members");
  return Response.json(members);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const members = readData<Member>("members");
  const member: Member = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    firstName: (body.firstName || "").toUpperCase(),
    middleName: (body.middleName || "").toUpperCase(),
    lastName: (body.lastName || "").toUpperCase(),
    extension: (body.extension || "").toUpperCase(),
    birthdate: body.birthdate || "",
    address: (body.address || "").toUpperCase(),
    photo: body.photo || "",
    shares: Number(body.shares) || 0,
    createdAt: new Date().toISOString(),
  };
  members.push(member);
  writeData("members", members);
  return Response.json(member, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const members = readData<Member>("members");
  const idx = members.findIndex((m) => m.id === body.id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  if (body.firstName) body.firstName = body.firstName.toUpperCase();
  if (body.middleName) body.middleName = body.middleName.toUpperCase();
  if (body.lastName) body.lastName = body.lastName.toUpperCase();
  if (body.extension) body.extension = body.extension.toUpperCase();
  if (body.address) body.address = body.address.toUpperCase();
  if (body.shares !== undefined) body.shares = Number(body.shares) || 0;
  members[idx] = { ...members[idx], ...body };
  writeData("members", members);
  return Response.json(members[idx]);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  let members = readData<Member>("members");
  members = members.filter((m) => m.id !== id);
  writeData("members", members);
  return Response.json({ success: true });
}
