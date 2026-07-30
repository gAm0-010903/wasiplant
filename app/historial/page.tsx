'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Calendar, Package, DollarSign, CheckCircle2, Clock, Unlock, Trash2, Lock, ChevronDown, ChevronUp, Truck, PackageCheck, Timer, Image as ImageIcon, MapPin, Edit, Save, Copy, Building2, Home, User } from 'lucide-react';

export default function Historial() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // FILTROS
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarAntiguos, setMostrarAntiguos] = useState(false); 
  
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

  // Estados para Ubigeo
  const [ubigeoData, setUbigeoData] = useState<any[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  
  // Estados para Edición de Envío
  const [editandoEnvioId, setEditandoEnvioId] = useState<string | null>(null);
  const [listaProvincias, setListaProvincias] = useState<string[]>([]);
  const [listaDistritos, setListaDistritos] = useState<string[]>([]);
  const [agenciasSugeridas, setAgenciasSugeridas] = useState<string[]>([]);

  const [formEnvio, setFormEnvio] = useState({ 
    nombre_completo: '', dni: '', direccion: '',
    tipo_entrega: 'agencia', 
    departamento: '', provincia: '', distrito: '', 
    courier: '', agencia_departamento: '', agencia_provincia: '', agencia_distrito: '', agencia_direccion: '' 
  });

  const empresasCourier = ['SHALOM', 'OLVA COURIER', 'MARVISUR', 'MÓVIL BUS', 'CIVA', 'CAVASSA', 'FLORES', 'OTRO'];

  useEffect(() => {
    cargarHistorial();
    cargarUbigeoPeru();
  }, []);

  const cargarUbigeoPeru = async () => {
    try {
      const res = await fetch('https://raw.githubusercontent.com/jmcastagnetto/ubigeo-peru-aumentado/main/ubigeo_distrito.json');
      const data = await res.json();
      setUbigeoData(data);
      setListaDepartamentos([...new Set(data.map((i: any) => i.departamento))].sort() as string[]);
    } catch (error) {
      console.error("Error al cargar Ubigeo", error);
    }
  };

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('cajas')
        .select(`
          id, created_at, estado, estado_envio, tipo_entrega, courier, agencia_departamento, agencia_provincia, agencia_distrito, agencia_direccion,
          cliente_id, 
          clientes (id, usuario_tiktok, nombre_completo, dni, departamento, provincia, distrito, direccion), 
          detalle_caja (cantidad, precio_vendido, plantas (nombre, imagen_url)), 
          abonos (monto)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        const cajasProcesadas = data.map((caja: any) => {
          const totalCaja = caja.detalle_caja.reduce((sum: number, item: any) => sum + (item.precio_vendido * item.cantidad), 0);
          const totalAbonado = caja.abonos.reduce((sum: number, abono: any) => sum + abono.monto, 0);
          const saldo = totalCaja - totalAbonado;
          const cantidadPlantas = caja.detalle_caja.reduce((sum: number, item: any) => sum + item.cantidad, 0);

          let { tipo_entrega, courier, agencia_departamento, agencia_provincia, agencia_distrito, agencia_direccion } = caja;

          // 🔥 MAGIA DE HERENCIA CORREGIDA 🔥
          // Si NO tiene un departamento de agencia guardado y NO tiene un courier (es decir, está en blanco)
          if (!agencia_departamento && !courier) {
            
            // Busca hacia atrás el pedido anterior de este cliente que SÍ tenga datos
            const cajaAnterior = data.find(c => c.cliente_id === caja.cliente_id && c.id !== caja.id && (c.agencia_departamento || c.courier));

            if (cajaAnterior) {
              // Copiamos absolutamente todo del pedido anterior
              tipo_entrega = cajaAnterior.tipo_entrega || 'agencia';
              courier = cajaAnterior.courier;
              agencia_departamento = cajaAnterior.agencia_departamento;
              agencia_provincia = cajaAnterior.agencia_provincia;
              agencia_distrito = cajaAnterior.agencia_distrito;
              agencia_direccion = cajaAnterior.agencia_direccion;
            } else if (caja.clientes?.departamento) {
              // Si no hay pedidos anteriores pero tiene datos en su perfil de cliente
              tipo_entrega = 'agencia';
              agencia_departamento = caja.clientes.departamento;
              agencia_provincia = caja.clientes.provincia;
              agencia_distrito = caja.clientes.distrito;
            }
          }

          // Seguridad: Si aún así queda nulo, forzar a que sea Agencia por defecto
          if (!tipo_entrega) tipo_entrega = 'agencia';

          return { 
            ...caja, totalCaja, totalAbonado, saldo, cantidadPlantas,
            tipo_entrega, courier, agencia_departamento, agencia_provincia, agencia_distrito, agencia_direccion
          };
        });
        setCajas(cajasProcesadas);
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const buscarAgenciasPrevias = async (distrito: string) => {
    if(!distrito) { setAgenciasSugeridas([]); return; }
    const { data } = await supabase.from('cajas').select('agencia_direccion').eq('agencia_distrito', distrito).not('agencia_direccion', 'is', null);
    if (data) {
      const unicas = [...new Set(data.map((d: any) => d.agencia_direccion))];
      setAgenciasSugeridas(unicas as string[]);
    }
  };

  const toggleFila = (caja: any) => {
    if (filaExpandida === caja.id) {
      setFilaExpandida(null);
      setEditandoEnvioId(null);
    } else {
      setFilaExpandida(caja.id);
      setEditandoEnvioId(null);
    }
  };

  const iniciarEdicionEnvio = async (caja: any) => {
    setEditandoEnvioId(caja.id);
    const cliente = caja.clientes || {};
    
    // Al abrir el editor, carga los datos heredados automáticamente
    const tipo = caja.tipo_entrega;
    const dpto = caja.agencia_departamento;
    const prov = caja.agencia_provincia;
    const dist = caja.agencia_distrito;

    setFormEnvio({
      nombre_completo: cliente.nombre_completo || '', dni: cliente.dni || '', direccion: cliente.direccion || '',
      tipo_entrega: tipo || 'agencia',
      departamento: cliente.departamento || '', provincia: cliente.provincia || '', distrito: cliente.distrito || '',
      courier: caja.courier || '', agencia_departamento: dpto || '', agencia_provincia: prov || '', agencia_distrito: dist || '', agencia_direccion: caja.agencia_direccion || ''
    });

    if (dpto) setListaProvincias([...new Set(ubigeoData.filter((i: any) => i.departamento === dpto).map((i: any) => i.provincia))].sort() as string[]);
    if (dpto && prov) setListaDistritos([...new Set(ubigeoData.filter((i: any) => i.departamento === dpto && i.provincia === prov).map((i: any) => i.distrito))].sort() as string[]);
    if (tipo === 'agencia' && dist) buscarAgenciasPrevias(dist);
  };

  const actualizarListasUbigeo = (dpto: string, prov: string = '') => {
    if (dpto) {
      setListaProvincias([...new Set(ubigeoData.filter((i: any) => i.departamento === dpto).map((i: any) => i.provincia))].sort() as string[]);
      if (prov) setListaDistritos([...new Set(ubigeoData.filter((i: any) => i.departamento === dpto && i.provincia === prov).map((i: any) => i.distrito))].sort() as string[]);
      else setListaDistritos([]);
    } else {
      setListaProvincias([]); setListaDistritos([]);
    }
  };

  const guardarEnvio = async (caja: any) => {
    const cliente = caja.clientes;
    let actualizoPerfil = false;

    const nuevoDpto = formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_departamento : formEnvio.departamento;
    const nuevoProv = formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_provincia : formEnvio.provincia;
    const nuevoDist = formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_distrito : formEnvio.distrito;

    if (cliente.departamento && (cliente.departamento !== nuevoDpto || cliente.provincia !== nuevoProv || cliente.distrito !== nuevoDist)) {
      const confirmar = window.confirm(`⚠️ ADVERTENCIA: La ubicación original de este cliente era ${cliente.distrito}, ${cliente.provincia}, ${cliente.departamento}.\n\nHoy estás enviando a ${nuevoDist}, ${nuevoProv}, ${nuevoDpto}.\n\n¿Deseas que esta nueva ubicación quede guardada en su perfil como predeterminada para el futuro?`);
      if (confirmar) actualizoPerfil = true;
    } else if (!cliente.departamento && nuevoDpto) {
      actualizoPerfil = true;
    }

    setCargando(true);
    await supabase.from('cajas').update({
      tipo_entrega: formEnvio.tipo_entrega,
      courier: formEnvio.tipo_entrega === 'agencia' ? formEnvio.courier : null,
      agencia_departamento: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_departamento : null,
      agencia_provincia: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_provincia : null,
      agencia_distrito: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_distrito : null,
      agencia_direccion: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_direccion : null
    }).eq('id', caja.id);

    let datosAActualizarCliente: any = { nombre_completo: formEnvio.nombre_completo, dni: formEnvio.dni };
    if (formEnvio.tipo_entrega === 'domicilio') datosAActualizarCliente.direccion = formEnvio.direccion;
    
    if (actualizoPerfil) {
      datosAActualizarCliente.departamento = nuevoDpto;
      datosAActualizarCliente.provincia = nuevoProv;
      datosAActualizarCliente.distrito = nuevoDist;
    }

    await supabase.from('clientes').update(datosAActualizarCliente).eq('id', caja.cliente_id);

    setEditandoEnvioId(null);
    cargarHistorial(); 
    setCargando(false);
  };

  const copiarResumen = async (caja: any) => {
    const nombre = caja.clientes?.nombre_completo || `@${caja.clientes?.usuario_tiktok}`;
    const fechaObj = new Date(caja.created_at);
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const claveSecreta = `${dd}${mm}`;

    let texto = `🌱 *RESUMEN DE TU COMPRA - WASIPLANT* 🌱\n`;
    texto += `¡Hola ${nombre}! Aquí tienes el detalle de tu pedido:\n\n`;
    texto += `🔑 *CLAVE DE PEDIDO:* ${claveSecreta}\n\n`;
    texto += `📦 *PLANTAS ELEGIDAS:*\n`;
    caja.detalle_caja.forEach((item: any) => {
      texto += `- ${item.cantidad}x ${item.plantas?.nombre} (S/ ${item.precio_vendido.toFixed(2)}) = S/ ${(item.cantidad * item.precio_vendido).toFixed(2)}\n`;
    });
    
    texto += `\n💰 *DETALLE DE PAGO:*\n`;
    texto += `Total del pedido: S/ ${caja.totalCaja.toFixed(2)}\n`;
    texto += `Monto abonado: S/ ${caja.totalAbonado.toFixed(2)}\n`;
    texto += `Saldo pendiente: S/ ${caja.saldo.toFixed(2)}\n\n`;
    
    texto += `📍 *LUGAR DE ENVÍO:*\n`;
    if (caja.tipo_entrega === 'agencia') {
      texto += `Modalidad: Recojo en Agencia (${caja.courier || 'Por definir'})\n`;
      const ubigeo = [caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ');
      texto += `Destino: ${ubigeo || 'Pendiente'}\n`;
      if (caja.agencia_direccion) texto += `Agencia: ${caja.agencia_direccion}\n`;
    } else {
      texto += `Modalidad: Envío a Domicilio\n`;
      const ubigeo = [caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ');
      texto += `Destino: ${ubigeo || 'Pendiente'}\n`;
    }
    
    texto += `\n¡Muchísimas gracias por tu preferencia! 💚`;
    
    try {
      await navigator.clipboard.writeText(texto);
      alert("¡Mensaje copiado! Listo para enviarlo a tu cliente.");
    } catch (err) {
      alert("Error al copiar el texto.");
    }
  };

  const reabrirCaja = async (e: React.MouseEvent, idCaja: string, idCliente: string, usuario: string) => {
    e.stopPropagation(); 
    if (!window.confirm(`¿Devolver el pedido de @${usuario} al Panel en Vivo?`)) return;
    setCargando(true);
    await supabase.from('cajas').update({ estado: 'cerrada' }).eq('cliente_id', idCliente).eq('estado', 'abierta').neq('id', idCaja);
    await supabase.from('cajas').update({ estado: 'abierta', estado_envio: 'proceso' }).eq('id', idCaja);
    cargarHistorial(); 
  };

  const eliminarCaja = async (e: React.MouseEvent, idCaja: string) => {
    e.stopPropagation();
    if (!window.confirm("¡ATENCIÓN! ¿Estás seguro de eliminar TODO este pedido?")) return;
    setCargando(true);
    await supabase.from('detalle_caja').delete().eq('caja_id', idCaja);
    await supabase.from('abonos').delete().eq('caja_id', idCaja);
    await supabase.from('cajas').delete().eq('id', idCaja);
    cargarHistorial(); 
  };

  // Guardar permanente los datos heredados si presionamos los botones de logística
  const cambiarEstadoEnvio = async (caja: any, nuevoEstado: string, estadoActual: string) => {
    if (estadoActual === 'enviado') return alert("Este pedido ya fue enviado y está bloqueado.");
    if (nuevoEstado === 'enviado') {
        if (!window.confirm("📦 ALERTA: Al marcar como 'Pedido Enviado', este registro se BLOQUEARÁ. ¿Deseas continuar?")) return;
    }
    setCargando(true);
    // Grabamos los datos de agencia en la base de datos para que la herencia sea permanente
    await supabase.from('cajas').update({ 
      estado_envio: nuevoEstado,
      tipo_entrega: caja.tipo_entrega,
      courier: caja.courier,
      agencia_departamento: caja.agencia_departamento,
      agencia_provincia: caja.agencia_provincia,
      agencia_distrito: caja.agencia_distrito,
      agencia_direccion: caja.agencia_direccion
    }).eq('id', caja.id);
    
    if (nuevoEstado === 'enviado') setFilaExpandida(null); 
    cargarHistorial();
  };

  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  const cajasFiltradas = cajas.filter(caja => {
    const termino = busqueda.toLowerCase();
    const cliente = caja.clientes || {};
    
    const coincideBusqueda = (
      (cliente.usuario_tiktok || '').toLowerCase().includes(termino) ||
      (cliente.nombre_completo || '').toLowerCase().includes(termino) ||
      (cliente.dni || '').toLowerCase().includes(termino) ||
      (caja.agencia_distrito || '').toLowerCase().includes(termino) ||
      (caja.agencia_departamento || '').toLowerCase().includes(termino) ||
      (cliente.distrito || '').toLowerCase().includes(termino) ||
      (cliente.departamento || '').toLowerCase().includes(termino)
    );

    const fechaCaja = new Date(caja.created_at);
    const soloFechaStr = fechaCaja.toISOString().split('T')[0];

    let coincideRango = true;
    if (fechaInicio && fechaFin) coincideRango = soloFechaStr >= fechaInicio && soloFechaStr <= fechaFin;
    else if (fechaInicio) coincideRango = soloFechaStr >= fechaInicio;
    else if (fechaFin) coincideRango = soloFechaStr <= fechaFin;

    let coincideAntiguedad = true;
    if (!mostrarAntiguos && !fechaInicio && !fechaFin && !busqueda) {
      coincideAntiguedad = fechaCaja >= haceUnaSemana;
    }

    return coincideBusqueda && coincideRango && coincideAntiguedad;
  });

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans text-gray-800">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">🕒 Historial de Ventas</h1>
        <p className="text-gray-500">Gestión de pedidos, cobranzas y logística inteligente</p>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="relative w-full md:col-span-5">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar por @usuario, nombre, DNI o distrito..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition-all text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        
        <div className="md:col-span-7 flex flex-wrap xl:flex-nowrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 flex-1">
            <Calendar className="text-gray-400" size={18} />
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Desde</span>
              <input type="date" className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 w-full" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 flex-1">
            <Calendar className="text-gray-400" size={18} />
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Hasta</span>
              <input type="date" className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 w-full" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          {(fechaInicio || fechaFin || busqueda) && (
            <button onClick={() => {setFechaInicio(''); setFechaFin(''); setBusqueda('');}} className="text-xs font-bold text-red-500 hover:text-red-700 underline px-2">Limpiar</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="p-4 font-semibold w-10"></th>
                <th className="p-4 font-semibold">Fecha</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold text-center">Destino</th>
                <th className="p-4 font-semibold text-center">Monto Total</th>
                <th className="p-4 font-semibold text-center">Cobro</th>
                <th className="p-4 font-semibold text-center">Logística</th>
                <th className="p-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cajasFiltradas.length > 0 ? (
                cajasFiltradas.map((caja) => {
                  const fecha = new Date(caja.created_at);
                  const dia = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
                  
                  const estaPagado = caja.saldo <= 0 && caja.totalCaja > 0;
                  const estaAbierta = caja.estado === 'abierta'; 
                  const estadoEnvio = caja.estado_envio || 'proceso';
                  const estaBloqueado = estadoEnvio === 'enviado'; 

                  return (
                    <React.Fragment key={caja.id}>
                      <tr className={`hover:bg-green-50/30 transition-colors cursor-pointer ${estaBloqueado ? 'bg-gray-50/50' : ''}`} onClick={() => toggleFila(caja)}>
                        <td className="p-4 text-gray-400">{filaExpandida === caja.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</td>
                        <td className="p-4 font-semibold text-gray-800 text-sm whitespace-nowrap">{dia}</td>
                        <td className="p-4">
                          <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg text-sm whitespace-nowrap">@{caja.clientes?.usuario_tiktok}</span>
                          {estaAbierta && <span className="block mt-1 text-[10px] text-blue-500 font-bold uppercase tracking-wider">🔴 Editando...</span>}
                        </td>
                        
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center text-xs">
                            {caja.tipo_entrega === 'agencia' ? (
                              <>
                                <span className="font-bold text-blue-700 flex items-center gap-1"><Building2 size={12}/> {caja.courier || 'Agencia'}</span>
                                <span className="text-gray-500 max-w-[120px] truncate" title={[caja.agencia_distrito, caja.agencia_provincia].filter(Boolean).join(', ')}>
                                  {[caja.agencia_distrito, caja.agencia_provincia].filter(Boolean).join(', ') || 'Sin destino'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-green-700 flex items-center gap-1"><Home size={12}/> Domicilio</span>
                                <span className="text-gray-500 max-w-[120px] truncate" title={[caja.clientes?.distrito, caja.clientes?.provincia].filter(Boolean).join(', ')}>
                                  {[caja.clientes?.distrito, caja.clientes?.provincia].filter(Boolean).join(', ') || 'Sin destino'}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className={`p-4 text-center font-bold text-gray-700 whitespace-nowrap`}>S/ {caja.totalCaja.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex flex-col items-center justify-center">
                            {estaPagado ? (
                              <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full w-full max-w-[100px] text-center"><CheckCircle2 size={14} className="inline mr-1"/> OK</span>
                            ) : (
                              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full w-full max-w-[120px] text-center whitespace-nowrap">Falta S/{caja.saldo.toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {estadoEnvio === 'proceso' && <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap"><Timer size={14} className="inline mb-0.5 mr-1"/> Proceso</span>}
                          {estadoEnvio === 'listo' && <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full whitespace-nowrap"><PackageCheck size={14} className="inline mb-0.5 mr-1"/> Listo</span>}
                          {estadoEnvio === 'enviado' && <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full whitespace-nowrap"><Truck size={14} className="inline mb-0.5 mr-1"/> Enviado</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            {estaBloqueado ? (
                              <span className="p-2 text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"><Lock size={18} /></span>
                            ) : (
                              <>
                                {!estaAbierta && <button onClick={(e) => reabrirCaja(e, caja.id, caja.cliente_id, caja.clientes?.usuario_tiktok)} title="Editar en Panel" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Unlock size={18} /></button>}
                                <button onClick={(e) => eliminarCaja(e, caja.id)} title="Eliminar Caja" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {filaExpandida === caja.id && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50/50 p-0 border-b border-gray-100">
                            <div className="p-4 md:p-6 m-4 bg-white rounded-2xl shadow-sm border border-gray-200">
                              
                              <div className="flex flex-col xl:flex-row gap-8 mb-8">
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><Package size={20} className="text-green-600"/> Resumen de Plantas</h4>
                                    <button onClick={() => copiarResumen(caja)} className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-green-200">
                                      <Copy size={16} /> Copiar Mensaje
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {caja.detalle_caja.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        {item.plantas?.imagen_url ? <img src={item.plantas.imagen_url} className="w-14 h-14 object-cover rounded-lg border border-gray-200" /> : <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"><ImageIcon size={24} /></div>}
                                        <div className="flex-1">
                                          <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.plantas?.nombre}</p>
                                          <p className="text-xs text-gray-500">{item.cantidad} x S/ {item.precio_vendido.toFixed(2)}</p>
                                        </div>
                                        <div className="font-black text-gray-700 text-sm">S/ {(item.cantidad * item.precio_vendido).toFixed(2)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="w-full xl:w-72 bg-blue-50/50 border border-blue-100 rounded-2xl p-5 h-fit">
                                  <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><DollarSign size={20} className="text-blue-600"/> Detalle de Pago</h4>
                                  <div className="space-y-3">
                                    <div className="flex justify-between text-sm text-gray-600"><span>Total:</span> <span>S/ {caja.totalCaja.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm text-gray-600"><span>Abonado:</span> <span className="text-blue-600 font-bold">- S/ {caja.totalAbonado.toFixed(2)}</span></div>
                                    <div className="pt-3 border-t border-blue-200 flex justify-between font-black text-lg">
                                      <span className="text-gray-800">Saldo Final:</span>
                                      <span className={caja.saldo > 0 ? 'text-orange-600' : 'text-green-600'}>S/ {caja.saldo.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                <div>
                                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><MapPin size={18} className="text-red-500"/> Datos del Cliente y Envío</h4>
                                  
                                  {editandoEnvioId === caja.id ? (
                                    <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200 animate-fade-in">
                                      
                                      <div className="space-y-3 pb-4 border-b border-gray-200">
                                        <h5 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1"><User size={14}/> 1. Información Personal</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                                            <input type="text" className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500" value={formEnvio.nombre_completo} onChange={(e) => setFormEnvio({...formEnvio, nombre_completo: e.target.value})} placeholder="Ej. Juan Pérez" />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">DNI <span className="text-gray-400 font-normal">(Opcional)</span></label>
                                            <input type="text" maxLength={8} className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 font-mono" value={formEnvio.dni} onChange={(e) => setFormEnvio({...formEnvio, dni: e.target.value.replace(/\D/g, '')})} placeholder="8 dígitos" />
                                          </div>
                                        </div>
                                      </div>

                                      <h5 className="text-xs font-black text-gray-500 uppercase tracking-wider mt-2">2. Modalidad y Destino</h5>
                                      <div className="flex gap-2">
                                        <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'agencia'})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'agencia' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}><Building2 size={16}/> Por Agencia</button>
                                        <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'domicilio'})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'domicilio' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}><Home size={16}/> A Domicilio</button>
                                      </div>

                                      {formEnvio.tipo_entrega === 'agencia' ? (
                                        <div className="space-y-3 pt-2">
                                          <label className="block text-xs font-bold text-gray-600">Empresa Courier</label>
                                          <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 font-semibold" value={formEnvio.courier} onChange={(e) => setFormEnvio({...formEnvio, courier: e.target.value})}>
                                            <option value="">Seleccione Empresa...</option>
                                            {empresasCourier.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                                          </select>

                                          <label className="block text-xs font-bold text-gray-600 mt-2">Destino de la Agencia (Ubigeo)</label>
                                          <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500" value={formEnvio.agencia_departamento} onChange={(e) => {
                                            actualizarListasUbigeo(e.target.value);
                                            setFormEnvio({...formEnvio, agencia_departamento: e.target.value, agencia_provincia: '', agencia_distrito: ''});
                                          }}>
                                            <option value="">Departamento...</option>
                                            {listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                                          </select>
                                          <div className="grid grid-cols-2 gap-2">
                                            <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 disabled:opacity-50" disabled={!formEnvio.agencia_departamento} value={formEnvio.agencia_provincia} onChange={(e) => {
                                              actualizarListasUbigeo(formEnvio.agencia_departamento, e.target.value);
                                              setFormEnvio({...formEnvio, agencia_provincia: e.target.value, agencia_distrito: ''});
                                            }}>
                                              <option value="">Provincia...</option>
                                              {listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 disabled:opacity-50" disabled={!formEnvio.agencia_provincia} value={formEnvio.agencia_distrito} onChange={(e) => {
                                              setFormEnvio({...formEnvio, agencia_distrito: e.target.value});
                                              buscarAgenciasPrevias(e.target.value);
                                            }}>
                                              <option value="">Distrito...</option>
                                              {listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                          </div>

                                          <label className="block text-xs font-bold text-gray-600 mt-2">Nombre o Dirección de la Agencia</label>
                                          <input type="text" placeholder="Ej. Agencia Principal, Frente a Plaza..." className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500" value={formEnvio.agencia_direccion} onChange={(e) => setFormEnvio({...formEnvio, agencia_direccion: e.target.value})} list="sugerenciasAgencias" />
                                          <datalist id="sugerenciasAgencias">
                                            {agenciasSugeridas.map((agencia, i) => <option key={i} value={agencia} />)}
                                          </datalist>
                                        </div>
                                      ) : (
                                        <div className="space-y-3 pt-2">
                                          <label className="block text-xs font-bold text-gray-600 mt-2">Ubigeo del Domicilio del Cliente</label>
                                          <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500" value={formEnvio.departamento} onChange={(e) => {
                                            actualizarListasUbigeo(e.target.value);
                                            setFormEnvio({...formEnvio, departamento: e.target.value, provincia: '', distrito: ''});
                                          }}>
                                            <option value="">Departamento...</option>
                                            {listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                                          </select>
                                          <div className="grid grid-cols-2 gap-2">
                                            <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 disabled:opacity-50" disabled={!formEnvio.departamento} value={formEnvio.provincia} onChange={(e) => {
                                              actualizarListasUbigeo(formEnvio.departamento, e.target.value);
                                              setFormEnvio({...formEnvio, provincia: e.target.value, distrito: ''});
                                            }}>
                                              <option value="">Provincia...</option>
                                              {listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <select className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 disabled:opacity-50" disabled={!formEnvio.provincia} value={formEnvio.distrito} onChange={(e) => setFormEnvio({...formEnvio, distrito: e.target.value})}>
                                              <option value="">Distrito...</option>
                                              {listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                          </div>
                                          
                                          <label className="block text-xs font-bold text-gray-600 mt-2">Dirección Exacta <span className="text-gray-400 font-normal">(Calle, Mz, Lote, Ref)</span></label>
                                          <input type="text" placeholder="Ej. Av. Los Pinos 123..." className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500" value={formEnvio.direccion} onChange={(e) => setFormEnvio({...formEnvio, direccion: e.target.value})} />
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                                        <button onClick={() => setEditandoEnvioId(null)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors">Cancelar</button>
                                        <button onClick={() => guardarEnvio(caja)} disabled={cargando} className="bg-green-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md"><Save size={16}/> Guardar Datos</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between bg-gray-50 p-5 rounded-xl border border-gray-100 h-full">
                                      <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-wider mb-2 px-2 py-0.5 rounded-full w-fit ${caja.tipo_entrega === 'agencia' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                          {caja.tipo_entrega === 'agencia' ? `🏢 AGENCIA: ${caja.courier || 'Pendiente'}` : '🏡 A DOMICILIO'}
                                        </span>
                                        
                                        {(caja.clientes?.nombre_completo || caja.clientes?.dni) && (
                                          <span className="text-xs text-gray-600 mb-1 flex items-center gap-1 font-semibold">
                                            <User size={12}/> {caja.clientes?.nombre_completo || 'Sin nombre'} {caja.clientes?.dni ? `(DNI: ${caja.clientes.dni})` : ''}
                                          </span>
                                        )}

                                        <span className="text-sm font-bold text-gray-800 mt-1">
                                          {caja.tipo_entrega === 'agencia' 
                                            ? [caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ') || 'Ubigeo no configurado'
                                            : [caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ') || 'Ubigeo no configurado'
                                          }
                                        </span>
                                        
                                        {caja.tipo_entrega === 'agencia' && caja.agencia_direccion && (
                                          <span className="text-xs text-gray-500 mt-1 italic">📌 Ref: {caja.agencia_direccion}</span>
                                        )}
                                        {caja.tipo_entrega === 'domicilio' && caja.clientes?.direccion && (
                                          <span className="text-xs text-gray-500 mt-1 italic">📌 Dir: {caja.clientes?.direccion}</span>
                                        )}
                                      </div>
                                      <button onClick={() => iniciarEdicionEnvio(caja)} disabled={estaBloqueado} className={`p-3 bg-white rounded-xl shadow-sm border border-gray-200 transition-colors ${estaBloqueado ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`} title="Editar datos y ubicación"><Edit size={18}/></button>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Truck size={18} className="text-purple-600"/> Estado del Paquete</h4>
                                  <div className="flex flex-col gap-2">
                                    {estaAbierta && <p className="text-xs text-orange-600 font-semibold mb-1">⚠️ Cierra la caja en el Panel en Vivo para despachar.</p>}
                                    <div className="flex flex-wrap gap-3">
                                      <button onClick={() => cambiarEstadoEnvio(caja, 'proceso', estadoEnvio)} disabled={estaBloqueado} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${estadoEnvio === 'proceso' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${estaBloqueado && 'opacity-50 cursor-not-allowed'}`}><Timer size={18} /> En Proceso</button>
                                      <button onClick={() => cambiarEstadoEnvio(caja, 'listo', estadoEnvio)} disabled={estaBloqueado || estaAbierta} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${estadoEnvio === 'listo' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} ${(estaBloqueado || estaAbierta) && 'opacity-50 cursor-not-allowed'}`}><PackageCheck size={18} /> Listo para enviar</button>
                                      <button onClick={() => cambiarEstadoEnvio(caja, 'enviado', estadoEnvio)} disabled={estaBloqueado || estaAbierta} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${estadoEnvio === 'enviado' ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'} ${(estaBloqueado || estaAbierta) && 'opacity-50 cursor-not-allowed'}`}><Truck size={18} /> {estaBloqueado ? 'Enviado (Bloqueado)' : 'Marcar como Enviado'}</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    {cargando ? 'Cargando pedidos...' : 'No se encontraron pedidos con estos filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {!mostrarAntiguos && !fechaInicio && !fechaFin && !busqueda && (
          <div className="bg-gray-50 border-t border-gray-100 p-4 text-center">
            <button onClick={() => setMostrarAntiguos(true)} className="text-sm font-bold text-gray-500 hover:text-green-600 bg-white border border-gray-200 px-6 py-2.5 rounded-xl shadow-sm transition-colors">
              Cargar pedidos anteriores (más de 7 días)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}