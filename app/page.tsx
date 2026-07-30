'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, Image as ImageIcon, Trash2, Edit2, Check, Clock, User } from 'lucide-react';

export default function Home() {
  const [plantas, setPlantas] = useState<any[]>([]);
  
  // NUEVOS ESTADOS PARA EL BUSCADOR INTELIGENTE
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [sugerenciasClientes, setSugerenciasClientes] = useState<any[]>([]);
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);
  
  const [clienteActual, setClienteActual] = useState<any>(null);
  const [cajaActual, setCajaActual] = useState<any>(null);
  const [detallesCaja, setDetallesCaja] = useState<any[]>([]);
  const [abonosCaja, setAbonosCaja] = useState<any[]>([]);
  const [cajasPendientes, setCajasPendientes] = useState<any[]>([]); 
  
  const [montoAbono, setMontoAbono] = useState('');
  const [cargando, setCargando] = useState(false);

  // Estados del modal y edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busquedaPlanta, setBusquedaPlanta] = useState('');
  const [precioUnidad, setPrecioUnidad] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [itemEditando, setItemEditando] = useState<any>(null);
  const [precioEdit, setPrecioEdit] = useState('');
  const [cantidadEdit, setCantidadEdit] = useState<number>(1);

  useEffect(() => {
    cargarPlantas();
    cargarPendientes();
  }, []);

  const cargarPlantas = async () => {
    const { data } = await supabase.from('plantas').select('*');
    if (data) setPlantas(data);
  };

  const cargarPendientes = async () => {
    // Ahora pedimos todos los datos del cliente para que funcione el buscador al retomarlo
    const { data } = await supabase
      .from('cajas')
      .select('id, clientes(*)')
      .eq('estado', 'abierta')
      .order('created_at', { ascending: false });
    if (data) setCajasPendientes(data);
  };

  // NUEVO: Motor de Búsqueda Inteligente (Usuario, Nombre, DNI)
  const buscarClientesEnTiempoReal = async (termino: string) => {
    setBusquedaCliente(termino);
    if (!termino.trim()) {
      setSugerenciasClientes([]);
      return;
    }
    
    // ilike = insensible a mayúsculas/minúsculas. Buscamos coincidencias en 3 columnas a la vez.
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or(`usuario_tiktok.ilike.%${termino}%,nombre_completo.ilike.%${termino}%,dni.ilike.%${termino}%`)
      .limit(10);
      
    if (data) setSugerenciasClientes(data);
    setMostrarSugerenciasCliente(true);
  };

  // MEJORADO: Abre la caja seleccionando desde la sugerencia o creando uno nuevo
  const seleccionarCliente = async (clienteExistente: any = null, textoNuevo: string = '') => {
    setMostrarSugerenciasCliente(false);
    setCargando(true);
    
    try {
      let cliente = clienteExistente;

      // Si le dio a "Enter" o al botón sin seleccionar de la lista, buscamos coincidencias o lo creamos
      if (!cliente) {
        const textoLimpio = textoNuevo.trim();
        if (!textoLimpio) {
          setCargando(false);
          return alert("Ingresa un usuario para buscar o crear.");
        }
        
        let { data: encontrados } = await supabase
          .from('clientes')
          .select('*')
          .ilike('usuario_tiktok', textoLimpio);
          
        if (encontrados && encontrados.length > 0) {
          cliente = encontrados[0];
        } else {
          // Si no existe, lo creamos asumiendo que el texto ingresado es su @usuario_tiktok
          const { data: nuevoCliente } = await supabase.from('clientes').insert([{ usuario_tiktok: textoLimpio }]).select().single();
          cliente = nuevoCliente;
        }
      }

      setClienteActual(cliente);
      setBusquedaCliente(cliente.usuario_tiktok); // Seteamos el input con el @usuario exacto

      // Busca caja abierta
      let { data: cajasAbiertas } = await supabase.from('cajas').select('*').eq('cliente_id', cliente.id).eq('estado', 'abierta').order('created_at', { ascending: false });

      let caja = null;
      if (cajasAbiertas && cajasAbiertas.length > 0) {
        caja = cajasAbiertas[0]; 
        if (cajasAbiertas.length > 1) {
          const idsCerrar = cajasAbiertas.slice(1).map(c => c.id);
          await supabase.from('cajas').update({ estado: 'cerrada' }).in('id', idsCerrar);
        }
      } else {
        const { data: nuevaCaja } = await supabase.from('cajas').insert([{ cliente_id: cliente.id, estado: 'abierta' }]).select().single();
        caja = nuevaCaja;
      }
      
      setCajaActual(caja);

      // Traer productos y abonos
      const { data: detalles } = await supabase.from('detalle_caja').select('*, plantas(*)').eq('caja_id', caja.id);
      if (detalles) setDetallesCaja(detalles);

      const { data: abonos } = await supabase.from('abonos').select('*').eq('caja_id', caja.id);
      if (abonos) setAbonosCaja(abonos);

      cargarPendientes(); 

    } catch (error: any) {
      alert("Error al cargar la caja: " + (error.message || "Problema de conexión"));
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
    if (!cajaActual) return alert("Abre una caja primero");
    if (!busquedaPlanta.trim()) return alert("Escribe el nombre de la planta");
    if (!precioUnidad || parseFloat(precioUnidad) <= 0) return alert("Ingresa un precio válido");

    setCargando(true);
    try {
      let plantaId: string | null = null;
      let imagenUrlFinal: string | null = null;
      let precioNumerico = parseFloat(precioUnidad);

      if (archivoFoto) {
        const fileExt = archivoFoto.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('fotos_plantas').upload(fileName, archivoFoto);
        if (uploadError) throw new Error("Error al subir la foto: " + uploadError.message);
        const { data: publicUrlData } = supabase.storage.from('fotos_plantas').getPublicUrl(fileName);
        imagenUrlFinal = publicUrlData.publicUrl;
      }

      const plantaExistente = plantas.find(p => p.nombre.toLowerCase() === busquedaPlanta.trim().toLowerCase());
      
      if (plantaExistente) {
        plantaId = plantaExistente.id;
        let datosAActualizar: any = { precio_menor: precioNumerico };
        if (imagenUrlFinal) datosAActualizar.imagen_url = imagenUrlFinal;
        await supabase.from('plantas').update(datosAActualizar).eq('id', plantaId);
        setPlantas(plantas.map(p => p.id === plantaId ? { ...p, ...datosAActualizar } : p));
      } else {
        const nuevoRegistro: any = { nombre: busquedaPlanta.trim(), precio_menor: precioNumerico, precio_mayor: 0 };
        if (imagenUrlFinal) nuevoRegistro.imagen_url = imagenUrlFinal;
        const { data: nuevaPlanta } = await supabase.from('plantas').insert([nuevoRegistro]).select().single();
        if (nuevaPlanta) {
          plantaId = nuevaPlanta.id;
          setPlantas([...plantas, nuevaPlanta]);
        }
      }

      const { data: detalle } = await supabase.from('detalle_caja').insert([{ caja_id: cajaActual.id, planta_id: plantaId, cantidad: cantidad, precio_vendido: precioNumerico }]).select('*, plantas(*)').single();
      if (detalle) {
        setDetallesCaja([...detallesCaja, detalle]);
        setBusquedaPlanta(''); setPrecioUnidad(''); setCantidad(1); setArchivoFoto(null); setPreviewFoto(null); setModalAbierto(false);
      }
    } catch (error: any) {
      alert(`Ocurrió un problema: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const eliminarItem = async (idDetalle: string) => {
    if (!window.confirm("¿Seguro que deseas quitar esta planta del pedido?")) return;
    setCargando(true);
    const { error } = await supabase.from('detalle_caja').delete().eq('id', idDetalle);
    if (!error) setDetallesCaja(detallesCaja.filter(d => d.id !== idDetalle));
    setCargando(false);
  };

  const iniciarEdicion = (item: any) => { setItemEditando(item); setPrecioEdit(item.precio_vendido.toString()); setCantidadEdit(item.cantidad); };

  const guardarEdicion = async () => {
    setCargando(true);
    const { error } = await supabase.from('detalle_caja').update({ precio_vendido: parseFloat(precioEdit), cantidad: cantidadEdit }).eq('id', itemEditando.id);
    if (!error) {
      setDetallesCaja(detallesCaja.map(item => item.id === itemEditando.id ? { ...item, precio_vendido: parseFloat(precioEdit), cantidad: cantidadEdit } : item));
      setItemEditando(null);
    }
    setCargando(false);
  };

  const registrarAbono = async () => {
    if (!cajaActual) return;
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) return;
    const { data } = await supabase.from('abonos').insert([{ caja_id: cajaActual.id, monto: monto }]).select().single();
    if (data) { setAbonosCaja([...abonosCaja, data]); setMontoAbono(''); }
  };

  const cerrarCaja = async () => {
    if (!cajaActual) return;
    if (!window.confirm(`¿Cerrar la caja de @${clienteActual.usuario_tiktok}?`)) return;
    setCargando(true);
    await supabase.from('cajas').update({ estado: 'cerrada' }).eq('id', cajaActual.id);
    setClienteActual(null); setCajaActual(null); setDetallesCaja([]); setAbonosCaja([]); 
    setBusquedaCliente(''); // Limpiamos la barra de búsqueda
    cargarPendientes(); 
    setCargando(false);
  };

  const totalCaja = detallesCaja.reduce((suma, item) => suma + (item.precio_vendido * item.cantidad), 0);
  const totalAbonado = abonosCaja.reduce((suma, abono) => suma + abono.monto, 0);
  const saldoPendiente = totalCaja - totalAbonado;
  const plantasFiltradas = plantas.filter(p => p.nombre.toLowerCase().includes(busquedaPlanta.toLowerCase()));

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans text-gray-800">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">🌱 Panel en Vivo</h1>
        <p className="text-gray-500">Gestión dinámica de pedidos</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          
          {/* 1. BUSCADOR INTELIGENTE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative z-30">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <User size={24} className="text-green-600"/> 1. Identificar Cliente
            </h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-3.5 text-gray-400"><Search size={20} /></span>
                <input 
                  type="text" 
                  placeholder="Buscar por @usuario, nombre o DNI..." 
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all bg-gray-50/50" 
                  value={busquedaCliente} 
                  onChange={(e) => buscarClientesEnTiempoReal(e.target.value)} 
                  onFocus={() => setMostrarSugerenciasCliente(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerenciasCliente(false), 200)} // Retardo para permitir el clic en la lista
                  onKeyDown={(e) => e.key === 'Enter' && seleccionarCliente(null, busquedaCliente)}
                />
                
                {/* LISTA DESPLEGABLE DE SUGERENCIAS */}
                {mostrarSugerenciasCliente && busquedaCliente.trim() !== '' && (
                  <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-xl max-h-60 overflow-y-auto z-40">
                    {sugerenciasClientes.length > 0 ? (
                      sugerenciasClientes.map(c => (
                        <li 
                          key={c.id} 
                          onMouseDown={() => seleccionarCliente(c)} // onMouseDown se ejecuta antes que el onBlur del input
                          className="px-5 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 flex flex-col transition-colors"
                        >
                          <span className="font-bold text-gray-800">@{c.usuario_tiktok}</span>
                          {(c.nombre_completo || c.dni) && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              {c.nombre_completo} {c.dni ? `• DNI: ${c.dni}` : ''}
                            </span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="px-5 py-4 text-sm text-gray-500 flex flex-col items-center justify-center text-center">
                        <span className="font-bold text-gray-700 mb-1">Cliente no encontrado</span>
                        <span>Presiona <kbd className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono text-xs">Enter</kbd> o el botón verde para registrarlo como nuevo.</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
              
              <button 
                onClick={() => seleccionarCliente(null, busquedaCliente)} 
                disabled={cargando} 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl disabled:bg-gray-400 transition-colors whitespace-nowrap"
              >
                {cargando ? 'Buscando...' : 'Abrir Caja'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col items-center justify-center border-dashed border-2 border-gray-200">
            <h2 className="text-xl font-semibold mb-2 text-gray-700 text-center">2. Agregar Productos</h2>
            <p className="text-gray-400 mb-6 text-center text-sm max-w-md">Abre la caja de un cliente primero. Luego añade plantas con fotos y precios.</p>
            <button onClick={() => setModalAbierto(true)} disabled={!cajaActual} className="flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105 font-bold py-4 px-8 rounded-2xl transition-all disabled:opacity-50">
              <Plus size={24} /> Añadir Producto
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit sticky top-8 z-20">
          
          {!clienteActual ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="bg-gray-50 w-full rounded-xl p-6 text-center border border-gray-100">
                <Clock className="mx-auto text-gray-300 mb-3" size={40} />
                <h3 className="text-gray-500 font-semibold mb-2">Caja inactiva</h3>
                <p className="text-sm text-gray-400 mb-6">Busca a un cliente para empezar a registrar su pedido.</p>
                
                {cajasPendientes.length > 0 && (
                  <div className="text-left border-t border-gray-200 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                      Pedidos en curso ({cajasPendientes.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {cajasPendientes.map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => seleccionarCliente(c.clientes)}
                          className="w-full text-left bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 p-3 rounded-lg text-sm font-semibold text-gray-700 transition-all flex justify-between items-center"
                        >
                          <span>@{c.clientes?.usuario_tiktok}</span>
                          <span className="text-blue-500 text-xs font-bold flex items-center gap-1">Retomar <Clock size={12}/></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4 border-b pb-4 flex justify-between items-center">
                Caja Actual <span className="bg-green-100 text-green-700 text-sm py-1 px-3 rounded-full font-bold">@{clienteActual.usuario_tiktok}</span>
              </h2>
              
              <div className="min-h-[200px] mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100 max-h-[400px] overflow-y-auto">
                {detallesCaja.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center py-10">La caja está vacía.</div>
                ) : (
                  <ul className="space-y-3">
                    {detallesCaja.map((item) => (
                      <li key={item.id} className="flex flex-col text-sm bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        {itemEditando?.id === item.id ? (
                          <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg">
                            <input type="number" className="w-16 p-1 border rounded" value={cantidadEdit} onChange={e => setCantidadEdit(parseInt(e.target.value) || 1)} />
                            <span className="text-xs text-gray-500">x</span>
                            <input type="number" className="w-20 p-1 border rounded" value={precioEdit} onChange={e => setPrecioEdit(e.target.value)} />
                            <div className="flex-1 flex justify-end gap-2">
                              <button onClick={() => setItemEditando(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                              <button onClick={guardarEdicion} className="text-green-600 hover:text-green-800"><Check size={18}/></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-center">
                            {item.plantas?.imagen_url ? (
                              <img src={item.plantas.imagen_url} alt="Planta" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200"><ImageIcon size={20} /></div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex justify-between font-bold text-gray-800">
                                <span>{item.cantidad}x {item.plantas?.nombre}</span><span>S/ {(item.precio_vendido * item.cantidad).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-gray-400">(S/ {item.precio_vendido} c/u)</span>
                                <div className="flex gap-3">
                                  <button onClick={() => iniciarEdicion(item)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                  <button onClick={() => eliminarItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
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

              <div className="border-t border-b py-4 my-4">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">REGISTRAR ABONO</h3>
                <div className="flex gap-2 mb-3">
                  <input type="number" className="flex-1 rounded-lg border-gray-200 shadow-sm p-2 border focus:ring-green-500 outline-none" placeholder="Monto S/" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} />
                  <button onClick={registrarAbono} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Abonar</button>
                </div>
                {abonosCaja.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-2 bg-blue-50 p-3 rounded-lg">
                    {abonosCaja.map((abono, i) => (
                      <li key={i} className="flex justify-between border-b border-blue-100 pb-1 last:border-0 last:pb-0">
                        <span>Abono #{i + 1}</span><span className="text-blue-600 font-bold">- S/ {abono.monto.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="flex justify-between text-gray-500 mb-1 text-sm"><span>Subtotal:</span><span>S/ {totalCaja.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500 mb-3 text-sm"><span>Abonado:</span><span className="text-blue-500">- S/ {totalAbonado.toFixed(2)}</span></div>
                <div className={`flex justify-between font-black text-2xl p-4 rounded-xl ${saldoPendiente <= 0 && totalCaja > 0 ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>
                  <span>Saldo:</span><span>S/ {saldoPendiente.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={cerrarCaja} disabled={cargando} className="w-full mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl">Cerrar Caja y Finalizar</button>
            </>
          )}
        </div>
      </div>

      {/* MODAL PARA AÑADIR PRODUCTO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
              <h3 className="font-bold text-green-800 flex items-center gap-2"><Plus size={20} /> Añadir Producto</h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-red-500 bg-white rounded-full p-1"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Planta</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input type="text" className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none" placeholder="Ej. Monstera Deliciosa..." value={busquedaPlanta} onChange={(e) => { setBusquedaPlanta(e.target.value); setMostrarSugerencias(true); }} onFocus={() => setMostrarSugerencias(true)} onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)} />
                </div>
                
                {mostrarSugerencias && busquedaPlanta.trim() !== '' && plantasFiltradas.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl max-h-40 overflow-y-auto">
                    {plantasFiltradas.map(p => (
                      <li key={p.id} onClick={() => { setBusquedaPlanta(p.nombre); if (p.precio_menor && p.precio_menor > 0) setPrecioUnidad(p.precio_menor.toString()); setMostrarSugerencias(false); }} className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 flex justify-between items-center">
                        <span>{p.nombre}</span>
                        {p.precio_menor > 0 && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">S/ {p.precio_menor}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Precio Unitario</label>
                  <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500 font-bold">S/</span><input type="number" className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none" placeholder="0.00" value={precioUnidad} onChange={(e) => setPrecioUnidad(e.target.value)} /></div>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cant.</label>
                  <input type="number" min="1" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none text-center" value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value) || 1)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Foto (Opcional)</label>
                <div onClick={() => inputArchivoRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer overflow-hidden relative">
                  {previewFoto ? <img src={previewFoto} alt="Preview" className="h-32 object-contain rounded-lg" /> : <><ImageIcon size={28} className="mb-2" /><span className="text-xs text-center">Haz clic para subir o tomar foto</span></>}
                  <input type="file" accept="image/*" ref={inputArchivoRef} onChange={manejarSubidaFoto} className="hidden" />
                </div>
              </div>

              <button onClick={guardarProductoEnCaja} disabled={cargando} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md">
                {cargando ? 'Guardando...' : 'Añadir al carrito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}