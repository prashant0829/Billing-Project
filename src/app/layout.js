import { AuthProvider } from "@/context/AuthContext";
import "./globals.scss";

export const metadata = { title: "Ledgerly", description: "Simple, auditable billing" };

export default function RootLayout({ children }) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
