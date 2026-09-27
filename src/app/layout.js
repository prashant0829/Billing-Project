import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import StoreProvider from "@/store/StoreProvider";
import "./globals.scss";

export const metadata = { title: "Ledgerly", description: "Simple, auditable billing" };

const themeScript = `(function(){try{var t=localStorage.getItem("billkaro:theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>{children}</StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
