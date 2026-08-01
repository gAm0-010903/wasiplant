'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Calendar, Package, DollarSign, CheckCircle2, Unlock, Trash2, Lock, Truck, PackageCheck, Timer, Image as ImageIcon, MapPin, Edit, Save, Copy, Building2, Home, User, Printer, MessageCircle, Send, AlertTriangle, Info, X } from 'lucide-react';

export default function Historial() {
  const [cajas, setCajas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarAntiguos, setMostrarAntiguos] = useState(false); 
  
  // ✅ NUEVO ESTADO: Controla qué tarjeta está abierta en el Modal de Detalles
  const [cajaSeleccionadaId, setCajaSeleccionadaId] = useState<string | null>(null);

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

  const [dialogo, setDialogo] = useState<{
    abierto: boolean;
    mensaje: string;
    tipo: 'alerta' | 'confirmar' | 'opciones';
    textoConfirmar?: string;
    textoCancelar?: string;
    accionConfirmar?: () => void;
    accionCancelar?: () => void;
  }>({ abierto: false, mensaje: '', tipo: 'alerta' });

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
      setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Error: " + error.message });
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

  // ✅ FUNCIONES PARA ABRIR Y CERRAR EL MODAL
  const abrirDetalle = (caja: any) => {
    setCajaSeleccionadaId(caja.id);
    setEditandoEnvioId(null);
  };

  const cerrarDetalle = () => {
    setCajaSeleccionadaId(null);
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
    const nuevoDpto = formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_departamento : formEnvio.departamento;
    const nuevoProv = formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_provincia : formEnvio.provincia;
    const nuevoDist = formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_distrito : formEnvio.distrito;

    const ejecutarGuardado = async (actualizoPerfil: boolean) => {
      setCargando(true);
      await supabase.from('cajas').update({
        tipo_entrega: formEnvio.tipo_entrega, courier: formEnvio.tipo_entrega === 'agencia' ? formEnvio.courier : null,
        agencia_departamento: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_departamento : null,
        agencia_provincia: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_provincia : null,
        agencia_distrito: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_distrito : null,
        agencia_direccion: formEnvio.tipo_entrega === 'agencia' ? formEnvio.agencia_direccion : null
      }).eq('id', caja.id);

      let datosAActualizarCliente: any = { nombre_completo: formEnvio.nombre_completo, dni: formEnvio.dni, celular: formEnvio.celular };
      if (formEnvio.tipo_entrega === 'domicilio') datosAActualizarCliente.direccion = formEnvio.direccion;
      
      if (actualizoPerfil) {
        datosAActualizarCliente.departamento = nuevoDpto; datosAActualizarCliente.provincia = nuevoProv; datosAActualizarCliente.distrito = nuevoDist;
      }
      await supabase.from('clientes').update(datosAActualizarCliente).eq('id', caja.cliente_id);
      setEditandoEnvioId(null);
      cargarHistorial(); 
      setCargando(false);
    };

    if (cliente.departamento && (cliente.departamento !== nuevoDpto || cliente.provincia !== nuevoProv || cliente.distrito !== nuevoDist)) {
      setDialogo({
        abierto: true, tipo: 'opciones',
        mensaje: `Has cambiado el destino.\n\n¿Deseas guardar esta nueva ubicación como la principal para futuros pedidos de @${cliente.usuario_tiktok}?`,
        textoConfirmar: 'Sí, guardar para el futuro', textoCancelar: 'No, solo por hoy',
        accionConfirmar: () => ejecutarGuardado(true), accionCancelar: () => ejecutarGuardado(false)
      });
    } else if (!cliente.departamento && nuevoDpto) {
      ejecutarGuardado(true);
    } else {
      ejecutarGuardado(false);
    }
  };

  const copiarResumen = async (caja: any) => {
    const nombre = caja.clientes?.nombre_completo || `@${caja.clientes?.usuario_tiktok}`;
    const dd = String(new Date(caja.created_at).getDate()).padStart(2, '0');
    const mm = String(new Date(caja.created_at).getMonth() + 1).padStart(2, '0');
    const claveSecreta = `${dd}${mm}`;

    let texto = `🌱 *RESUMEN DE TU COMPRA - WASIPLANT* 🌱\n`;
    texto += `¡Hola ${nombre}! Aquí tienes el detalle de tu pedido:\n\n🔑 *CLAVE DE PEDIDO:* ${claveSecreta}\n\n📦 *PLANTAS ELEGIDAS:*\n`;
    caja.detalle_caja.forEach((item: any) => { texto += `- ${item.cantidad}x ${item.plantas?.nombre} (S/ ${item.precio_vendido.toFixed(2)}) = S/ ${(item.cantidad * item.precio_vendido).toFixed(2)}\n`; });
    
    texto += `\n💰 *DETALLE DE PAGO:*\nTotal del pedido: S/ ${caja.totalCaja.toFixed(2)}\nMonto abonado: S/ ${caja.totalAbonado.toFixed(2)}\nSaldo pendiente: S/ ${caja.saldo.toFixed(2)}\n\n📍 *LUGAR DE ENVÍO:*\n`;
    
    if (caja.tipo_entrega === 'agencia') {
      texto += `Modalidad: Recojo en Agencia (${caja.courier || 'Por definir'})\nDestino: ${[caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ') || 'Pendiente'}\n`;
      if (caja.agencia_direccion) texto += `Agencia: ${caja.agencia_direccion}\n`;
    } else {
      texto += `Modalidad: Envío a Domicilio\nDestino: ${[caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ') || 'Pendiente'}\n`;
    }
    texto += `\n¡Muchísimas gracias por tu preferencia! 💚`;
    
    try { await navigator.clipboard.writeText(texto); setDialogo({ abierto: true, tipo: 'alerta', mensaje: "¡Mensaje copiado con éxito! Listo para pegarlo en tu chat." }); } catch (err) { setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Error al copiar el texto en tu dispositivo." }); }
  };

  const enviarResumenWhatsApp = async (caja: any) => {
    const nombre = caja.clientes?.nombre_completo || `@${caja.clientes?.usuario_tiktok}`;
    const celular = caja.clientes?.celular;
    const dd = String(new Date(caja.created_at).getDate()).padStart(2, '0');
    const mm = String(new Date(caja.created_at).getMonth() + 1).padStart(2, '0');
    const claveSecreta = `${dd}${mm}`;

    let texto = `🌱 *RESUMEN DE TU COMPRA - WASIPLANT* 🌱\n`;
    texto += `¡Hola ${nombre}! Aquí tienes el detalle de tu pedido:\n\n🔑 *CLAVE DE PEDIDO:* ${claveSecreta}\n\n📦 *PLANTAS ELEGIDAS:*\n`;
    caja.detalle_caja.forEach((item: any) => { texto += `- ${item.cantidad}x ${item.plantas?.nombre} (S/ ${item.precio_vendido.toFixed(2)})\n`; });
    texto += `\n💰 *DETALLE DE PAGO:*\nTotal del pedido: S/ ${caja.totalCaja.toFixed(2)}\n`;
    if (caja.totalAbonado > 0) texto += `Monto abonado: S/ ${caja.totalAbonado.toFixed(2)}\n`;
    texto += `*Saldo pendiente: S/ ${caja.saldo.toFixed(2)}*\n\n📍 *LUGAR DE ENVÍO:*\n`;
    if (caja.tipo_entrega === 'agencia') {
      texto += `Modalidad: Recojo en Agencia (${caja.courier || 'Por definir'})\nDestino: ${[caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ') || 'Pendiente'}\n`;
      if (caja.agencia_direccion) texto += `Agencia: ${caja.agencia_direccion}\n`;
    } else {
      texto += `Modalidad: Envío a Domicilio\nDestino: ${[caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ') || 'Pendiente'}\n`;
    }
    texto += `\n¡Muchísimas gracias por tu preferencia! 💚`;
    
    try { await navigator.clipboard.writeText(texto); } catch (err) { }
    if (celular) {
      const numFinal = celular.replace(/\D/g, '').startsWith('51') ? celular.replace(/\D/g, '') : `51${celular.replace(/\D/g, '')}`;
      window.open(`https://wa.me/${numFinal}?text=${encodeURIComponent(texto)}`, '_blank');
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
    let destino = caja.tipo_entrega === 'agencia' ? [caja.agencia_distrito, caja.agencia_provincia, caja.agencia_departamento].filter(Boolean).join(', ') : [caja.clientes?.distrito, caja.clientes?.provincia, caja.clientes?.departamento].filter(Boolean).join(', ');
    if (caja.tipo_entrega === 'agencia' && caja.agencia_direccion) destino += ` <br><span style="font-size: 15px; font-weight: normal; color: #444;">Ref: ${caja.agencia_direccion}</span>`;
    if (caja.tipo_entrega === 'domicilio' && caja.clientes?.direccion) destino += ` <br><span style="font-size: 15px; font-weight: normal; color: #444;">Dir: ${caja.clientes?.direccion}</span>`;

    const fechaFormateada = new Date(caja.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const codigoPedido = caja.id.substring(0, 8).toUpperCase();

    const html = `
      <!DOCTYPE html>
      <html lang="es"><head><meta charset="UTF-8"><title>Etiqueta - ${nombre}</title><style>
            @media print { @page { size: A5 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .etiqueta-a5 { width: 148mm; height: 210mm; background: #fff; border: 2px solid #000; box-sizing: border-box; padding: 12mm 10mm; display: flex; flex-direction: column; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
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
          </style></head><body>
          <div class="etiqueta-a5">
            <div class="header"><h1>WasiPlant</h1><p> Productos frágiles 🌿</p></div>
            <div class="seccion destacado"><span class="label">Destinatario</span><div class="valor-grande">${nombre}</div><div class="valor-mediano">📱 Celular: ${celular} <br> 🪪 DNI: ${dni}</div></div>
            <div class="seccion"><span class="label">Datos de Envío</span><div class="valor-mediano"><strong>[ ${modalidad.toUpperCase()} ]</strong><br><br>${destino || 'Pendiente de confirmación'}</div></div>
            <div class="info-grid">
              <div class="info-box"><div class="label">N° de Pedido</div><div class="val">#${codigoPedido}</div></div>
              <div class="info-box"><div class="label">Fecha / Bultos</div><div class="val">${fechaFormateada} / ${caja.cantidadPlantas} plantas</div></div>
            </div>
            <div class="codigo-barras"></div>
            <div class="footer"><strong>¡Cuidado! Plantas Vivas 💚 🌱</strong><br>Gracias por tu compra buscanos en redes como: @wasiplant</div>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); };</script>
        </body></html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  };

  const reabrirCaja = async (e: React.MouseEvent, idCaja: string, idCliente: string, usuario: string) => {
    e.stopPropagation(); 
    setDialogo({
      abierto: true, tipo: 'confirmar', mensaje: `¿Poner el pedido de @${usuario} en el carrito de espera?`, textoConfirmar: 'Sí, Reabrir',
      accionConfirmar: async () => {
        setCargando(true);
        await supabase.from('cajas').update({ estado: 'cerrada' }).eq('cliente_id', idCliente).eq('estado', 'abierta').neq('id', idCaja);
        await supabase.from('cajas').update({ estado: 'abierta', estado_envio: 'proceso' }).eq('id', idCaja);
        cerrarDetalle();
        cargarHistorial(); 
      }
    });
  };

  const eliminarCaja = async (e: React.MouseEvent, idCaja: string) => {
    e.stopPropagation();
    setDialogo({
      abierto: true, tipo: 'confirmar', mensaje: "¡ATENCIÓN! ¿Estás seguro de eliminar TODO este pedido? Esta acción borrará las plantas y el historial de pago.", textoConfirmar: 'Sí, Eliminar todo',
      accionConfirmar: async () => {
        setCargando(true);
        await supabase.from('detalle_caja').delete().eq('caja_id', idCaja);
        await supabase.from('abonos').delete().eq('caja_id', idCaja);
        await supabase.from('cajas').delete().eq('id', idCaja);
        cerrarDetalle();
        cargarHistorial(); 
      }
    });
  };

  const cambiarEstadoEnvio = async (caja: any, nuevoEstado: string, estadoActual: string) => {
    if (estadoActual === 'enviado') {
      return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Este pedido ya fue enviado y está bloqueado para proteger la información." });
    }
    const ejecutarCambio = async () => {
      setCargando(true);
      await supabase.from('cajas').update({ 
        estado_envio: nuevoEstado, tipo_entrega: caja.tipo_entrega, courier: caja.courier,
        agencia_departamento: caja.agencia_departamento, agencia_provincia: caja.agencia_provincia, agencia_distrito: caja.agencia_distrito, agencia_direccion: caja.agencia_direccion
      }).eq('id', caja.id);
      cargarHistorial();
    };

    if (nuevoEstado === 'enviado') {
      setDialogo({
        abierto: true, tipo: 'confirmar',
        mensaje: "📦 ALERTA DE LOGÍSTICA\n\nAl marcar este paquete como 'ENVIADO', el registro se BLOQUEARÁ y ya no podrás modificarlo.\n\n¿Deseas continuar?",
        textoConfirmar: 'Sí, confirmar envío', accionConfirmar: ejecutarCambio
      });
    } else {
      ejecutarCambio();
    }
  };

  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  const cajasFiltradas = cajas.filter((caja: any) => {
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

  const cajaActiva = cajas.find((c: any) => c.id === cajaSeleccionadaId);

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-gray-800 bg-gray-50/30 relative">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-green-700 tracking-tight">Área de Logística</h1>
        <p className="text-sm md:text-base text-gray-500 font-medium">Gestión de envíos y cobranzas</p>
      </header>

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="relative w-full lg:col-span-5">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar clientes..." className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-green-500 outline-none text-sm font-medium bg-gray-50/50" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        
        <div className="lg:col-span-7 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-2 w-full sm:flex-1">
            <Calendar className="text-green-600" size={18} />
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Desde</span>
              <input type="date" className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 w-full" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-2 w-full sm:flex-1">
            <Calendar className="text-green-600" size={18} />
            <div className="flex flex-col w-full">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hasta</span>
              <input type="date" className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 w-full" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NUEVA VISTA PRINCIPAL: Cuadrícula de Tarjetas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
        {cajasFiltradas.length > 0 ? (
          cajasFiltradas.map((caja: any) => {
            const dia = new Date(caja.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
            const estaPagado = caja.saldo <= 0 && caja.totalCaja > 0;
            const estadoEnvio = caja.estado_envio || 'proceso';
            const ubigeoDestino = caja.tipo_entrega === 'agencia' ? [caja.agencia_distrito, caja.agencia_provincia].filter(Boolean).join(', ') : [caja.clientes?.distrito, caja.clientes?.provincia].filter(Boolean).join(', ');

            return (
              <div key={caja.id} onClick={() => abrirDetalle(caja)} className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-gray-200 cursor-pointer hover:border-green-400 hover:shadow-lg transition-all flex flex-col gap-4 relative group">
                
                {/* 1. Fila Superior: Badges y Fecha */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-gray-800 text-lg tracking-tight group-hover:text-green-700 transition-colors">@{caja.clientes?.usuario_tiktok}</span>
                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"><Calendar size={12}/> {dia}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {estadoEnvio === 'proceso' && <span className="text-[10px] font-black text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">📦 En Proceso</span>}
                    {estadoEnvio === 'listo' && <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">✅ Listo</span>}
                    {estadoEnvio === 'enviado' && <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">🚚 Enviado</span>}
                    
                    {estaPagado ? <span className="text-[10px] font-black text-green-700 bg-green-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">💰 Pagado</span> : <span className="text-[10px] font-black text-orange-700 bg-orange-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">⚠️ Falta S/{caja.saldo.toFixed(2)}</span>}
                  </div>
                </div>

                {/* 2. Fila Media: Ubicación */}
                <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-1">
                  <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    {caja.tipo_entrega === 'agencia' ? <Building2 size={14} className="text-blue-500"/> : <Home size={14} className="text-green-500"/>}
                    {caja.tipo_entrega === 'agencia' ? `Agencia ${caja.courier || ''}` : 'Envío a Domicilio'}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium truncate ml-5" title={ubigeoDestino}>{ubigeoDestino || 'Sin destino configurado'}</p>
                </div>

                {/* 3. Fila Inferior: Monto y Acción */}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-black text-green-700 text-xl">S/ {caja.totalCaja.toFixed(2)}</span>
                  <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-xl group-hover:bg-green-50 group-hover:text-green-700 group-hover:border-green-200 transition-colors">Ver detalle →</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-gray-200 border-dashed">
            <Package size={48} className="mb-4 text-gray-300"/>
            <p className="text-lg font-bold">{cargando ? 'Cargando logística...' : 'No hay pedidos con estos filtros'}</p>
          </div>
        )}
      </div>
      
      {!mostrarAntiguos && !fechaInicio && !fechaFin && !busqueda && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => setMostrarAntiguos(true)} className="text-sm font-black text-gray-500 hover:text-green-700 bg-white border border-gray-200 px-8 py-3.5 rounded-2xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            Cargar más pedidos
          </button>
        </div>
      )}

      {/* ✅ NUEVO: VENTANA EMERGENTE (MODAL) CON LOS DETALLES ORDENADOS */}
      {cajaActiva && (
        <div className="fixed inset-0 z-[50] bg-gray-900/60 backdrop-blur-sm flex justify-center items-end md:items-center md:p-4 animate-in fade-in duration-200">
          
          <div className="bg-white w-full h-[90vh] md:h-[85vh] md:max-w-4xl md:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden border border-gray-100">
            
            {/* Cabecera del Modal Fija */}
            <div className="flex justify-between items-center p-5 md:p-6 lg:px-8 border-b border-gray-100 bg-white z-10 shadow-sm">
              <div className="flex flex-col">
                <h3 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
                  Detalles del Pedido
                  {cajaActiva.estado === 'abierta' && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg animate-pulse">EDITANDO</span>}
                </h3>
                <p className="text-sm font-bold text-green-600">@{cajaActiva.clientes?.usuario_tiktok}</p>
              </div>
              <button onClick={cerrarDetalle} className="p-2.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"><X size={20}/></button>
            </div>

            {/* Contenido del Modal (Desplazable) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50/50 space-y-6">
              
              {/* BLOQUE 1: PLANTAS Y FINANZAS */}
              <div className="flex flex-col xl:flex-row gap-5">
                <div className="flex-1 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                    <h4 className="font-black text-gray-800 flex items-center gap-2 text-base"><Package size={18} className="text-green-600"/> Plantas Compradas</h4>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => copiarResumen(cajaActiva)} className="flex items-center justify-center p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors" title="Copiar al portapapeles"><Copy size={16} /></button>
                      <button onClick={() => enviarResumenWhatsApp(cajaActiva)} className="flex items-center justify-center flex-1 sm:flex-initial gap-2 bg-green-500 text-white hover:bg-green-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md"><Send size={16} /> Enviar por WhatsApp</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cajaActiva.detalle_caja.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        {item.plantas?.imagen_url ? <img src={item.plantas.imagen_url} className="w-12 h-12 object-cover rounded-xl border border-gray-200" /> : <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400"><ImageIcon size={20} /></div>}
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.plantas?.nombre}</p>
                          <p className="text-xs text-gray-500 font-medium">{item.cantidad} x S/ {item.precio_vendido.toFixed(2)}</p>
                        </div>
                        <div className="font-black text-gray-800 text-sm bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">S/ {(item.cantidad * item.precio_vendido).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full xl:w-80 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-3xl p-6 shadow-sm h-fit">
                  <h4 className="font-black text-blue-900 mb-5 flex items-center gap-2 text-base"><DollarSign size={18} className="text-blue-600"/> Detalles de pago</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Costo Total:</span> <span className="text-gray-900 font-bold">S/ {cajaActiva.totalCaja.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600 font-medium"><span>Abonado:</span> <span className="text-blue-600 font-bold">- S/ {cajaActiva.totalAbonado.toFixed(2)}</span></div>
                    <div className="pt-4 border-t border-blue-200/80 flex justify-between font-black text-lg items-center">
                      <span className="text-gray-800 uppercase tracking-wide text-xs">Saldo Final</span>
                      <span className={`px-3 py-1 rounded-xl ${cajaActiva.saldo > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>S/ {cajaActiva.saldo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: LOGÍSTICA Y ESTADOS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pb-10">
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
                  <h4 className="font-black text-gray-800 mb-5 flex items-center gap-2 text-base"><MapPin size={18} className="text-red-500"/> Logística y Etiqueta</h4>
                  
                  {editandoEnvioId === cajaActiva.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-gray-100">
                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">Nombre Recibe</label><input type="text" className="w-full p-3 text-sm font-semibold text-gray-800 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50" value={formEnvio.nombre_completo} onChange={(e) => setFormEnvio({...formEnvio, nombre_completo: e.target.value})} placeholder="Ej. Juan Pérez" /></div>
                        <div><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">DNI</label><input type="text" maxLength={8} className="w-full p-3 text-sm font-semibold text-gray-800 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50 font-mono" value={formEnvio.dni} onChange={(e) => setFormEnvio({...formEnvio, dni: e.target.value.replace(/\D/g, '')})} placeholder="Obligatorio para agencia" /></div>
                        <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">WhatsApp / Celular</label><input type="text" className="w-full p-3 text-sm font-semibold text-gray-800 rounded-xl border border-gray-200 focus:border-green-500 outline-none bg-gray-50 font-mono" value={formEnvio.celular} onChange={(e) => setFormEnvio({...formEnvio, celular: e.target.value})} placeholder="999888777" /></div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'agencia'})} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'agencia' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}><Building2 size={16}/> Agencia</button>
                        <button onClick={() => setFormEnvio({...formEnvio, tipo_entrega: 'domicilio'})} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all border ${formEnvio.tipo_entrega === 'domicilio' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}><Home size={16}/> Domicilio</button>
                      </div>

                      {formEnvio.tipo_entrega === 'agencia' ? (
                        <div className="space-y-2.5 bg-blue-50/30 p-4 rounded-2xl border border-blue-50">
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
                        <div className="space-y-2.5 bg-green-50/30 p-4 rounded-2xl border border-green-50">
                          <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none" value={formEnvio.departamento} onChange={(e) => { actualizarListasUbigeo(e.target.value); setFormEnvio({...formEnvio, departamento: e.target.value, provincia: '', distrito: ''}); }}><option value="">Departamento del domicilio...</option>{listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                          <div className="grid grid-cols-2 gap-2">
                            <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none disabled:opacity-50" disabled={!formEnvio.departamento} value={formEnvio.provincia} onChange={(e) => { actualizarListasUbigeo(formEnvio.departamento, e.target.value); setFormEnvio({...formEnvio, provincia: e.target.value, distrito: ''}); }}><option value="">Provincia...</option>{listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}</select>
                            <select className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none disabled:opacity-50" disabled={!formEnvio.provincia} value={formEnvio.distrito} onChange={(e) => setFormEnvio({...formEnvio, distrito: e.target.value})}><option value="">Distrito...</option>{listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}</select>
                          </div>
                          <input type="text" placeholder="Dirección exacta, Calle, Mz, Lote..." className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:border-green-500 font-semibold text-gray-700 bg-white outline-none" value={formEnvio.direccion} onChange={(e) => setFormEnvio({...formEnvio, direccion: e.target.value})} />
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setEditandoEnvioId(null)} className="w-1/3 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button onClick={() => guardarEnvio(cajaActiva)} disabled={cargando} className="w-2/3 bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 shadow-md"><Save size={18}/> Guardar Cambios</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="flex justify-between items-start">
                        <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${cajaActiva.tipo_entrega === 'agencia' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          {cajaActiva.tipo_entrega === 'agencia' ? `🏢 AGENCIA: ${cajaActiva.courier || 'Pendiente'}` : '🏡 ENVÍO A DOMICILIO'}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={(e) => generarEtiquetaPDF(e, cajaActiva)} className="p-2.5 rounded-xl transition-colors text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200" title="Imprimir PDF"><Printer size={16}/></button>
                          <button onClick={() => iniciarEdicionEnvio(cajaActiva)} disabled={cajaActiva.estado_envio === 'enviado'} className={`p-2.5 rounded-xl transition-colors ${cajaActiva.estado_envio === 'enviado' ? 'text-gray-300 bg-gray-50' : 'text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 border border-gray-200'}`} title="Editar datos"><Edit size={16}/></button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                        <p className="text-sm font-bold text-gray-800 flex items-center flex-wrap gap-2">
                          <User size={16} className="text-gray-400"/> 
                          {cajaActiva.clientes?.nombre_completo || 'No registró nombre'} 
                          {cajaActiva.clientes?.dni ? <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-600">DNI: {cajaActiva.clientes.dni}</span> : ''}
                          {cajaActiva.clientes?.celular ? <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-600 font-mono">📱 {cajaActiva.clientes.celular}</span> : ''}
                        </p>
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                          <MapPin size={16} className="text-red-400 mt-0.5 shrink-0"/> 
                          <span className="leading-snug">
                            <strong className="block text-gray-800">{cajaActiva.tipo_entrega === 'agencia' ? [cajaActiva.agencia_distrito, cajaActiva.agencia_provincia, cajaActiva.agencia_departamento].filter(Boolean).join(', ') || 'Falta indicar Ubigeo' : [cajaActiva.clientes?.distrito, cajaActiva.clientes?.provincia, cajaActiva.clientes?.departamento].filter(Boolean).join(', ') || 'Falta indicar Ubigeo'}</strong>
                            {cajaActiva.tipo_entrega === 'agencia' && cajaActiva.agencia_direccion ? <span className="block mt-1 italic text-gray-500 text-xs">Ref: {cajaActiva.agencia_direccion}</span> : ''}
                            {cajaActiva.tipo_entrega === 'domicilio' && cajaActiva.clientes?.direccion ? <span className="block mt-1 italic text-gray-500 text-xs">Dir: {cajaActiva.clientes?.direccion}</span> : ''}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col h-full">
                  <h4 className="font-black text-gray-800 mb-5 flex items-center gap-2 text-base"><Truck size={18} className="text-purple-600"/> Estado del Pedido</h4>
                  
                  <div className="flex-1 flex flex-col justify-center gap-3">
                    {cajaActiva.estado === 'abierta' && <p className="text-xs text-orange-600 font-bold text-center bg-orange-50 p-3 rounded-xl border border-orange-100 mb-2">⚠️ Debes Guardar el carrito en la Gestión de pedidos para poder cambiar los estados logísticos.</p>}
                    
                    <button onClick={() => cambiarEstadoEnvio(cajaActiva, 'proceso', cajaActiva.estado_envio)} disabled={cajaActiva.estado_envio === 'enviado'} className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-sm transition-all border ${cajaActiva.estado_envio === 'proceso' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'} ${cajaActiva.estado_envio === 'enviado' && 'opacity-50 cursor-not-allowed'}`}><Timer size={18} /> Paquete en Proceso</button>
                    <button onClick={() => cambiarEstadoEnvio(cajaActiva, 'listo', cajaActiva.estado_envio)} disabled={cajaActiva.estado_envio === 'enviado' || cajaActiva.estado === 'abierta'} className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-sm transition-all border ${cajaActiva.estado_envio === 'listo' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'} ${(cajaActiva.estado_envio === 'enviado' || cajaActiva.estado === 'abierta') && 'opacity-50 cursor-not-allowed'}`}><PackageCheck size={18} /> Listo para la Agencia</button>
                    <button onClick={() => cambiarEstadoEnvio(cajaActiva, 'enviado', cajaActiva.estado_envio)} disabled={cajaActiva.estado_envio === 'enviado' || cajaActiva.estado === 'abierta'} className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-sm transition-all border ${cajaActiva.estado_envio === 'enviado' ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-[1.02]' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'} ${(cajaActiva.estado_envio === 'enviado' || cajaActiva.estado === 'abierta') && 'opacity-50 cursor-not-allowed'}`}><Truck size={20} /> {cajaActiva.estado_envio === 'enviado' ? '✅ PEDIDO ENVIADO' : 'MARCAR COMO ENVIADO'}</button>
                    
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      {cajaActiva.estado !== 'abierta' && cajaActiva.estado_envio !== 'enviado' && (
                        <button onClick={(e) => reabrirCaja(e, cajaActiva.id, cajaActiva.cliente_id, cajaActiva.clientes?.usuario_tiktok)} className="flex-1 py-3.5 bg-white text-blue-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-blue-200 hover:bg-blue-50 shadow-sm"><Unlock size={16}/> Editar Caja</button>
                      )}
                      {cajaActiva.estado_envio !== 'enviado' && (
                        <button onClick={(e) => eliminarCaja(e, cajaActiva.id)} className="flex-1 py-3.5 bg-white text-red-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 shadow-sm"><Trash2 size={16}/> Borrar Pedido</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE DIÁLOGO PERSONALIZADO (Alertas / Confirmaciones - Nivel SUPERIOR) */}
      {dialogo.abierto && (
        <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-6 md:p-8 text-center border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-inner ${dialogo.tipo === 'alerta' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
               {dialogo.tipo === 'alerta' ? <Info size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-3 tracking-tight">
              {dialogo.tipo === 'alerta' ? 'Aviso Importante' : 'Confirmación'}
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-8 whitespace-pre-line font-medium leading-relaxed">
              {dialogo.mensaje}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(dialogo.tipo === 'confirmar' || dialogo.tipo === 'opciones') && (
                <button
                  onClick={() => { setDialogo({ ...dialogo, abierto: false }); if (dialogo.accionCancelar) dialogo.accionCancelar(); }}
                  className="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm shadow-sm"
                >
                  {dialogo.textoCancelar || 'Cancelar'}
                </button>
              )}
              <button
                onClick={() => { setDialogo({ ...dialogo, abierto: false }); if (dialogo.accionConfirmar) dialogo.accionConfirmar(); }}
                className={`flex-1 py-3.5 px-4 font-bold rounded-xl transition-colors text-sm shadow-md text-white ${dialogo.tipo === 'alerta' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {dialogo.textoConfirmar || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}