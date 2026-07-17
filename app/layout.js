import "./globals.css";

export const metadata = {
  title: "JBL Predikcia · SKLC3",
  description: "Denná a hodinová predikcia jobline pre SKLC3 AutoStore",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
