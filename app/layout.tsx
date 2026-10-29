import type { Metadata } from "next";
import type { ReactNode } from "react";
import config from "@/lineup.config";
import { themeCss } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: config.appName,
  description: config.about || config.appName,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const css = themeCss(config.theme);
  return (
    <html lang={config.lang}>
      <head>{css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}</head>
      <body>{children}</body>
    </html>
  );
}
