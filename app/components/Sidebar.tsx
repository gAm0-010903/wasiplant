'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, Users, BarChart2 } from 'lucide-react'; // Se quitó Leaf ya que usaremos tu logo

export default function Sidebar() {
  const pathname = usePathname();

  const menu = [
    { name: 'Panel', path: '/', icon: Home },
    { name: 'Historial', path: '/historial', icon: Clock },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Dashboard', path: '/dashboard', icon: BarChart2 },
  ];

  return (
    <>
      {/* 💻 VISTA COMPUTADORA: Menú Lateral Izquierdo */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-20 bg-white border-r border-gray-100 flex-col items-center py-8 z-50">
        
        {/* AQUÍ VA TU LOGO */}
        <div className="mb-8 flex justify-center items-center p-1">
          <img 
            src="/wasi-plant.png" 
            alt="WasiPlant Logo" 
            className="w-12 h-12 object-contain drop-shadow-sm" 
          />
        </div>

        <nav className="flex flex-col gap-6 w-full items-center">
          {menu.map((item) => {
            const activo = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                title={item.name} 
                className={`p-3 rounded-xl transition-all ${activo ? 'bg-green-50 text-green-600 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <item.icon size={24} className={activo ? 'stroke-[2.5px]' : ''} />
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 📱 VISTA CELULAR: Barra Inferior Estilo App */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {menu.map((item) => {
          const activo = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activo ? 'text-green-600' : 'text-gray-400'}`}
            >
              <item.icon size={22} className={activo ? 'stroke-[2.5px] scale-110 transition-transform' : 'transition-transform'} />
              <span className={`text-[9px] tracking-wide ${activo ? 'font-black' : 'font-semibold'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}