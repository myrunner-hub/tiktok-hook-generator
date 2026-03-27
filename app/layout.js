import "./globals.css";

export const metadata = {
  title: "TikTok Hook Generator",
  description: "Generate viral TikTok hooks in seconds",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
