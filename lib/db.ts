import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readData<T>(name: string): T[] {
  ensureDir();
  const fp = getFilePath(name);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, "[]", "utf-8");
    return [];
  }
  const raw = fs.readFileSync(fp, "utf-8");
  return JSON.parse(raw || "[]");
}

export function writeData<T>(name: string, data: T[]) {
  ensureDir();
  fs.writeFileSync(getFilePath(name), JSON.stringify(data, null, 2), "utf-8");
}

export interface Member {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  extension: string;
  birthdate: string;
  address: string;
  photo: string; // base64, max ~50kb
  createdAt: string;
}

export interface Loan {
  id: string;
  memberId: string;
  amount: number;
  borrowDate: string;
  interestStartDate: string;
  signature: string; // base64 digital signature
  status: "active" | "paid";
  payments: Payment[];
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

// 10% monthly compound interest
export function calculateInterest(principal: number, startDate: string): {
  totalDue: number;
  interestAmount: number;
  months: number;
} {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const months = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const totalDue = principal * Math.pow(1.1, months);
  return {
    totalDue: Math.round(totalDue * 100) / 100,
    interestAmount: Math.round((totalDue - principal) * 100) / 100,
    months: Math.round(months * 100) / 100,
  };
}
