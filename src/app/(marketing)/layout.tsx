import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AdMirror - Stop Scrolling Meta Ad Library. Start Finding Patterns.",
  description: "Browse, filter, and analyze competitor ads in one place. AI spots the patterns so you can build your swipe file faster.",
  openGraph: {
    title: "AdMirror - Stop Scrolling Meta Ad Library. Start Finding Patterns.",
    description: "Browse, filter, and analyze competitor ads in one place. AI spots the patterns so you can build your swipe file faster.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
