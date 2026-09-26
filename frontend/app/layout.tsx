import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata = {
  title: 'LegalLens AI — GenAI Legal Document Intelligence Platform',
  description: 'Understand legal documents, identify important clauses, highlight attention areas, ask grounded questions, and compare contract revisions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${jakarta.variable}`}>
      <body className="flex flex-col min-h-screen bg-[#FAFBFD] text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Navbar />
        <main id="main-content" role="main" className="flex-grow">{children}</main>
        <div id="live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only"></div>
        <Footer />
      </body>
    </html>
  );
}

