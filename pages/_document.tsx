// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* --- FAVICONS --- */}
        <link rel="icon" href="/favicon.ico" />

        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />

        {/* Apple Touch Icon (iOS homescreen) */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Android / PWA icons are referenced inside the manifest */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* Optional: theme color */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-title" content="Quantum5ocial" />
        <meta name="application-name" content="Quantum5ocial" />

        {/* Optional: dark background for Windows tiles */}
        <meta name="msapplication-TileColor" content="#0f172a" />
      </Head>

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
