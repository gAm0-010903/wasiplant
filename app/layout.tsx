import './globals.css';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'WasiPlant',
  description: 'Sistema de Gestión',
  // Aquí forzamos al navegador a leer tu logo
  icons: {
    icon: '/wasi-plant.png',
    apple: '/wasi-plant.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-800">
        <Sidebar />
        {/* ml-20 deja espacio para el menú en PC. pb-20 deja espacio para la barra inferior en celular */}
        <main className="md:ml-20 pb-20 md:pb-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}