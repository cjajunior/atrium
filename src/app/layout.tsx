import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Atrium: a client portal for agencies",
    template: "%s | Atrium",
  },
  description:
    "Projects, requests and billing for small agencies, with access rules enforced by Postgres. A portfolio project by Claudio Junior.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
