'use client';

import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.variable} font-sans h-full`}>
        <SessionProvider>
          <AuthProvider>
            <div className="min-h-full">
              <nav className="bg-white shadow-sm py-3">
                <div className="max-w-6xl mx-auto px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src="/apj.png" alt="APJ" className="h-20 w-auto object-contain" />
                      <div className="h-16 w-px bg-gray-300"></div>
                      <img src="/globe.jpeg" alt="Globe" className="h-20 w-auto object-contain" />
                    </div>
                    <div className="text-center">
                      <h1 className="text-xl font-bold text-blue-800 leading-tight">LEAD INDIA FOUNDATION</h1>
                      <div className="flex items-center justify-center space-x-2 mt-1">
                        <img src="/trsma.jpeg" alt="TRSMA" className="h-8 w-auto object-contain" />
                        <h2 className="text-lg font-semibold text-gray-900">TRSMA</h2>
                      </div>
                      <h3 className="text-sm font-medium text-blue-800 leading-tight">PRESENT KALAM&apos;S BEST TEACHER AWARD</h3>
                    </div>
                    <div className="flex items-center">
                      <img src="/kalam.jpg" alt="Kalam" className="h-24 w-auto object-contain" />
                    </div>
                  </div>
                </div>
              </nav>
              {children}
            </div>
            <Toaster position="top-right" />
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}