// src/app/drift/layout.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drift Protocol Dashboard",
  description: "View and manage your Drift Protocol subaccounts and positions",
};

export default function DriftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
