import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Coy Discover", description: "A privacy-first swipe discovery demo" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
