import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Glide Admin",
  description: "Admin shell for the Glide e-bike rental platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
