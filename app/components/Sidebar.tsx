'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, BarChart2, Sprout, Users } from 'lucide-react';

export default function Sidebar() {
  const [expandido, setExpandido] = useState(false);
  const rutaActual = usePathname();

  const opcionesMenu = [
    { nombre: 'Panel en Vivo', ruta: '/', icono: <Home size={24} /> },
    { nombre: 'Historial', ruta: '/historial', icono: <Clock size={24} /> },
    { nombre: 'Clientes', ruta: '/clientes', icono: <Users size={24} /> },
    { nombre: 'Dashboard', ruta: '/dashboard', icono: <BarChart2 size={24} /> },
  ];

  return (
    <>
      {/* Fondo oscuro SOLO para celulares cuando se expande el menú */}
      {expandido && (
        <div 
          className="fixed inset-0 bg-gray-900/20 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setExpandido(false)}
        />
      )}

      {/* Contenedor del Menú Expandible */}
      <div
        onMouseEnter={() => setExpandido(true)}
        onMouseLeave={() => setExpandido(false)}
        onClick={() => setExpandido(true)}
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-all duration-300 ease-in-out flex flex-col border-r border-gray-100 overflow-hidden
          ${expandido ? 'w-64' : 'w-16 md:w-20'}
        `}
      >
        {/* ZONA DEL LOGO */}
        <div className="flex items-center h-20 border-b border-gray-100 px-4 md:px-6">
          <div className="text-green-600 shrink-0 flex items-center justify-center">
            {/* Ícono temporal. Luego pondremos tu logo */}
            <Sprout size={32} />
          </div>
          <span className={`font-black text-2xl text-green-700 whitespace-nowrap transition-all duration-300 
            ${expandido ? 'ml-4 opacity-100' : 'ml-0 opacity-0 w-0 overflow-hidden'}
          `}>
            WasiPlant
          </span>
        </div>

        {/* ZONA DE NAVEGACIÓN */}
        <nav className="flex-1 mt-6 flex flex-col gap-3 px-2 md:px-3">
          {opcionesMenu.map((item) => {
            const activo = rutaActual === item.ruta;
            return (
              <Link key={item.ruta} href={item.ruta} onClick={() => setExpandido(false)}>
                <div className={`flex items-center rounded-xl transition-all duration-200 cursor-pointer p-3
                  ${activo ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                  ${!expandido && 'justify-center'}
                `}>
                  
                  {/* Ícono */}
                  <div className="shrink-0 flex items-center justify-center">
                    {item.icono}
                  </div>
                  
                  {/* Texto Oculto/Visible */}
                  <span className={`font-semibold whitespace-nowrap transition-all duration-300 
                    ${expandido ? 'ml-4 opacity-100 translate-x-0' : 'ml-0 opacity-0 w-0 overflow-hidden -translate-x-4'}
                  `}>
                    {item.nombre}
                  </span>
                  
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}