import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadre AI Support Assistant",
  description: "Public support chatbot scaffold for Cadre AI.",
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
