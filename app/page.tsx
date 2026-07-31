'use client';

import React, { useEffect, useState } from 'react';
// ✅ Solución definitiva: Usar el alias profesional de Next.js
import { supabase } from '../lib/supabase';
import { Search, Calendar, Package, DollarSign, CheckCircle2, Clock, Unlock, Trash2, Lock, ChevronDown, ChevronUp, Truck, PackageCheck, Timer, Image as ImageIcon, MapPin, Edit, Save, Building2, Home, User, Printer, MessageCircle, Send } from 'lucide-react';

export default function Historial() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarAntiguos, setMostrarAntiguos] = useState(false); 
  
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

  const [ubigeoData, setUbigeoData] = useState<any[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  
  const [editandoEnvioId, setEditandoEnvioId] = useState<string | null>(null);
  const [listaProvincias, setListaProvincias] = useState<string[]>([]);
  const [listaDistritos, setListaDistritos] = useState<string[]>([]);
  const [agenciasSugeridas, setAgenciasSugeridas] = useState<string[]>([]);

  const [formEnvio, setFormEnvio] = useState({ 
    nombre_completo: '', dni: '', direccion: '', celular: '',
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
          clientes (id, usuario_tiktok, nombre_completo, dni, celular, departamento, provincia, distrito, direccion), 
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

          if (!agencia_departamento && !courier) {
            // ✅ Solución al error de tipado estricto 'any' en 'c'
            const cajaAnterior = data.find((c: any) => c.cliente_id === caja.cliente_id && c.id !== caja.id && (c.agencia_departamento || c.courier));

            if (cajaAnterior) {
              tipo_entrega = cajaAnterior.tipo_entrega || 'agencia';
              courier = cajaAnterior.courier;
              agencia_departamento = cajaAnterior.agencia_departamento;
              agencia_provincia = cajaAnterior.agencia_provincia;
              agencia_distrito = cajaAnterior.agencia_distrito;
              agencia_direccion = cajaAnterior.agencia_direccion;
            } else if (caja.clientes?.departamento) {
              tipo_entrega = 'agencia';
              agencia_departamento = caja.clientes.departamento;
              agencia_provincia = caja.clientes.provincia;
              agencia_distrito = caja.clientes.distrito;
            }
          }

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
    
    const tipo = caja.tipo_entrega;
    const dpto = caja.agencia_departamento;
    const prov = caja.agencia_provincia;
    const dist = caja.agencia_distrito;

    setFormEnvio({
      nombre_completo: cliente.nombre_completo || '', dni: cliente.dni || '', direccion: cliente.direccion || '', celular: cliente.celular || '',
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

    let datosAActualizarCliente: any = { nombre_completo: formEnvio.nombre_completo, dni: formEnvio.dni, celular: formEnvio.celular };
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

  const enviarResumenWhatsApp = async (caja: any) => {
    const nombre = caja.clientes?.nombre_completo || `@${caja.clientes?.usuario_tiktok}`;
    const celular = caja.clientes?.celular;
    const fechaObj = new Date(caja.created_at);
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const claveSecreta = `${dd}${mm}`;

    let texto = `🌱 *RESUMEN DE TU COMPRA - WASIPLANT* 🌱\n`;
    texto += `¡Hola ${nombre}! Aquí tienes el detalle de tu pedido:\n\n`;
    texto += `🔑 *CLAVE DE PEDIDO:* ${claveSecreta}\n\n`;
    texto += `📦 *PLANTAS ELEGIDAS:*\n`;
    caja.detalle_caja.forEach((item: any) => {
      texto += `- ${item.cantidad}x ${item.plantas?.nombre} (S/ ${item.precio_vendido.toFixed(2)})\n`;
    });
    
    texto += `\n💰 *DETALLE DE PAGO:*\n`;
    texto += `Total del pedido: S/ ${caja.totalCaja.toFixed(2)}\n`;
    if (caja.totalAbonado > 0) texto += `Monto abonado: S/ ${caja.totalAbonado.toFixed(2)}\n`;
    texto += `*Saldo pendiente: S/ ${caja.saldo.toFixed(2)}*\n\n`;
    
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
    } catch (err) {
      console.log("No se pudo copiar el texto automáticamente.");
    }

    if (celular) {
      const numeroLimpio = celular.replace(/\D/g, '');
      const numeroFinal = numeroLimpio.startsWith('51') ? numeroLimpio : `51${numeroLimpio}`;
      window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(texto)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    }
  };

  const generarEtiquetaPDF = (e: React.MouseEvent, caja: any) => {
    e.stopPropagation(); 
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const nombre = caja.clientes?.nombre_completo || `@${caja.clientes?.usuario_tiktok}`;
    const dni = caja.clientes?.dni || 'No registrado';
    const celular = caja.clientes?.celular || 'No registrado';
    const modalidad = caja.tipo_entrega === 'agencia' ? `Agencia (${caja.courier || 'Pendiente'})` : 'Envío a Domicilio';
    
    let destino = '';
    if (caja.tipo_entrega === 'agencia') {
      destino = [caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ');
      if (caja.agencia_direccion) destino += ` <br><span style="font-size: 15px; font-weight: normal; color: #444;">Ref: ${caja.agencia_direccion}</span>`;
    } else {
      destino = [caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ');
      if (caja.clientes?.direccion) destino += ` <br><span style="font-size: 15px; font-weight: normal; color: #444;">Dir: ${caja.clientes?.direccion}</span>`;
    }

    const fechaFormateada = new Date(caja.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const codigoPedido = caja.id.substring(0, 8).toUpperCase();

    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Etiqueta - ${nombre}</title>
          <style>
            @media print {
              @page { size: A5 portrait; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              margin: 0; padding: 0; background-color: #f9f9f9; 
              display: flex; justify-content: center; align-items: center; min-height: 100vh;
            }
            .etiqueta-a5 {
              width: 148mm; height: 210mm; background: #fff; border: 2px solid #000;
              box-sizing: border-box; padding: 12mm 10mm; display: flex; flex-direction: column;
            }
            .header { text-align: center; border-bottom: 4px solid #166534; padding-bottom: 12px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 34px; text-transform: uppercase; color: #166534; letter-spacing: 2px; }
            .header p { margin: 5px 0 0 0; font-size: 14px; color: #555; text-transform: uppercase; font-weight: bold; }
            .seccion { margin-bottom: 22px; }
            .destacado { background-color: #f0fdf4; border: 2px solid #bbf7d0; padding: 15px; border-radius: 12px; }
            .label { font-size: 13px; text-transform: uppercase; font-weight: 800; color: #166534; margin-bottom: 6px; display: block; border-bottom: 1px solid #dcfce7; padding-bottom: 4px; }
            .valor-grande { font-size: 26px; font-weight: 900; line-height: 1.1; color: #111; text-transform: uppercase; }
            .valor-mediano { font-size: 18px; line-height: 1.4; color: #222; margin-top: 8px; font-weight: 500;}
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-box { border: 2px solid #eee; padding: 10px; border-radius: 8px; }
            .info-box .label { border: none; color: #666; margin-bottom: 2px;}
            .info-box .val { font-size: 16px; font-weight: bold; color: #000; }
            .codigo-barras { height: 50px; background: repeating-linear-gradient(90deg, #000, #000 3px, #fff 3px, #fff 5px, #000 5px, #000 6px, #fff 6px, #fff 10px); margin: auto 0 20px 0; border: 1px solid #ddd; }
            .footer { text-align: center; font-size: 13px; color: #666; border-top: 2px dashed #ccc; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="etiqueta-a5">
            <div class="header"><h1>WasiPlant</h1><p>Envío Prioritario 🌿</p></div>
            <div class="seccion destacado">
              <span class="label">Destinatario</span>
              <div class="valor-grande">${nombre}</div>
              <div class="valor-mediano">📱 Celular: ${celular} <br> 🪪 DNI: ${dni}</div>
            </div>
            <div class="seccion">
              <span class="label">Datos de Envío</span>
              <div class="valor-mediano"><strong>[ ${modalidad.toUpperCase()} ]</strong><br><br>${destino || 'Pendiente de confirmación'}</div>
            </div>
            <div class="info-grid">
              <div class="info-box"><div class="label">N° de Pedido</div><div class="val">#${codigoPedido}</div></div>
              <div class="info-box"><div class="label">Fecha / Bultos</div><div class="val">${fechaFormateada} / ${caja.cantidadPlantas} plantas</div></div>
            </div>
            <div class="codigo-barras"></div>
            <div class="footer"><strong>¡Cuidado! Plantas Vivas 💚 🌱</strong><br>Gracias por tu compra en TikTok: @wasiplant</div>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); };</script>
        </body>
      </html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  };

  const abrirWhatsApp = (e: React.MouseEvent, celular: string) => {
    e.stopPropagation(); 
    if (!celular) return alert("Este cliente no tiene un número de celular registrado.");
    const num = celular.replace(/\D/g, '');
    const numFinal = num.startsWith('51') ? num : `51${num}`;
    window.open(`https://wa.me/${numFinal}`, '_blank');
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

  const cambiarEstadoEnvio = async (caja: any, nuevoEstado: string, estadoActual: string) => {
    if (estadoActual === 'enviado') return alert("Este pedido ya fue enviado y está bloqueado.");
    if (nuevoEstado === 'enviado' && !window.confirm("📦 ALERTA: Al marcar como 'Pedido Enviado', este registro se BLOQUEARÁ. ¿Continuar?")) return;
    setCargando(true);
    await supabase.from('cajas').update({ 
      estado_envio: nuevoEstado, tipo_entrega: caja.tipo_entrega, courier: caja.courier,
      agencia_departamento: caja.agencia_departamento, agencia_provincia: caja.agencia_provincia, agencia_distrito: caja.agencia_distrito, agencia_direccion: caja.agencia_direccion
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
      (cliente.celular || '').toLowerCase().includes(termino) ||
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
    <div className="min-h-screen p-4 md:p-8 font-sans text-gray-800">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-green-700">🕒 Historial de Ventas</h1>
        <p className="text-sm md:text-base text-gray-500">Gestión de pedidos, cobranzas y logística inteligente</p>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="relative w-full md:col-span-5">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar cliente o distrito..." className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition-all text-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
            <button onClick={() => {setFechaInicio(''); setFechaFin(''); setBusqueda('');}} className="text-xs font-bold text-red-500 hover:text-red-700 underline px-2 w-full md:w-auto text-center mt-2 md:mt-0">Limpiar Filtros</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs md:text-sm">
                <th className="p-3 md:p-4 font-semibold w-8 md:w-10"></th>
                <th className="hidden lg:table-cell p-3 md:p-4 font-semibold">Fecha</th>
                <th className="p-3 md:p-4 font-semibold">Cliente y Estado</th>
                <th className="hidden md:table-cell p-3 md:p-4 font-semibold text-center">Destino</th>
                <th className="hidden lg:table-cell p-3 md:p-4 font-semibold text-center">Total</th>
                <th className="hidden lg:table-cell p-3 md:p-4 font-semibold text-center">Cobro</th>
                <th className="hidden md:table-cell p-3 md:p-4 font-semibold text-center">Logística</th>
                <th className="p-3 md:p-4 font-semibold text-center">Acciones</th>
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
                        <td className="p-3 md:p-4 text-gray-400">{filaExpandida === caja.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</td>
                        <td className="hidden lg:table-cell p-3 md:p-4 font-semibold text-gray-800 text-sm whitespace-nowrap">{dia}</td>
                        
                        <td className="p-3 md:p-4">
                          <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg text-sm whitespace-nowrap">@{caja.clientes?.usuario_tiktok}</span>
                          
                          <div className="block lg:hidden mt-2 space-y-1">
                            <p className="text-[10px] text-gray-400 font-semibold">{dia}</p>
                            <div className="flex flex-wrap gap-1">
                              {estaPagado ? (
                                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Cobrado</span>
                              ) : (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">Falta S/{caja.saldo.toFixed(2)}</span>
                              )}
                              {estadoEnvio === 'proceso' && <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">En Proceso</span>}
                              {estadoEnvio === 'listo' && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Listo Enviar</span>}
                              {estadoEnvio === 'enviado' && <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Enviado</span>}
                            </div>
                          </div>

                          {estaAbierta && <span className="block mt-1 text-[10px] text-blue-500 font-bold uppercase tracking-wider">🔴 Editando...</span>}
                        </td>
                        
                        <td className="hidden md:table-cell p-3 md:p-4 text-center">
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

                        <td className={`hidden lg:table-cell p-3 md:p-4 text-center font-bold text-gray-700 whitespace-nowrap`}>S/ {caja.totalCaja.toFixed(2)}</td>
                        
                        <td className="hidden lg:table-cell p-3 md:p-4">
                          <div className="flex flex-col items-center justify-center">
                            {estaPagado ? (
                              <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full w-full max-w-[100px] text-center"><CheckCircle2 size={14} className="inline mr-1"/> OK</span>
                            ) : (
                              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full w-full max-w-[120px] text-center whitespace-nowrap">Falta S/{caja.saldo.toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        
                        <td className="hidden md:table-cell p-3 md:p-4 text-center">
                          {estadoEnvio === 'proceso' && <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap"><Timer size={14} className="inline mb-0.5 mr-1"/> Proceso</span>}
                          {estadoEnvio === 'listo' && <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full whitespace-nowrap"><PackageCheck size={14} className="inline mb-0.5 mr-1"/> Listo</span>}
                          {estadoEnvio === 'enviado' && <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full whitespace-nowrap"><Truck size={14} className="inline mb-0.5 mr-1"/> Enviado</span>}
                        </td>
                        
                        <td className="p-3 md:p-4">
                          <div className="flex justify-center gap-1 md:gap-2">
                            <button onClick={(e) => abrirWhatsApp(e, caja.clientes?.celular)} title="Contactar por WhatsApp" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><MessageCircle size={18} /></button>
                            <button onClick={(e) => generarEtiquetaPDF(e, caja)} title="Generar Etiqueta PDF A5" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Printer size={18} /></button>
                            
                            {estaBloqueado ? (
                              <span className="p-2 text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed" title="Pedido bloqueado"><Lock size={18} /></span>
                            ) : (
                              <>
                                {!estaAbierta && <button onClick={(e) => reabrirCaja(e, caja.id, caja.cliente_id, caja.clientes?.usuario_tiktok)} title="Editar en Panel" className="hidden md:block p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Unlock size={18} /></button>}
                                <button onClick={(e) => eliminarCaja(e, caja.id)} title="Eliminar Caja" className="hidden md:block p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {filaExpandida === caja.id && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50/50 p-0 border-b border-gray-100">
                            <div className="p-3 md:p-6 m-2 md:m-4 bg-white rounded-2xl shadow-sm border border-gray-200">
                              
                              <div className="flex flex-col xl:flex-row gap-6 md:gap-8 mb-6 md:mb-8">
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><Package size={20} className="text-green-600"/> Resumen de Plantas</h4>
                                    
                                    {/* ✅ NUEVO BOTÓN: Enviar resumen por WhatsApp directo */}
                                    <button onClick={() => enviarResumenWhatsApp(caja)} className="flex items-center justify-center w-full sm:w-auto gap-2 bg-green-500 text-white hover:bg-green-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm">
                                      <Send size={16} /> Enviar por WhatsApp 📲
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    {caja.detalle_caja.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        {item.plantas?.imagen_url ? <img src={item.plantas.imagen_url} className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg border border-gray-200" /> : <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"><ImageIcon size={24} /></div>}
                                        <div className="flex-1">
                                          <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.plantas?.nombre}</p>
                                          <p className="text-xs text-gray-500">{item.cantidad} x S/ {item.precio_vendido.toFixed(2)}</p>
                                        </div>
                                        <div className="font-black text-gray-700 text-sm md:text-base">S/ {(item.cantidad * item.precio_vendido).toFixed(2)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="w-full xl:w-72 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 md:p-5 h-fit">
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

                              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                                
                                <div>
                                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><MapPin size={18} className="text-red-500"/> Datos del Cliente y Envío</h4>
                                  
                                  {editandoEnvioId === caja.id ? (
                                    <div className="space-y-4 bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-200 animate-fade-in">
                                      
                                      <div className="space-y-3 pb-4 border-b border-gray-200">
                                        <h5 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1"><User size={14}/> 1. Información Personal</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                                            <input type="text" className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500" value={formEnvio.nombre_completo} onChange={(e) => setFormEnvio({...formEnvio, nombre_completo: e.target.value})} placeholder="Ej. Juan Pérez" />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">DNI <span className="text-gray-400 font-normal">(Opcional)</span></label>
                                            <input type="text" maxLength={8} className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 font-mono" value={formEnvio.dni} onChange={(e) => setFormEnvio({...formEnvio, dni: e.target.value.replace(/\D/g, '')})} placeholder="8 dígitos" />
                                          </div>
                                          <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Celular / WhatsApp <span className="text-gray-400 font-normal">(Opcional)</span></label>
                                            <input type="text" className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500 font-mono" value={formEnvio.celular} onChange={(e) => setFormEnvio({...formEnvio, celular: e.target.value})} placeholder="Ej. 999888777" />
                                          </div>
                                        </div>
                                      </div>

                                      <h5 className="text-xs font-black text-gray-500 uppercase tracking-wider mt-2">2. Modalidad y Destino</h5>
                                      <div className="flex gap-2">
                                        <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'agencia'})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'agencia' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}><Building2 size={16}/> Agencia</button>
                                        <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'domicilio'})} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'domicilio' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}><Home size={16}/> Domicilio</button>
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
                                          <input type="text" placeholder="Ej. Agencia Principal..." className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500" value={formEnvio.agencia_direccion} onChange={(e) => setFormEnvio({...formEnvio, agencia_direccion: e.target.value})} list="sugerenciasAgencias" />
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
                                          
                                          <label className="block text-xs font-bold text-gray-600 mt-2">Dirección Exacta</label>
                                          <input type="text" placeholder="Ej. Av. Los Pinos 123..." className="w-full p-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-green-500" value={formEnvio.direccion} onChange={(e) => setFormEnvio({...formEnvio, direccion: e.target.value})} />
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                                        <button onClick={() => setEditandoEnvioId(null)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors">Cancelar</button>
                                        <button onClick={() => guardarEnvio(caja)} disabled={cargando} className="bg-green-600 text-white text-sm font-bold px-4 md:px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md"><Save size={16}/> Guardar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-100 gap-3">
                                      <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-wider mb-2 px-2 py-0.5 rounded-full w-fit ${caja.tipo_entrega === 'agencia' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                          {caja.tipo_entrega === 'agencia' ? `🏢 AGENCIA: ${caja.courier || 'Pendiente'}` : '🏡 A DOMICILIO'}
                                        </span>
                                        
                                        {(caja.clientes?.nombre_completo || caja.clientes?.dni || caja.clientes?.celular) && (
                                          <span className="text-xs text-gray-600 mb-1 flex items-center flex-wrap gap-1 font-semibold">
                                            <User size={12}/> {caja.clientes?.nombre_completo || 'Sin nombre'} {caja.clientes?.dni ? `(DNI: ${caja.clientes.dni})` : ''} {caja.clientes?.celular ? `(Cel: ${caja.clientes.celular})` : ''}
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
                                      <button onClick={() => iniciarEdicionEnvio(caja)} disabled={estaBloqueado} className={`p-3 bg-white w-full sm:w-auto flex justify-center rounded-xl shadow-sm border border-gray-200 transition-colors ${estaBloqueado ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`} title="Editar datos y ubicación"><Edit size={18}/></button>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Truck size={18} className="text-purple-600"/> Estado del Paquete</h4>
                                  <div className="flex flex-col gap-2">
                                    {estaAbierta && <p className="text-xs text-orange-600 font-semibold mb-1">⚠️ Cierra la caja en el Panel en Vivo para despachar.</p>}
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 gap-3">
                                      <button onClick={() => cambiarEstadoEnvio(caja, 'proceso', estadoEnvio)} disabled={estaBloqueado} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-xs md:text-sm transition-all ${estadoEnvio === 'proceso' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${estaBloqueado && 'opacity-50 cursor-not-allowed'}`}><Timer size={16} /> Proceso</button>
                                      <button onClick={() => cambiarEstadoEnvio(caja, 'listo', estadoEnvio)} disabled={estaBloqueado || estaAbierta} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-xs md:text-sm transition-all ${estadoEnvio === 'listo' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} ${(estaBloqueado || estaAbierta) && 'opacity-50 cursor-not-allowed'}`}><PackageCheck size={16} /> Listo</button>
                                      <button onClick={() => cambiarEstadoEnvio(caja, 'enviado', estadoEnvio)} disabled={estaBloqueado || estaAbierta} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-xs md:text-sm transition-all sm:col-span-2 lg:col-span-1 xl:col-span-1 ${estadoEnvio === 'enviado' ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'} ${(estaBloqueado || estaAbierta) && 'opacity-50 cursor-not-allowed'}`}><Truck size={16} /> {estaBloqueado ? 'Enviado' : 'Enviar'}</button>
                                    </div>
                                    
                                    {/* Botones de acción extra visibles en móvil que reemplazan a los ocultos */}
                                    <div className="md:hidden flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                      {!estaAbierta && !estaBloqueado && (
                                        <button onClick={(e) => reabrirCaja(e, caja.id, caja.cliente_id, caja.clientes?.usuario_tiktok)} className="flex-1 p-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Unlock size={14}/> Reabrir Panel</button>
                                      )}
                                      {!estaBloqueado && (
                                        <button onClick={(e) => eliminarCaja(e, caja.id)} className="flex-1 p-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Trash2 size={14}/> Eliminar</button>
                                      )}
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