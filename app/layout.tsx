import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LENDINGMAHAY - LOAN MANAGEMENT",
  description: "LENDING MANAGEMENT SYSTEM FOR TRACKING LOANS, PAYMENTS, AND SHAREHOLDERS",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "LENDINGMAHAY - LOAN MANAGEMENT",
    description: "LENDING MANAGEMENT SYSTEM FOR TRACKING LOANS, PAYMENTS, AND SHAREHOLDERS",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LENDINGMAHAY - LOAN MANAGEMENT",
    description: "LENDING MANAGEMENT SYSTEM FOR TRACKING LOANS, PAYMENTS, AND SHAREHOLDERS",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
