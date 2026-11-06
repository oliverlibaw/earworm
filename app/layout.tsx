import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Earshot — Daily Spanish Listening Game",
  description:
    "Daily Mexican Spanish listening comprehension game with realistic native dialogues, street slang, traffic noise bonus mode, and audio vocabulary review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased selection:bg-amber-500/30 dark:bg-zinc-950 dark:text-zinc-100">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
