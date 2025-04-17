// src/app/layout.tsx (modify the existing file)
import "./globals.css";
import { ClusterProvider } from "@/components/cluster/cluster-data-access";
import { UiLayout } from "@/components/ui/ui-layout";
import { ReactQueryProvider } from "./react-query-provider";

export const metadata = {
  title: "Drift Protocol Dashboard",
  description: "View and manage your Drift Protocol subaccounts and positions",
};

const links: { label: string; path: string }[] = [
  { label: "Dashboard", path: "/" },
  { label: "Account", path: "/account" },
  { label: "Drift", path: "/drift" },
  { label: "Clusters", path: "/clusters" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <ClusterProvider>
            <UiLayout links={links}>{children}</UiLayout>
          </ClusterProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
