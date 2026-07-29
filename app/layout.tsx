import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendingMahay - Loan Management",
  description: "Lending management system with 10% monthly compound interest tracking, member management, and digital signatures.",
  openGraph: {
    title: "LendingMahay - Loan Management System",
    description: "Professional lending management with 10% monthly compound interest, member profiles, payment tracking, and digital signatures.",
    url: "https://lendingmahay.vercel.app",
    siteName: "LendingMahay",
    images: [
      {
        url: "https://lendingmahay.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "LendingMahay - Loan Management System",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LendingMahay - Loan Management System",
    description: "Professional lending management with 10% monthly compound interest.",
    images: ["https://lendingmahay.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
