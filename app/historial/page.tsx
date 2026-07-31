'use client';

import React, { useEffect, useState } from 'react';
// ✅ CORRECCIÓN 1: Ajuste de la ruta de supabase (solo un nivel hacia atrás si lib está dentro de app)
// Si lib está fuera de app, usa '../../lib/supabase'. Si está dentro de app, usa '../lib/supabase'.
// He usado '../lib/supabase' asumiendo que lib está en el directorio raíz de la app.
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
            // ✅ CORRECCIÓN 2: Le decimos a TypeScript que 'c' es de tipo 'any'
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
    setFilaExpandida(filaExpandida === caja.id ? null : caja.id);
    setEditandoEnvioId(null);
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
              margin: 0; 
              padding: 0; 
              background-color: #f9f9f9; 
              display: flex; 
              justify-content: center; 
              align-items: center;
              min-height: 100vh;
            }
            .etiqueta-a5 {
              width: 148mm;
              height: 210mm;
              background: #fff;
              border: 2px solid #000;
              box-sizing: border-box;
              padding: 12mm 10mm;
              display: flex;
              flex-direction: column;
              box-shadow: 0 0 10px rgba(0,0,0,0.1); 
            }
            .header {
              text-align: center;
              border-bottom: 4px solid #166534;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 34px;
              text-transform: uppercase;
              color: #166534;
              letter-spacing: 2px;
            }
            .header p { margin: 5px 0 0 0; font-size: 14px; color: #555; text-transform: uppercase; font-weight: bold; }
            .seccion { margin-bottom: 22px; }
            .destacado {
              background-color: #f0fdf4;
              border: 2px solid #bbf7d0;
              padding: 15px;
              border-radius: 12px;
            }
            .label { font-size: 13px; text-transform: uppercase; font-weight: 800; color: #166534; margin-bottom: 6px; display: block; border-bottom: 1px solid #dcfce7; padding-bottom: 4px; }
            .valor-grande { font-size: 26px; font-weight: 900; line-height: 1.1; color: #111; text-transform: uppercase; }
            .valor-mediano { font-size: 18px; line-height: 1.4; color: #222; margin-top: 8px; font-weight: 500;}
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-box { border: 2px solid #eee; padding: 10px; border-radius: 8px; }
            .info-box .label { border: none; color: #666; margin-bottom: 2px;}
            .info-box .val { font-size: 16px; font-weight: bold; color: #000; }
            .codigo-barras {
              height: 50px;
              background: repeating-linear-gradient(90deg, #000, #000 3px, #fff 3px, #fff 5px, #000 5px, #000 6px, #fff 6px, #fff 10px);
              margin: auto 0 20px 0;
              border: 1px solid #ddd;
            }
            .footer { text-align: center; font-size: 13px; color: #666; border-top: 2px dashed #ccc; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="etiqueta-a5">
            <div class="header">
              <h1>WasiPlant</h1>
              <p>Envío Prioritario 🌿</p>
            </div>
            
            <div class="seccion destacado">
              <span class="label">Destinatario</span>
              <div class="valor-grande">${nombre}</div>
              <div class="valor-mediano">📱 Celular: ${celular} <br> 🪪 DNI: ${dni}</div>
            </div>

            <div class="seccion">
              <span class="label">Datos de Envío</span>
              <div class="valor-mediano">
                <strong>[ ${modalidad.toUpperCase()} ]</strong><br><br>
                ${destino || 'Pendiente de confirmación'}
              </div>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="label">N° de Pedido</div>
                <div class="val">#${codigoPedido}</div>
              </div>
              <div class="info-box">
                <div class="label">Fecha / Bultos</div>
                <div class="val">${fechaFormateada} / ${caja.cantidadPlantas} plantas</div>
              </div>
            </div>

            <div class="codigo-barras"></div>

            <div class="footer">
              <strong>¡Cuidado! Plantas Vivas 💚 🌱</strong><br>
              Gracias por tu compra en TikTok: @wasiplant
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000); 
            };
          </script>
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
    if (nuevoEstado === 'enviado') {
        if (!window.confirm("📦 ALERTA: Al marcar como 'Pedido Enviado', este registro se BLOQUEARÁ. ¿Deseas continuar?")) return;
    }
    setCargando(true);
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
    <div className="min-h-screen p-3 md:p-8 font-sans text-gray-800 bg-gray-50/30">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-green-700 tracking-tight">🕒 Historial Logístico</h1>
        <p className="text-sm md:text-base text-gray-500 font-medium">Gestión de envíos y cobranzas adaptada a móviles</p>
      </header>

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="relative w-full lg:col-span-5">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar cliente, DNI, o distrito..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none text-sm font-medium bg-gray-50/50" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        
        <div className="lg:col-span-7 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2 w-full sm:flex-1">
            <Calendar className="text-green-600" size={18} />
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Desde</span>
              <input type="date" className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 w-full" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2 w-full sm:flex-1">
            <Calendar className="text-green-600" size={18} />
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hasta</span>
              <input type="date" className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 w-full" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ SOLUCIÓN: CONTENEDOR 100% RESPONSIVE (DIVS, NO TABLAS) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Cabecera Desktop (Oculta en móviles) */}
        <div className="hidden lg:flex items-center p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="w-12 text-center"></div>
          <div className="w-28">Fecha</div>
          <div className="flex-1">Cliente y Destino</div>
          <div className="w-32 text-center">Total</div>
          <div className="w-32 text-center">Estado Pago</div>
          <div className="w-36 text-center">Logística</div>
          <div className="w-32 text-center">Acciones</div>
        </div>

        {/* Lista de Pedidos */}
        <div className="divide-y divide-gray-100">
          {cajasFiltradas.length > 0 ? (
            cajasFiltradas.map((caja) => {
              const dia = new Date(caja.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
              const estaPagado = caja.saldo <= 0 && caja.totalCaja > 0;
              const estaAbierta = caja.estado === 'abierta'; 
              const estadoEnvio = caja.estado_envio || 'proceso';
              const estaBloqueado = estadoEnvio === 'enviado'; 
              const ubigeoDestino = caja.tipo_entrega === 'agencia' 
                ? [caja.agencia_distrito, caja.agencia_provincia].filter(Boolean).join(', ') 
                : [caja.clientes?.distrito, caja.clientes?.provincia].filter(Boolean).join(', ');

              return (
                <div key={caja.id} className="flex flex-col">
                  {/* FILA PRINCIPAL (Tarjeta en móvil, Fila en PC) */}
                  <div className={`flex flex-col lg:flex-row lg:items-center p-4 gap-3 md:gap-4 transition-colors ${estaBloqueado ? 'bg-gray-50/50' : 'hover:bg-green-50/30'}`} onClick={() => toggleFila(caja)}>
                    
                    {/* Encabezado Móvil: Tag + Flecha */}
                    <div className="flex justify-between items-center lg:hidden w-full cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-green-700 bg-green-100/50 px-2.5 py-1 rounded-lg text-sm border border-green-200/50">@{caja.clientes?.usuario_tiktok}</span>
                        {estaAbierta && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">EDITANDO</span>}
                      </div>
                      <div className="p-1 bg-gray-100 rounded-full text-gray-500">{filaExpandida === caja.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
                    </div>

                    {/* Flecha Desktop */}
                    <div className="hidden lg:flex w-12 justify-center text-gray-400 cursor-pointer">
                      {filaExpandida === caja.id ? <ChevronUp size={22}/> : <ChevronDown size={22}/>}
                    </div>

                    {/* Fecha */}
                    <div className="text-xs text-gray-500 lg:text-sm lg:text-gray-800 lg:w-28 font-semibold flex items-center gap-1.5">
                      <Calendar size={14} className="lg:hidden text-gray-400"/> {dia}
                    </div>

                    {/* Info Cliente Desktop (Oculto en móvil) */}
                    <div className="hidden lg:flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700 text-sm">@{caja.clientes?.usuario_tiktok}</span>
                        {estaAbierta && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-md">EDITANDO CAJA</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-medium">
                        {caja.tipo_entrega === 'agencia' ? <Building2 size={12} className="text-blue-500"/> : <Home size={12} className="text-green-500"/>} 
                        {caja.tipo_entrega === 'agencia' ? caja.courier : 'Domicilio'} • {ubigeoDestino || 'Sin destino'}
                      </div>
                    </div>

                    {/* Info Cliente Móvil (Oculto en PC) */}
                    <div className="lg:hidden flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 w-fit px-2 py-1 rounded-md border border-gray-100">
                      {caja.tipo_entrega === 'agencia' ? <Building2 size={12} className="text-blue-500"/> : <Home size={12} className="text-green-500"/>} 
                      <span className="font-semibold">{caja.tipo_entrega === 'agencia' ? caja.courier : 'Domicilio'}:</span> {ubigeoDestino || 'Falta ubigeo'}
                    </div>

                    {/* Montos y Estados (Mobile Grid) */}
                    <div className="grid grid-cols-2 gap-2 lg:hidden mt-1 w-full">
                      <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">Total Pago</span>
                        <span className="text-sm font-black text-gray-800">S/ {caja.totalCaja.toFixed(2)}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex flex-col justify-center items-center text-center ${estaPagado ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                        <span className={`text-[10px] uppercase font-bold mb-0.5 ${estaPagado ? 'text-green-600' : 'text-orange-600'}`}>Estado</span>
                        {estaPagado ? <span className="text-sm font-black text-green-700 flex items-center gap-1"><CheckCircle2 size={14}/> Pagado</span> : <span className="text-sm font-black text-orange-700">Falta S/{caja.saldo.toFixed(2)}</span>}
                      </div>
                    </div>

                    {/* Montos y Estados Desktop */}
                    <div className="hidden lg:block w-32 text-center font-black text-gray-700">S/ {caja.totalCaja.toFixed(2)}</div>
                    <div className="hidden lg:flex w-32 justify-center">
                      {estaPagado ? <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full"><CheckCircle2 size={14} className="inline mr-1"/> OK</span> : <span className="text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full">Falta S/{caja.saldo.toFixed(2)}</span>}
                    </div>

                    {/* Estado Logístico */}
                    <div className="flex justify-center items-center gap-2 lg:w-36 mt-1 lg:mt-0">
                      {estadoEnvio === 'proceso' && <span className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full w-full lg:w-auto text-center"><Timer size={14} className="inline mb-0.5 mr-1"/> En Proceso</span>}
                      {estadoEnvio === 'listo' && <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full w-full lg:w-auto text-center"><PackageCheck size={14} className="inline mb-0.5 mr-1"/> Listo</span>}
                      {estadoEnvio === 'enviado' && <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full w-full lg:w-auto text-center"><Truck size={14} className="inline mb-0.5 mr-1"/> Enviado</span>}
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-between lg:justify-center gap-2 lg:w-32 mt-2 lg:mt-0 pt-3 border-t border-gray-100 lg:border-t-0 lg:pt-0">
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); enviarResumenWhatsApp(caja); }} title="Enviar WhatsApp Directo" className="p-2.5 lg:p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors bg-white border border-gray-200 shadow-sm lg:shadow-none lg:border-transparent lg:bg-transparent flex-1 flex justify-center"><MessageCircle size={18} /></button>
                        <button onClick={(e) => generarEtiquetaPDF(e, caja)} title="Imprimir PDF A5" className="p-2.5 lg:p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors bg-white border border-gray-200 shadow-sm lg:shadow-none lg:border-transparent lg:bg-transparent flex-1 flex justify-center"><Printer size={18} /></button>
                      </div>
                      <div className="flex gap-2">
                        {estaBloqueado ? (
                          <span className="p-2.5 lg:p-2 text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed flex-1 flex justify-center"><Lock size={18} /></span>
                        ) : (
                          <>
                            {!estaAbierta && <button onClick={(e) => reabrirCaja(e, caja.id, caja.cliente_id, caja.clientes?.usuario_tiktok)} className="hidden md:flex p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Unlock size={18} /></button>}
                            <button onClick={(e) => eliminarCaja(e, caja.id)} className="p-2.5 lg:p-2 text-red-600 hover:bg-red-50 rounded-xl bg-red-50/50 border border-red-100 lg:border-transparent lg:bg-transparent flex-1 flex justify-center"><Trash2 size={18} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✅ ÁREA EXPANDIDA COMPLETAMENTE OPTIMIZADA PARA MÓVIL (Sin tablas) */}
                  {filaExpandida === caja.id && (
                    <div className="bg-gray-50/80 border-t border-gray-200 p-3 md:p-6 shadow-inner">
                      
                      <div className="flex flex-col xl:flex-row gap-4 mb-4">
                        {/* PLANTAS */}
                        <div className="flex-1 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                            <h4 className="font-black text-gray-800 flex items-center gap-2 text-base"><Package size={18} className="text-green-600"/> Resumen del Pedido</h4>
                            {/* 🔥 NUEVO BOTÓN DE WHATSAPP 🔥 */}
                            <button onClick={() => enviarResumenWhatsApp(caja)} className="flex items-center justify-center w-full sm:w-auto gap-2 bg-green-500 text-white hover:bg-green-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md">
                              <Send size={16} /> Enviar por WhatsApp 📲
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {caja.detalle_caja.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                {item.plantas?.imagen_url ? <img src={item.plantas.imagen_url} className="w-12 h-12 object-cover rounded-lg border border-gray-200" /> : <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"><ImageIcon size={20} /></div>}
                                <div className="flex-1">
                                  <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.plantas?.nombre}</p>
                                  <p className="text-xs text-gray-500 font-medium">{item.cantidad} x S/ {item.precio_vendido.toFixed(2)}</p>
                                </div>
                                <div className="font-black text-gray-800 text-sm bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">S/ {(item.cantidad * item.precio_vendido).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* PAGO */}
                        <div className="w-full xl:w-80 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-5 h-fit shadow-sm">
                          <h4 className="font-black text-blue-900 mb-4 flex items-center gap-2 text-base"><DollarSign size={18} className="text-blue-600"/> Finanzas</h4>
                          <div className="space-y-2.5">
                            <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Costo Total:</span> <span className="text-gray-900">S/ {caja.totalCaja.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Abonado:</span> <span className="text-blue-600 font-bold">- S/ {caja.totalAbonado.toFixed(2)}</span></div>
                            <div className="pt-3 border-t border-blue-200/80 flex justify-between font-black text-lg items-center">
                              <span className="text-gray-800 uppercase tracking-wide text-sm">Saldo Final</span>
                              <span className={`px-3 py-1 rounded-lg ${caja.saldo > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>S/ {caja.saldo.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* FORMULARIO DE ENVÍO */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                          <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-base"><MapPin size={18} className="text-red-500"/> Logística y Etiqueta</h4>
                          
                          {editandoEnvioId === caja.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-100">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Nombre Recibe</label><input type="text" className="w-full p-2.5 text-sm font-semibold text-gray-800 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50" value={formEnvio.nombre_completo} onChange={(e) => setFormEnvio({...formEnvio, nombre_completo: e.target.value})} placeholder="Ej. Juan Pérez" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">DNI</label><input type="text" maxLength={8} className="w-full p-2.5 text-sm font-semibold text-gray-800 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50 font-mono" value={formEnvio.dni} onChange={(e) => setFormEnvio({...formEnvio, dni: e.target.value.replace(/\D/g, '')})} placeholder="Obligatorio para agencia" /></div>
                                <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">WhatsApp / Celular</label><input type="text" className="w-full p-2.5 text-sm font-semibold text-gray-800 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50 font-mono" value={formEnvio.celular} onChange={(e) => setFormEnvio({...formEnvio, celular: e.target.value})} placeholder="999888777" /></div>
                              </div>

                              <div className="flex gap-2">
                                <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'agencia'})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'agencia' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}><Building2 size={16}/> Agencia</button>
                                <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'domicilio'})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'domicilio' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}><Home size={16}/> Domicilio</button>
                              </div>

                              {formEnvio.tipo_entrega === 'agencia' ? (
                                <div className="space-y-2.5 bg-blue-50/30 p-3 rounded-xl border border-blue-50">
                                  <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-blue-500 font-bold text-blue-900 bg-white outline-none" value={formEnvio.courier} onChange={(e) => setFormEnvio({...formEnvio, courier: e.target.value})}><option value="">Seleccione Empresa...</option>{empresasCourier.map(emp => <option key={emp} value={emp}>{emp}</option>)}</select>
                                  <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-blue-500 font-semibold text-gray-700 bg-white outline-none" value={formEnvio.agencia_departamento} onChange={(e) => { actualizarListasUbigeo(e.target.value); setFormEnvio({...formEnvio, agencia_departamento: e.target.value, agencia_provincia: '', agencia_distrito: ''}); }}><option value="">Departamento de destino...</option>{listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                  <div className="grid grid-cols-2 gap-2">
                                    <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-blue-500 font-semibold text-gray-700 bg-white outline-none disabled:opacity-50" disabled={!formEnvio.agencia_departamento} value={formEnvio.agencia_provincia} onChange={(e) => { actualizarListasUbigeo(formEnvio.agencia_departamento, e.target.value); setFormEnvio({...formEnvio, agencia_provincia: e.target.value, agencia_distrito: ''}); }}><option value="">Provincia...</option>{listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}</select>
                                    <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-blue-500 font-semibold text-gray-700 bg-white outline-none disabled:opacity-50" disabled={!formEnvio.agencia_provincia} value={formEnvio.agencia_distrito} onChange={(e) => { setFormEnvio({...formEnvio, agencia_distrito: e.target.value}); buscarAgenciasPrevias(e.target.value); }}><option value="">Distrito...</option>{listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                  </div>
                                  <input type="text" placeholder="Referencia de la Agencia (Opcional)" className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-blue-500 font-semibold text-gray-700 bg-white outline-none" value={formEnvio.agencia_direccion} onChange={(e) => setFormEnvio({...formEnvio, agencia_direccion: e.target.value})} list="sugerenciasAgencias" />
                                  <datalist id="sugerenciasAgencias">{agenciasSugeridas.map((agencia, i) => <option key={i} value={agencia} />)}</datalist>
                                </div>
                              ) : (
                                <div className="space-y-2.5 bg-green-50/30 p-3 rounded-xl border border-green-50">
                                  <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none" value={formEnvio.departamento} onChange={(e) => { actualizarListasUbigeo(e.target.value); setFormEnvio({...formEnvio, departamento: e.target.value, provincia: '', distrito: ''}); }}><option value="">Departamento del domicilio...</option>{listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                  <div className="grid grid-cols-2 gap-2">
                                    <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none disabled:opacity-50" disabled={!formEnvio.departamento} value={formEnvio.provincia} onChange={(e) => { actualizarListasUbigeo(formEnvio.departamento, e.target.value); setFormEnvio({...formEnvio, provincia: e.target.value, distrito: ''}); }}><option value="">Provincia...</option>{listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}</select>
                                    <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none disabled:opacity-50" disabled={!formEnvio.provincia} value={formEnvio.distrito} onChange={(e) => setFormEnvio({...formEnvio, distrito: e.target.value})}><option value="">Distrito...</option>{listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                  </div>
                                  <input type="text" placeholder="Dirección exacta, Calle, Mz, Lote..." className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none" value={formEnvio.direccion} onChange={(e) => setFormEnvio({...formEnvio, direccion: e.target.value})} />
                                </div>
                              )}
                              
                              <div className="flex gap-2 pt-2">
                                <button onClick={() => setEditandoEnvioId(null)} className="w-1/3 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button onClick={() => guardarEnvio(caja)} disabled={cargando} className="w-2/3 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 shadow-md"><Save size={18}/> Guardar Cambios</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4">
                              <div className="flex justify-between items-start">
                                <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${caja.tipo_entrega === 'agencia' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                  {caja.tipo_entrega === 'agencia' ? `🏢 AGENCIA: ${caja.courier || 'Pendiente'}` : '🏡 ENVÍO A DOMICILIO'}
                                </span>
                                <button onClick={() => iniciarEdicionEnvio(caja)} disabled={estaBloqueado} className={`p-2 rounded-xl transition-colors ${estaBloqueado ? 'text-gray-300 bg-gray-50' : 'text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 border border-gray-200'}`}><Edit size={16}/></button>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <p className="text-sm font-bold text-gray-800 flex items-center flex-wrap gap-2">
                                  <User size={16} className="text-gray-400"/> 
                                  {caja.clientes?.nombre_completo || 'No registró nombre'} 
                                  {caja.clientes?.dni ? <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-600">DNI: {caja.clientes.dni}</span> : ''}
                                  {caja.clientes?.celular ? <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-600 font-mono">📱 {caja.clientes.celular}</span> : ''}
                                </p>
                                <p className="text-sm text-gray-600 flex items-start gap-2">
                                  <MapPin size={16} className="text-red-400 mt-0.5 shrink-0"/> 
                                  <span className="leading-snug">
                                    <strong className="block text-gray-800">{caja.tipo_entrega === 'agencia' ? [caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ') || 'Falta indicar Ubigeo' : [caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ') || 'Falta indicar Ubigeo'}</strong>
                                    {caja.tipo_entrega === 'agencia' && caja.agencia_direccion ? <span className="block mt-1 italic text-gray-500 text-xs">Ref: {caja.agencia_direccion}</span> : ''}
                                    {caja.tipo_entrega === 'domicilio' && caja.clientes?.direccion ? <span className="block mt-1 italic text-gray-500 text-xs">Dir: {caja.clientes?.direccion}</span> : ''}
                                  </span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ACCIONES DE ESTADO */}
                        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full">
                          <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-base"><Truck size={18} className="text-purple-600"/> Estado del Paquete</h4>
                          
                          <div className="flex-1 flex flex-col justify-center gap-3">
                            {estaAbierta && <p className="text-xs text-orange-600 font-bold text-center bg-orange-50 p-2 rounded-lg border border-orange-100 mb-2">⚠️ Debes cerrar la caja en el Panel en Vivo para poder cambiar los estados logísticos.</p>}
                            
                            <button onClick={() => cambiarEstadoEnvio(caja, 'proceso', estadoEnvio)} disabled={estaBloqueado} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all border ${estadoEnvio === 'proceso' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'} ${estaBloqueado && 'opacity-50 cursor-not-allowed'}`}><Timer size={18} /> Paquete en Proceso</button>
                            <button onClick={() => cambiarEstadoEnvio(caja, 'listo', estadoEnvio)} disabled={estaBloqueado || estaAbierta} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all border ${estadoEnvio === 'listo' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'} ${(estaBloqueado || estaAbierta) && 'opacity-50 cursor-not-allowed'}`}><PackageCheck size={18} /> Listo para la Agencia</button>
                            <button onClick={() => cambiarEstadoEnvio(caja, 'enviado', estadoEnvio)} disabled={estaBloqueado || estaAbierta} className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-sm transition-all border ${estadoEnvio === 'enviado' ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-[1.02]' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'} ${(estaBloqueado || estaAbierta) && 'opacity-50 cursor-not-allowed'}`}><Truck size={20} /> {estaBloqueado ? '✅ PEDIDO ENVIADO' : 'MARCAR COMO ENVIADO'}</button>
                            
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                              {!estaAbierta && !estaBloqueado && (
                                <button onClick={(e) => reabrirCaja(e, caja.id, caja.cliente_id, caja.clientes?.usuario_tiktok)} className="flex-1 py-3 bg-white text-blue-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-blue-200 hover:bg-blue-50 shadow-sm"><Unlock size={16}/> Editar Caja</button>
                              )}
                              {!estaBloqueado && (
                                <button onClick={(e) => eliminarCaja(e, caja.id)} className="flex-1 py-3 bg-white text-red-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 shadow-sm"><Trash2 size={16}/> Borrar</button>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <Package size={48} className="mb-4 text-gray-300"/>
              <p className="text-lg font-bold">{cargando ? 'Cargando logística...' : 'No hay pedidos con estos filtros'}</p>
            </div>
          )}
        </div>
      </div>
      
      {!mostrarAntiguos && !fechaInicio && !fechaFin && !busqueda && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setMostrarAntiguos(true)} className="text-sm font-black text-gray-500 hover:text-green-700 bg-white border border-gray-200 px-8 py-3.5 rounded-2xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            Cargar historial antiguo (más de 7 días)
          </button>
        </div>
      )}
    </div>
  );
}
Este es mi código completo que tengo para realizar los cambios sugeridos.
Guiame como puedo hacer.