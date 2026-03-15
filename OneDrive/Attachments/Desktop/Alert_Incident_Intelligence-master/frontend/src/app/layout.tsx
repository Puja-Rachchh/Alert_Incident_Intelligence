import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Incident Intelligence Dashboard",
  description: "Interactive insights and conversational assistant for alerts"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
