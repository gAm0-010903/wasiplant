import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WasiPlant',
  description: 'Sistema de gestión de plantas y abonos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 flex`}>
        <Sidebar />
        {/* El "pl-16 md:pl-20" asegura que el contenido siempre empiece DESPUÉS de la barra de íconos */}
        <main className="flex-1 w-full min-h-screen pl-16 md:pl-20 transition-all duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}