import "./globals.css";

export const metadata = {
  title: "Pulse Globe",
  description: "A read-only live global news globe."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}