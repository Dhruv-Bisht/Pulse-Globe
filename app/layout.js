import "./globals.css";

export const metadata = {
  title: "Pulse Globe",
  description: "A read-only real-time globe for the latest global news."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}