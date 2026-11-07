import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

export const metadata = {
  title: 'Kisan India CRM — Telecalling & Lead Operations Platform',
  description: 'Enterprise workspace for Meta Lead Ads capture, telecaller operations, campaign pacing, and performance analytics.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] antialiased text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
