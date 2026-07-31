'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
// Se removieron los íconos no utilizados para evitar errores de compilación en Vercel
import { Search, Plus, X, Image as ImageIcon, Trash2, Edit2, Check, Clock, User, MessageCircle, Phone, AlertTriangle, Info, Package, DollarSign, Timer, Unlock, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [plantas, setPlantas] = useState<any[]>([]);
  
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [sugerenciasClientes, setSugerenciasClientes] = useState<any[]>([]);
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);
  
  const [clienteActual, setClienteActual] = useState<any>(null);
  const [celular, setCelular] = useState('');
  const [cajaActual, setCajaActual] = useState<any>(null);
  const [detallesCaja, setDetallesCaja] = useState<any[]>([]);
  const [abonosCaja, setAbonosCaja] = useState<any[]>([]);
  const [cajasPendientes, setCajasPendientes] = useState<any[]>([]); 
  
  const [montoAbono, setMontoAbono] = useState('');
  const [cargando, setCargando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [busquedaPlanta, setBusquedaPlanta] = useState('');
  const [precioUnidad, setPrecioUnidad] = useState('');
  
  const [cantidad, setCantidad] = useState<number | string>(1); 
  
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  
  const [itemEditando, setItemEditando] = useState<any>(null);
  const [precioEdit, setPrecioEdit] = useState('');
  const [cantidadEdit, setCantidadEdit] = useState<number | string>(1);

  const [dialogo, setDialogo] = useState<{
    abierto: boolean;
    mensaje: string;
    tipo: 'alerta' | 'confirmar';
    textoConfirmar?: string;
    textoCancelar?: string;
    accionConfirmar?: () => void;
    accionCancelar?: () => void;
  }>({ abierto: false, mensaje: '', tipo: 'alerta' });

  useEffect(() => {
    cargarPlantas();
    cargarPendientes();
  }, []);

  const cargarPlantas = async () => {
    const { data } = await supabase.from('plantas').select('*');
    if (data) setPlantas(data);
  };

  const cargarPendientes = async () => {
    const { data } = await supabase
      .from('cajas')
      .select('id, clientes(*)')
      .eq('estado', 'abierta')
      .order('created_at', { ascending: false });
    if (data) setCajasPendientes(data);
  };

  const buscarClientesEnTiempoReal = async (termino: string) => {
    setBusquedaCliente(termino);
    if (!termino.trim()) {
      setSugerenciasClientes([]);
      return;
    }
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or(`usuario_tiktok.ilike.%${termino}%,nombre_completo.ilike.%${termino}%,dni.ilike.%${termino}%`)
      .limit(10);
      
    if (data) setSugerenciasClientes(data);
    setMostrarSugerenciasCliente(true);
  };

  const seleccionarCliente = async (clienteExistente: any = null, textoNuevo: string = '') => {
    setMostrarSugerenciasCliente(false);
    
    let cliente = clienteExistente;

    if (!cliente) {
      const textoLimpio = textoNuevo.trim();
      if (!textoLimpio) {
        return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Ingresa un nombre de usuario para buscar o crear un cliente." });
      }
      setCargando(true);
      let { data: encontrados } = await supabase.from('clientes').select('*').ilike('usuario_tiktok', textoLimpio);
        
      if (encontrados && encontrados.length > 0) {
        cliente = encontrados[0];
      } else {
        const { data: nuevoCliente } = await supabase.from('clientes').insert([{ usuario_tiktok: textoLimpio }]).select().single();
        cliente = nuevoCliente;
      }
    } else {
      setCargando(true);
    }

    try {
      setClienteActual(cliente);
      setBusquedaCliente(cliente.usuario_tiktok); 
      setCelular(cliente.celular || ''); 

      let { data: cajasAbiertas } = await supabase.from('cajas').select('*').eq('cliente_id', cliente.id).eq('estado', 'abierta').order('created_at', { ascending: false });

      let caja = null;
      if (cajasAbiertas && cajasAbiertas.length > 0) {
        caja = cajasAbiertas[0]; 
        if (cajasAbiertas.length > 1) {
          const idsCerrar = cajasAbiertas.slice(1).map((c: any) => c.id);
          await supabase.from('cajas').update({ estado: 'cerrada' }).in('id', idsCerrar);
        }
      } else {
        const { data: nuevaCaja } = await supabase.from('cajas').insert([{ cliente_id: cliente.id, estado: 'abierta' }]).select().single();
        caja = nuevaCaja;
      }
      
      setCajaActual(caja);

      const { data: detalles } = await supabase.from('detalle_caja').select('*, plantas(*)').eq('caja_id', caja.id);
      if (detalles) setDetallesCaja(detalles);

      const { data: abonos } = await supabase.from('abonos').select('*').eq('caja_id', caja.id);
      if (abonos) setAbonosCaja(abonos);

      cargarPendientes(); 

    } catch (error: any) {
      setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Error al cargar la caja: " + (error.message || "Problema de conexión") });
    } finally {
      setCargando(false);
    }
  };

  const manejarSubidaFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivoFoto(file);
      setPreviewFoto(URL.createObjectURL(file));
    }
  };

  const guardarProductoEnCaja = async () => {
    if (!cajaActual) return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Abre una caja primero." });
    if (!busquedaPlanta.trim()) return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Escribe el nombre de la planta." });
    if (!precioUnidad || parseFloat(precioUnidad) <= 0) return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Ingresa un precio unitario válido." });

    setCargando(true);
    try {
      let plantaId: string | null = null;
      let imagenUrlFinal: string | null = null;
      let precioNumerico = parseFloat(precioUnidad);
      let cantidadFinal = Number(cantidad) || 1; 

      if (archivoFoto) {
        const fileExt = archivoFoto.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('fotos_plantas').upload(fileName, archivoFoto);
        if (uploadError) throw new Error("Error al subir la foto: " + uploadError.message);
        const { data: publicUrlData } = supabase.storage.from('fotos_plantas').getPublicUrl(fileName);
        imagenUrlFinal = publicUrlData.publicUrl;
      }

      const plantaExistente = plantas.find((p: any) => p.nombre.toLowerCase() === busquedaPlanta.trim().toLowerCase());
      
      if (plantaExistente) {
        plantaId = plantaExistente.id;
        let datosAActualizar: any = { precio_menor: precioNumerico };
        if (imagenUrlFinal) datosAActualizar.imagen_url = imagenUrlFinal;
        await supabase.from('plantas').update(datosAActualizar).eq('id', plantaId);
        setPlantas(plantas.map((p: any) => p.id === plantaId ? { ...p, ...datosAActualizar } : p));
      } else {
        const nuevoRegistro: any = { nombre: busquedaPlanta.trim(), precio_menor: precioNumerico, precio_mayor: 0 };
        if (imagenUrlFinal) nuevoRegistro.imagen_url = imagenUrlFinal;
        const { data: nuevaPlanta } = await supabase.from('plantas').insert([nuevoRegistro]).select().single();
        if (nuevaPlanta) {
          plantaId = nuevaPlanta.id;
          setPlantas([...plantas, nuevaPlanta]);
        }
      }

      const { data: detalle } = await supabase.from('detalle_caja').insert([{ caja_id: cajaActual.id, planta_id: plantaId, cantidad: cantidadFinal, precio_vendido: precioNumerico }]).select('*, plantas(*)').single();
      if (detalle) {
        setDetallesCaja([...detallesCaja, detalle]);
        setBusquedaPlanta(''); setPrecioUnidad(''); setCantidad(1); setArchivoFoto(null); setPreviewFoto(null); setModalAbierto(false);
      }
    } catch (error: any) {
      setDialogo({ abierto: true, tipo: 'alerta', mensaje: `Ocurrió un problema: ${error.message}` });
    } finally {
      setCargando(false);
    }
  };

  const eliminarItem = (idDetalle: string) => {
    setDialogo({
      abierto: true,
      tipo: 'confirmar',
      mensaje: "¿Seguro que deseas quitar esta planta del carrito?",
      textoConfirmar: 'Sí, quitar',
      accionConfirmar: async () => {
        setCargando(true);
        const { error } = await supabase.from('detalle_caja').delete().eq('id', idDetalle);
        if (!error) setDetallesCaja(detallesCaja.filter((d: any) => d.id !== idDetalle));
        setCargando(false);
      }
    });
  };

  const iniciarEdicion = (item: any) => { setItemEditando(item); setPrecioEdit(item.precio_vendido.toString()); setCantidadEdit(item.cantidad); };

  const guardarEdicion = async () => {
    setCargando(true);
    let cantidadFinalEdit = Number(cantidadEdit) || 1;

    const { error } = await supabase.from('detalle_caja').update({ precio_vendido: parseFloat(precioEdit), cantidad: cantidadFinalEdit }).eq('id', itemEditando.id);
    if (!error) {
      setDetallesCaja(detallesCaja.map((item: any) => item.id === itemEditando.id ? { ...item, precio_vendido: parseFloat(precioEdit), cantidad: cantidadFinalEdit } : item));
      setItemEditando(null);
    }
    setCargando(false);
  };

  const registrarAbono = async () => {
    if (!cajaActual) return;
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Ingresa un monto válido para abonar." });
    
    setCargando(true);
    const { data } = await supabase.from('abonos').insert([{ caja_id: cajaActual.id, monto: monto }]).select().single();
    if (data) { setAbonosCaja([...abonosCaja, data]); setMontoAbono(''); }
    setCargando(false);
  };

  const enviarPorWhatsApp = () => {
    if (!celular) return setDialogo({ abierto: true, tipo: 'alerta', mensaje: "Por favor, registra primero el WhatsApp del cliente en el campo superior." });
    const numeroLimpio = celular.replace(/\D/g, '');
    const numeroFinal = numeroLimpio.startsWith('51') ? numeroLimpio : `51${numeroLimpio}`;
    
    const nombre = clienteActual?.nombre_completo || `@${clienteActual?.usuario_tiktok}`;
    const mensaje = `¡Hola ${nombre}! 🌿 Gracias por tu compra en WasiPlant.\n\n` + 
                    `Tu total a pagar es: S/ ${totalCaja.toFixed(2)}\n` +
                    (saldoPendiente > 0 ? `Saldo pendiente: S/ ${saldoPendiente.toFixed(2)}\n\n` : `¡Pedido cancelado en su totalidad! 💚\n\n`) +
                    `Por favor envíanos la captura de tu transferencia. ¡Gracias!`;

    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const cerrarCaja = () => {
    if (!cajaActual) return;
    setDialogo({
      abierto: true,
      tipo: 'confirmar',
      mensaje: `¿Estás listo para cerrar la caja de @${clienteActual.usuario_tiktok}?\n\nEl pedido pasará a Logística para su empaquetado.`,
      textoConfirmar: 'Sí, Cerrar Caja',
      accionConfirmar: async () => {
        setCargando(true);
        await supabase.from('cajas').update({ estado: 'cerrada' }).eq('id', cajaActual.id);
        setClienteActual(null); setCajaActual(null); setDetallesCaja([]); setAbonosCaja([]); 
        setBusquedaCliente(''); setCelular('');
        cargarPendientes(); 
        setCargando(false);
      }
    });
  };

  const totalCaja = detallesCaja.reduce((suma: number, item: any) => suma + (item.precio_vendido * item.cantidad), 0);
  const totalAbonado = abonosCaja.reduce((suma: number, abono: any) => suma + abono.monto, 0);
  const saldoPendiente = totalCaja - totalAbonado;
  const plantasFiltradas = plantas.filter((p: any) => p.nombre.toLowerCase().includes(busquedaPlanta.toLowerCase()));

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-gray-800 bg-gray-50/30 relative">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-green-700 tracking-tight">Gestión de pedidos</h1>
        <p className="text-sm md:text-base text-gray-500 font-medium">Gestión de  pedidos</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        
        <div className="xl:col-span-7 space-y-6">
          
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 relative z-30">
            <h2 className="text-lg md:text-xl font-black mb-5 text-gray-800 flex items-center gap-2">
              <User size={22} className="text-green-600"/> Clientes
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-4 text-gray-400"><Search size={20} /></span>
                <input 
                  type="text" 
                  placeholder="Buscar clientes..." 
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all bg-gray-50/50 font-medium" 
                  value={busquedaCliente} 
                  onChange={(e) => buscarClientesEnTiempoReal(e.target.value)} 
                  onFocus={() => setMostrarSugerenciasCliente(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerenciasCliente(false), 200)} 
                  onKeyDown={(e) => e.key === 'Enter' && seleccionarCliente(null, busquedaCliente)}
                />
                
                {mostrarSugerenciasCliente && busquedaCliente.trim() !== '' && (
                  <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-60 overflow-y-auto z-40">
                    {sugerenciasClientes.length > 0 ? (
                      sugerenciasClientes.map((c: any) => (
                        <li 
                          key={c.id} 
                          onMouseDown={() => seleccionarCliente(c)} 
                          className="px-5 py-3.5 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex flex-col transition-colors last:border-0"
                        >
                          <span className="font-black text-gray-800">@{c.usuario_tiktok}</span>
                          {(c.nombre_completo || c.dni || c.celular) && (
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-1">
                              {c.nombre_completo} {c.dni ? `• DNI: ${c.dni}` : ''} {c.celular ? `• Cel: ${c.celular}` : ''}
                            </span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="px-5 py-5 text-sm text-gray-500 flex flex-col items-center justify-center text-center">
                        <span className="font-black text-gray-700 mb-2">Cliente nuevo</span>
                        <span>Presiona <kbd className="bg-gray-100 px-2.5 py-1 rounded-lg text-gray-600 font-mono text-xs font-bold border border-gray-200">Enter</kbd> o el botón verde para registrarlo.</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              
              <button 
                onClick={() => seleccionarCliente(null, busquedaCliente)} 
                disabled={cargando} 
                className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 px-6 rounded-2xl disabled:opacity-50 transition-colors whitespace-nowrap shadow-md w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {cargando ? <Timer size={18} className="animate-spin"/> : <Unlock size={18}/>}
                {cargando ? 'Abriendo...' : 'Abrir Carrito'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm min-h-[250px] flex flex-col items-center justify-center border-dashed border-2 border-gray-200">
            <h2 className="text-xl font-black mb-3 text-gray-800 text-center flex items-center gap-2"><Package size={22} className="text-gray-400"/> Agregar Productos</h2>
            <p className="text-gray-400 mb-6 text-center text-sm font-medium max-w-sm">Abre la caja de un cliente arriba para poder empezar a registrar sus plantas y compras.</p>
            <button onClick={() => setModalAbierto(true)} disabled={!cajaActual} className="flex items-center justify-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 hover:-translate-y-1 font-black py-4 px-8 rounded-2xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 w-full sm:w-auto shadow-sm">
              <Plus size={24} /> Añadir Producto al Carrito
            </button>
          </div>
        </div>

        <div className="xl:col-span-5 h-fit sticky top-8 z-20">
          
          {!clienteActual ? (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center py-12">
              <div className="bg-gray-50 w-full rounded-3xl p-8 text-center border border-gray-100 border-dashed">
                <Clock className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-gray-500 font-black mb-2 text-lg">Pedidos en espera</h3>
                <p className="text-sm text-gray-400 mb-8 font-medium">Selccione a un cliente para empezar a registrar su pedido actual.</p>
                
                {cajasPendientes.length > 0 && (
                  <div className="text-left border-t border-gray-200 pt-6">
                    <h4 className="text-xs font-black text-blue-600 uppercase mb-4 flex items-center gap-2 tracking-wider">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                      Pedidos en curso ({cajasPendientes.length})
                    </h4>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                      {cajasPendientes.map((c: any) => (
                        <button 
                          key={c.id} 
                          onClick={() => seleccionarCliente(c.clientes)}
                          className="w-full text-left bg-white border border-blue-100 hover:border-blue-400 hover:shadow-md p-3.5 rounded-2xl text-sm font-black text-gray-700 transition-all flex justify-between items-center group"
                        >
                          <span className="group-hover:text-blue-700 transition-colors">@{c.clientes?.usuario_tiktok}</span>
                          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">Retomar <Clock size={12}/></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-lg border border-gray-100 animate-in slide-in-from-right-8 duration-300">
              
              <div className="flex flex-col mb-6 pb-5 border-b border-gray-100">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Caja Abierta</span>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-green-700 truncate pr-2">@{clienteActual.usuario_tiktok}</h2>
                </div>
              </div>

              <div className="mb-5 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 shadow-inner">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Phone size={14}/> Celular / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ej. 999888777"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-semibold transition-all font-mono"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  onBlur={async () => {
                    if (clienteActual && celular !== clienteActual.celular) {
                      await supabase.from('clientes').update({ celular }).eq('id', clienteActual.id);
                    }
                  }}
                />
              </div>
              
              <div className="min-h-[150px] mb-6 bg-gray-50/50 rounded-3xl p-2 border border-gray-100 max-h-[350px] overflow-y-auto shadow-inner">
                {detallesCaja.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center py-10 font-medium">
                    <Package size={32} className="mb-2 text-gray-300"/>
                    El carrito está vacío.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {detallesCaja.map((item: any) => (
                      <li key={item.id} className="flex flex-col text-sm bg-white p-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-gray-200">
                        {itemEditando?.id === item.id ? (
                          <div className="flex gap-2 items-center bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                            <input 
                              type="number" 
                              className="w-16 p-2 bg-white border border-gray-200 rounded-lg text-center font-bold outline-none focus:border-blue-500" 
                              value={cantidadEdit} 
                              onChange={e => setCantidadEdit(e.target.value === '' ? '' : parseInt(e.target.value))}
                              onBlur={() => { if(cantidadEdit === '' || Number(cantidadEdit) < 1) setCantidadEdit(1); }} 
                            />
                            <span className="text-xs font-black text-gray-400">x</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-2 text-gray-400 font-bold text-xs">S/</span>
                              <input 
                                type="number" 
                                className="w-full pl-6 pr-2 p-2 bg-white border border-gray-200 rounded-lg font-bold outline-none focus:border-blue-500" 
                                value={precioEdit} 
                                onChange={e => setPrecioEdit(e.target.value)} 
                              />
                            </div>
                            <div className="flex justify-end gap-1 ml-1">
                              <button onClick={() => setItemEditando(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><X size={16}/></button>
                              <button onClick={guardarEdicion} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"><Check size={16}/></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-center">
                            {item.plantas?.imagen_url ? (
                              <img src={item.plantas.imagen_url} alt="Planta" className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200"><ImageIcon size={20} /></div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex justify-between font-black text-gray-800 text-sm">
                                <span className="line-clamp-1">{item.cantidad}x {item.plantas?.nombre}</span>
                                <span>S/ {(item.precio_vendido * item.cantidad).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">S/ {item.precio_vendido} c/u</span>
                                <div className="flex gap-1">
                                  <button onClick={() => iniciarEdicion(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14}/></button>
                                  <button onClick={() => eliminarItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-5 md:p-6 text-white shadow-xl mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80}/></div>
                
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><DollarSign size={14}/> Resumen Financiero</h3>
                
                <div className="space-y-2 mb-4 relative z-10">
                  <div className="flex justify-between text-sm font-medium text-gray-300"><span>Subtotal:</span><span>S/ {totalCaja.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm font-medium text-blue-300"><span>Abonado:</span><span>- S/ {totalAbonado.toFixed(2)}</span></div>
                </div>

                <div className="border-t border-gray-700/50 pt-4 mb-5 relative z-10">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-3 text-gray-400 font-bold text-sm">S/</span>
                      <input type="number" className="w-full pl-8 pr-3 py-2.5 bg-gray-800/50 border border-gray-600 text-white rounded-xl focus:border-green-400 outline-none font-semibold text-sm transition-colors placeholder-gray-500" placeholder="Abono..." value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} />
                    </div>
                    <button onClick={registrarAbono} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-md whitespace-nowrap">Abonar</button>
                  </div>
                  {abonosCaja.length > 0 && (
                    <ul className="mt-3 text-xs text-gray-300 space-y-1.5 bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                      {abonosCaja.map((abono: any, i: number) => (
                        <li key={i} className="flex justify-between border-b border-gray-700/50 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-semibold text-gray-400">Abono #{i + 1}</span><span className="text-blue-400 font-bold">+ S/ {abono.monto.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={`relative z-10 flex justify-between items-center p-4 rounded-2xl font-black text-xl md:text-2xl shadow-inner ${saldoPendiente <= 0 && totalCaja > 0 ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'}`}>
                  <span className="text-sm uppercase tracking-wider font-bold opacity-80">Saldo</span>
                  <span>S/ {saldoPendiente.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button onClick={enviarPorWhatsApp} disabled={cargando} className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-0.5">
                  <MessageCircle size={22} /> WhatsApp al Cliente
                </button>
                <button onClick={cerrarCaja} disabled={cargando} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-black py-4 px-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2">
                  <CheckCircle2 size={20}/> Cerrar Caja y Despachar
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-green-50/50 p-5 md:p-6 border-b border-green-100 flex justify-between items-center">
              <h3 className="font-black text-green-800 flex items-center gap-2 text-lg"><Package size={22} /> Añadir Planta</h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-800 bg-white shadow-sm rounded-full p-2 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="relative">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">1. Especie o Nombre</label>
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input type="text" className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-green-500 outline-none text-sm font-bold bg-gray-50/50 shadow-inner" placeholder="Ej. Monstera Deliciosa..." value={busquedaPlanta} onChange={(e) => { setBusquedaPlanta(e.target.value); setMostrarSugerencias(true); }} onFocus={() => setMostrarSugerencias(true)} onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)} />
                </div>
                
                {mostrarSugerencias && busquedaPlanta.trim() !== '' && plantasFiltradas.length > 0 && (
                  <ul className="absolute z-10 w-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-48 overflow-y-auto">
                    {plantasFiltradas.map((p: any) => (
                      <li key={p.id} onClick={() => { setBusquedaPlanta(p.nombre); if (p.precio_menor && p.precio_menor > 0) setPrecioUnidad(p.precio_menor.toString()); setMostrarSugerencias(false); }} className="px-5 py-3 hover:bg-green-50 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 flex justify-between items-center transition-colors">
                        <span>{p.nombre}</span>
                        {p.precio_menor > 0 && <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg">S/ {p.precio_menor}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">Precio c/u</label>
                  <div className="relative"><span className="absolute left-4 top-3.5 text-gray-400 font-black text-sm">S/</span><input type="number" className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-green-500 outline-none font-bold bg-gray-50/50 shadow-inner text-sm" placeholder="0.00" value={precioUnidad} onChange={(e) => setPrecioUnidad(e.target.value)} /></div>
                </div>
                <div className="w-28">
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">Cantidad</label>
                  <input 
                    type="number" min="1" 
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-green-500 outline-none text-center font-black bg-gray-50/50 shadow-inner text-sm" 
                    value={cantidad} 
                    onChange={(e) => setCantidad(e.target.value === '' ? '' : parseInt(e.target.value))} 
                    onBlur={() => { if(cantidad === '' || Number(cantidad) < 1) setCantidad(1); }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">Foto del producto</label>
                <div onClick={() => inputArchivoRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer overflow-hidden relative">
                  {previewFoto ? <img src={previewFoto} alt="Preview" className="h-32 object-contain rounded-xl shadow-sm" /> : <><ImageIcon size={32} className="mb-3 text-gray-300" /><span className="text-xs font-semibold text-center text-gray-500">Haz clic aquí para subir o tomar foto</span></>}
                  <input type="file" accept="image/*" capture="environment" ref={inputArchivoRef} onChange={manejarSubidaFoto} className="hidden"/>
                </div>
              </div>

              <button onClick={guardarProductoEnCaja} disabled={cargando} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 flex justify-center items-center gap-2">
                {cargando ? <Timer className="animate-spin" size={20}/> : <Plus size={20}/>}
                {cargando ? 'Guardando...' : 'Añadir Planta al Carrito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogo.abierto && (
        <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-6 md:p-8 text-center border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-inner ${dialogo.tipo === 'alerta' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
               {dialogo.tipo === 'alerta' ? <Info size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-3 tracking-tight">
              {dialogo.tipo === 'alerta' ? 'Aviso Importante' : 'Confirmar Acción'}
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-8 whitespace-pre-line font-medium leading-relaxed">
              {dialogo.mensaje}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {dialogo.tipo === 'confirmar' && (
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