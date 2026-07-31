'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, MessageCircle, MapPin, User, Timer, PackageCheck, Truck } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      // Traemos a los clientes y sus cajas para ver su último estado
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          cajas (
            id, estado_envio, created_at
          )
        `);

      if (error) throw error;

      if (data) {
        // Procesamos para sacar el color de estado según su pedido más reciente
        const clientesProcesados = data.map(cliente => {
          let estadoLogistico = 'sin_pedidos';
          
          if (cliente.cajas && cliente.cajas.length > 0) {
            // Ordenamos para agarrar el último pedido
            const cajasOrdenadas = cliente.cajas.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const ultimoPedido = cajasOrdenadas[0];
            estadoLogistico = ultimoPedido.estado_envio || 'proceso';
          }

          return { ...cliente, estadoLogistico };
        });

        // Ordenamos alfabéticamente
        clientesProcesados.sort((a, b) => (a.usuario_tiktok || '').localeCompare(b.usuario_tiktok || ''));
        setClientes(clientesProcesados);
      }
    } catch (error: any) {
      alert("Error al cargar clientes: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const abrirWhatsApp = (celular: string) => {
    if (!celular) return alert("Este cliente no tiene un número de celular registrado.");
    const num = celular.replace(/\D/g, '');
    const numFinal = num.startsWith('51') ? num : `51${num}`;
    window.open(`https://wa.me/${numFinal}`, '_blank');
  };

  const clientesFiltrados = clientes.filter(c => 
    (c.usuario_tiktok || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.nombre_completo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.dni || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.celular || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans text-gray-800">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">👥 Directorio de Clientes</h1>
        <p className="text-gray-500">Gestión de contactos y seguimiento de estado</p>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por @usuario, nombre, DNI o celular..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition-all text-sm" 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      {cargando ? (
        <div className="text-center text-gray-500 py-10">Cargando directorio...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clientesFiltrados.map((cliente) => {
            // COLORES INTELIGENTES BASADOS EN EL HISTORIAL
            let colorClases = "";
            let IconoEstado = Timer;
            let textoEstado = "";

            switch(cliente.estadoLogistico) {
              case 'proceso':
                colorClases = "bg-gray-100 text-gray-700 border-gray-200";
                IconoEstado = Timer;
                textoEstado = "En Proceso";
                break;
              case 'listo':
                colorClases = "bg-blue-50 text-blue-700 border-blue-200";
                IconoEstado = PackageCheck;
                textoEstado = "Listo p/ Enviar";
                break;
              case 'enviado':
                colorClases = "bg-purple-50 text-purple-700 border-purple-200";
                IconoEstado = Truck;
                textoEstado = "Enviado";
                break;
              default:
                colorClases = "bg-gray-50 text-gray-400 border-gray-100";
                IconoEstado = User;
                textoEstado = "Sin pedidos";
            }

            return (
              <div key={cliente.id} className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col justify-between transition-all hover:shadow-md ${cliente.estadoLogistico === 'enviado' ? 'border-purple-200' : 'border-gray-100'}`}>
                
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-lg text-gray-800">@{cliente.usuario_tiktok}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border flex items-center gap-1 ${colorClases}`}>
                      <IconoEstado size={12}/> {textoEstado}
                    </span>
                  </div>
                  
                  {cliente.nombre_completo && (
                    <div className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2">
                      <User size={14}/> {cliente.nombre_completo}
                    </div>
                  )}

                  {(cliente.departamento || cliente.provincia || cliente.distrito) && (
                    <div className="text-xs text-gray-500 mt-2 flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 text-red-400 shrink-0"/>
                      <span className="line-clamp-2">
                        {[cliente.distrito, cliente.provincia, cliente.departamento].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm font-mono text-gray-600">
                    {cliente.celular ? cliente.celular : 'Sin celular'}
                  </div>
                  <button 
                    onClick={() => abrirWhatsApp(cliente.celular)}
                    disabled={!cliente.celular}
                    className={`p-2 rounded-xl transition-all flex items-center gap-2 ${cliente.celular ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                    title={cliente.celular ? 'Abrir WhatsApp' : 'No tiene celular registrado'}
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
      
      {!cargando && clientesFiltrados.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No se encontraron clientes con esa búsqueda.
        </div>
      )}
    </div>
  );
}