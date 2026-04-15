import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Glide Admin",
  description: "Admin shell for the Glide e-bike rental platform",
  icons: {
    icon: [
      { url: "/glide-logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: "/glide-logo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${bodyFont.variable} ${displayFont.variable}`}
      lang="en"
      suppressHydrationWarning>
      <body className={bodyFont.className}>{children}</body>
    </html>
  );
}
