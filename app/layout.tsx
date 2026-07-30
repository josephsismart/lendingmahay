import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LENDINGMAHAY - LOAN MANAGEMENT",
  description: "LENDING MANAGEMENT SYSTEM FOR TRACKING LOANS, PAYMENTS, AND SHAREHOLDERS",
  icons: {
    icon: "/1785375121792_image.png",
    apple: "/1785375121792_image.png",
  },
  openGraph: {
    title: "LENDINGMAHAY - LOAN MANAGEMENT",
    description: "LENDING MANAGEMENT SYSTEM FOR TRACKING LOANS, PAYMENTS, AND SHAREHOLDERS",
    images: ["/1785375121792_image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LENDINGMAHAY - LOAN MANAGEMENT",
    description: "LENDING MANAGEMENT SYSTEM FOR TRACKING LOANS, PAYMENTS, AND SHAREHOLDERS",
    images: ["/1785375121792_image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
