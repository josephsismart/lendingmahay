import { NextRequest } from "next/server";
import { readData, writeData, Loan, calculateInterest } from "@/lib/db";

export async function GET() {
  const loans = readData<Loan>("loans");
  const enriched = loans.map((loan) => {
    if (loan.status === "paid") return { ...loan, totalDue: 0, interestAmount: 0, months: 0, balance: 0 };
    const calc = calculateInterest(loan.amount, loan.interestStartDate);
    const totalPaid = loan.payments.reduce((s, p) => s + p.amount, 0);
    return { ...loan, ...calc, totalPaid, balance: Math.max(0, calc.totalDue - totalPaid) };
  });
  return Response.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const loans = readData<Loan>("loans");
  const loan: Loan = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    memberId: body.memberId,
    amount: Number(body.amount),
    borrowDate: body.borrowDate,
    interestStartDate: body.interestStartDate || body.borrowDate,
    signature: body.signature || "",
    status: "active",
    payments: [],
    createdAt: new Date().toISOString(),
  };
  loans.push(loan);
  writeData("loans", loans);
  return Response.json(loan, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const loans = readData<Loan>("loans");
  const idx = loans.findIndex((l) => l.id === body.id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });

  if (body.action === "pay") {
    const payment = {
      id: Date.now().toString(36),
      amount: Number(body.paymentAmount),
      date: body.paymentDate || new Date().toISOString().split("T")[0],
    };
    loans[idx].payments.push(payment);
  } else if (body.action === "markPaid") {
    loans[idx].status = "paid";
  } else {
    loans[idx] = { ...loans[idx], ...body };
  }

  writeData("loans", loans);
  return Response.json(loans[idx]);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  let loans = readData<Loan>("loans");
  loans = loans.filter((l) => l.id !== id);
  writeData("loans", loans);
  return Response.json({ success: true });
}
