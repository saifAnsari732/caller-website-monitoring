import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'KisanConnect CRM - Telecalling & Lead Management Platform',
  description: 'Enterprise monitoring dashboard for lead ingestion, telecaller activity, and campaign tracking.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-[#F8FAFC] antialiased text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
          {children}
        </div>
      </body>
    </html>
  );
}
