import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Earworm — Daily Foreign Language Listening Game",
  description:
    "Wordle-style daily listening comprehension game with messy, realistic native dialogues, street slang, Crowded Cafe mode, and AI open-ended grading.",
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
