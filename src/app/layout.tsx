import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import type { Metadata } from "next";
import { PUBLIC_SITE_URL } from "@/lib/config";
import "./globals.css";

const TITLE = "Atrium: a client portal for agencies";
const DESCRIPTION =
  "Projects, requests and billing for small agencies, with access rules enforced by Postgres. A portfolio project by Claudio Junior.";

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Atrium",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Atrium",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
