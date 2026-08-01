'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, Package, Users, Leaf, ArrowUpRight, AlertCircle, User, Calendar, Award } from 'lucide-react';

// Función para obtener la fecha correcta en la zona horaria local (evita desfases de UTC)
const obtenerFechaLocal = (fecha: Date) => {
  const offset = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - offset).toISOString().split('T')[0];
};

export default function Dashboard() {
  const [cargando, setCargando] = useState(true);
  
  // ✅ FILTROS PREDETERMINADOS A 7 DÍAS
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    return obtenerFechaLocal(hace7Dias);
  });
  
  const [fechaFin, setFechaFin] = useState(() => {
    const hoy = new Date();
    return obtenerFechaLocal(hoy);
  });

  const [metricas, setMetricas] = useState({
    ventasTotales: 0,
    ingresosReales: 0,
    porCobrar: 0,
    totalPedidos: 0,
    pedidosEnviados: 0
  });

  const [topPlantas, setTopPlantas] = useState<any[]>([]);
  const [topClientes, setTopClientes] = useState<any[]>([]);

  useEffect(() => {
    cargarEstadisticas();
  }, [fechaInicio, fechaFin]); // Se recarga automáticamente al cambiar las fechas

  const cargarEstadisticas = async () => {
    setCargando(true);
    try {
      const { data: cajas } = await supabase
        .from('cajas')
        .select(`
          id, created_at, estado, estado_envio,
          clientes (usuario_tiktok, nombre_completo),
          detalle_caja (cantidad, precio_vendido, plantas(nombre)),
          abonos (monto)
        `);

      if (cajas) {
        let vTotales = 0;
        let iReales = 0;
        let pCobrar = 0;
        let pEnviados = 0;

        const conteoPlantas: Record<string, { nombre: string, cantidad: number, ingresos: number }> = {};
        const conteoClientes: Record<string, { usuario: string, comprado: number, gastado: number }> = {};

        cajas.forEach((caja: any) => {
          // Extraemos solo la fecha (YYYY-MM-DD) usando el ajuste local
          const fechaCajaObj = new Date(caja.created_at);
          const fechaCajaStr = obtenerFechaLocal(fechaCajaObj);

          // FILTRAR POR FECHAS SI ESTÁN ACTIVAS
          if (fechaInicio && fechaCajaStr < fechaInicio) return;
          if (fechaFin && fechaCajaStr > fechaFin) return;

          const totalCaja = caja.detalle_caja.reduce((sum: number, item: any) => sum + (item.precio_vendido * item.cantidad), 0);
          const abonadoCaja = caja.abonos.reduce((sum: number, abono: any) => sum + abono.monto, 0);
          
          vTotales += totalCaja;
          iReales += abonadoCaja;
          
          if (caja.estado_envio === 'enviado') pEnviados++;

          // Ranking de Plantas
          caja.detalle_caja.forEach((item: any) => {
            const nombrePlanta = item.plantas?.nombre || 'Planta Eliminada';
            if (!conteoPlantas[nombrePlanta]) {
              conteoPlantas[nombrePlanta] = { nombre: nombrePlanta, cantidad: 0, ingresos: 0 };
            }
            conteoPlantas[nombrePlanta].cantidad += item.cantidad;
            conteoPlantas[nombrePlanta].ingresos += (item.cantidad * item.precio_vendido);
          });

          // Ranking de Clientes
          if (totalCaja > 0 && caja.clientes) {
            const usuario = caja.clientes.usuario_tiktok;
            if (!conteoClientes[usuario]) {
              conteoClientes[usuario] = { usuario, comprado: 0, gastado: 0 };
            }
            conteoClientes[usuario].comprado += 1;
            conteoClientes[usuario].gastado += totalCaja;
          }
        });

        pCobrar = vTotales - iReales;

        setMetricas({
          ventasTotales: vTotales,
          ingresosReales: iReales,
          porCobrar: pCobrar,
          totalPedidos: cajas.filter((c: any) => {
            const fechaObj = new Date(c.created_at);
            const f = obtenerFechaLocal(fechaObj);
            if (fechaInicio && f < fechaInicio) return false;
            if (fechaFin && f > fechaFin) return false;
            return true;
          }).length,
          pedidosEnviados: pEnviados
        });

        const arrayPlantas = Object.values(conteoPlantas).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
        const arrayClientes = Object.values(conteoClientes).sort((a, b) => b.gastado - a.gastado);

        setTopPlantas(arrayPlantas);
        setTopClientes(arrayClientes);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans text-gray-800 bg-gray-50/30">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-green-700 mb-1">Resumen de pedidos</h1>
          <p className="text-gray-500">Resumen financiero y rendimiento de ventas</p>
        </div>

        {/* FILTRO DE FECHAS PARA EL DASHBOARD */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
            <Calendar className="text-gray-400" size={16} />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Desde</span>
              <input type="date" className="bg-transparent border-none outline-none text-xs text-gray-700 py-0.5 cursor-pointer" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
            <Calendar className="text-gray-400" size={16} />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Hasta</span>
              <input type="date" className="bg-transparent border-none outline-none text-xs text-gray-700 py-0.5 cursor-pointer" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          {(fechaInicio || fechaFin) && (
            <button 
              onClick={() => {setFechaInicio(''); setFechaFin('');}} 
              className="text-xs font-bold text-red-500 hover:text-red-700 underline px-2 transition-colors"
            >
              Ver todo el historial
            </button>
          )}
        </div>
      </header>

      {/* TARJETAS DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-green-50 opacity-50 group-hover:scale-110 transition-transform"><TrendingUp size={120}/></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Ventas Brutas</p>
            <h2 className="text-3xl font-black text-gray-800">S/ {metricas.ventasTotales.toFixed(2)}</h2>
            <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1"><ArrowUpRight size={14}/> En el periodo seleccionado</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-blue-50 opacity-50 group-hover:scale-110 transition-transform"><DollarSign size={120}/></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1">Dinero Recaudado</p>
            <h2 className="text-3xl font-black text-blue-700">S/ {metricas.ingresosReales.toFixed(2)}</h2>
            <p className="text-xs text-blue-500 font-semibold mt-2">Abonos reales registrados</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-orange-500 opacity-10 group-hover:scale-110 transition-transform"><AlertCircle size={120}/></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-1">Saldo por Cobrar</p>
            <h2 className="text-3xl font-black text-orange-700">S/ {metricas.porCobrar.toFixed(2)}</h2>
            <p className="text-xs text-orange-600 font-semibold mt-2">Pendiente de pago</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-purple-50 opacity-50 group-hover:scale-110 transition-transform"><Package size={120}/></div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Pedidos</p>
            <h2 className="text-3xl font-black text-gray-800">{metricas.totalPedidos}</h2>
            <p className="text-xs text-purple-600 font-semibold mt-2">{metricas.pedidosEnviados} despachados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* RANKING DE PLANTAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Leaf className="text-green-600" size={20}/> Top Plantas Más Vendidas
          </h3>
          
          <div className="space-y-4">
            {topPlantas.length > 0 ? topPlantas.map((planta, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{planta.nombre}</p>
                    <p className="text-xs text-gray-500 font-semibold">{planta.cantidad} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-700">S/ {planta.ingresos.toFixed(2)}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-6">No hay datos en este rango de fechas.</p>
            )}
          </div>
        </div>

        {/* MEJORES CLIENTES CON TOP 3 RESALTADO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Users className="text-blue-600" size={20}/> Top Clientes Frecuentes
          </h3>
          
          {topClientes.length > 0 ? (
            <div className="space-y-6">
              {/* PODIO TOP 3 RESALTADO */}
              <div className="grid grid-cols-3 gap-3">
                {topClientes.slice(0, 3).map((cliente, index) => {
                  const estilosPodio = [
                    'bg-gradient-to-b from-yellow-50 to-yellow-100/50 border-yellow-200 text-yellow-800', // 1er Lugar (Oro)
                    'bg-gradient-to-b from-gray-50 to-gray-100/50 border-gray-200 text-gray-700',       // 2do Lugar (Plata)
                    'bg-gradient-to-b from-orange-50 to-orange-100/50 border-orange-200 text-orange-800' // 3er Lugar (Bronce)
                  ];
                  const coloresBadge = ['bg-yellow-500 text-white', 'bg-gray-400 text-white', 'bg-orange-500 text-white'];

                  return (
                    <div key={index} className={`flex flex-col items-center p-4 rounded-2xl border text-center relative overflow-hidden shadow-sm ${estilosPodio[index]}`}>
                      <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full ${coloresBadge[index]}`}>
                        #{index + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 mt-1">
                        <Award size={20} className={index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'} />
                      </div>
                      <p className="font-bold text-xs truncate w-full" title={`@${cliente.usuario}`}>@{cliente.usuario}</p>
                      <p className="font-black text-sm mt-1">S/ {cliente.gastado.toFixed(2)}</p>
                      <span className="text-[10px] opacity-75 mt-0.5">{cliente.comprado} pedidos</span>
                    </div>
                  );
                })}
              </div>

              {/* LISTA DEL RESTO DE CLIENTES (A partir del 4to) */}
              {topClientes.length > 3 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Otros compradores destacados</p>
                  {topClientes.slice(3, 8).map((cliente, index) => (
                    <div key={index + 3} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">
                          {index + 4}
                        </span>
                        <span className="font-bold text-gray-700">@{cliente.usuario}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-gray-800">S/ {cliente.gastado.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No hay datos en este rango de fechas.</p>
          )}
        </div>

      </div>
    </div>
  );
}