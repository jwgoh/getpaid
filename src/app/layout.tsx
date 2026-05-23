import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { cookies, headers } from "next/headers";

import { COOKIE_KEYS } from "@app/shared/config/config";
import { SEO } from "@app/shared/config/seo";
import {
  buildColorSchemeScript,
  DEFAULT_THEME_MODE,
  parseThemeMode,
} from "@app/shared/lib/theme-mode";

import { Providers } from "@app/providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const COLOR_SCHEME_INIT = buildColorSchemeScript(COOKIE_KEYS.THEME_MODE);

export const metadata: Metadata = {
  metadataBase: new URL(SEO.SITE_URL),
  title: {
    default: SEO.TITLE,
    template: `%s | ${SEO.SITE_NAME}`,
  },
  description: SEO.DESCRIPTION,
  openGraph: {
    type: "website",
    locale: SEO.LOCALE,
    url: SEO.SITE_URL,
    siteName: SEO.SITE_NAME,
    title: SEO.TITLE,
    description: SEO.DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.TITLE,
    description: SEO.DESCRIPTION,
    site: SEO.TWITTER_HANDLE,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const initialMode =
    parseThemeMode(cookieStore.get(COOKIE_KEYS.THEME_MODE)?.value) ?? DEFAULT_THEME_MODE;
  const nonce = headerStore.get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_INIT }} />
      </head>
      <body className={outfit.variable}>
        <Providers initialMode={initialMode}>{children}</Providers>
      </body>
    </html>
  );
}
