'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, MessageCircle, MapPin, User, Timer, PackageCheck, Truck, X, Save, Trash2, Edit } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // ✅ ESTADOS PARA EL UBIGEO
  const [ubigeoData, setUbigeoData] = useState<any[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  const [listaProvincias, setListaProvincias] = useState<string[]>([]);
  const [listaDistritos, setListaDistritos] = useState<string[]>([]);

  // ESTADOS PARA EL MODAL DE EDICIÓN
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState({
    usuario_tiktok: '',
    nombre_completo: '',
    dni: '',
    celular: '',
    departamento: '',
    provincia: '',
    distrito: '',
    direccion: '',
    referencia: ''
  });

  useEffect(() => {
    cargarClientes();
    cargarUbigeoPeru(); // ✅ Cargamos el Ubigeo al iniciar
  }, []);

  // ✅ FUNCIÓN PARA CARGAR EL JSON DE UBIGEO (Misma que usas en Historial)
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

  const cargarClientes = async () => {
    setCargando(true);
    try {
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
        const clientesProcesados = data.map(cliente => {
          let estadoLogistico = 'sin_pedidos';
          
          if (cliente.cajas && cliente.cajas.length > 0) {
            const cajasOrdenadas = cliente.cajas.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const ultimoPedido = cajasOrdenadas[0];
            estadoLogistico = ultimoPedido.estado_envio || 'proceso';
          }

          return { ...cliente, estadoLogistico };
        });

        clientesProcesados.sort((a, b) => (a.usuario_tiktok || '').localeCompare(b.usuario_tiktok || ''));
        setClientes(clientesProcesados);
      }
    } catch (error: any) {
      alert("Error al cargar clientes: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  // FUNCIONES DEL MODAL
  const abrirModalCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setFormulario({
      usuario_tiktok: cliente.usuario_tiktok || '',
      nombre_completo: cliente.nombre_completo || '',
      dni: cliente.dni || '',
      celular: cliente.celular || '',
      departamento: cliente.departamento || '',
      provincia: cliente.provincia || '',
      distrito: cliente.distrito || '',
      direccion: cliente.direccion || '',
      referencia: cliente.referencia || ''
    });

    // ✅ Pre-cargar las listas de Provincias y Distritos si el cliente ya tiene datos guardados
    if (cliente.departamento && ubigeoData.length > 0) {
      setListaProvincias([...new Set(ubigeoData.filter((i: any) => i.departamento === cliente.departamento).map((i: any) => i.provincia))].sort() as string[]);
    } else {
      setListaProvincias([]);
    }
    
    if (cliente.departamento && cliente.provincia && ubigeoData.length > 0) {
      setListaDistritos([...new Set(ubigeoData.filter((i: any) => i.departamento === cliente.departamento && i.provincia === cliente.provincia).map((i: any) => i.distrito))].sort() as string[]);
    } else {
      setListaDistritos([]);
    }

    setModalAbierto(true);
  };

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value
    });
  };

  // ✅ FUNCIONES INTELIGENTES PARA ACTUALIZAR UBIGEO EN CASCADA
  const cambiarDepartamento = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dpto = e.target.value;
    setFormulario({ ...formulario, departamento: dpto, provincia: '', distrito: '' });
    if (dpto) {
      setListaProvincias([...new Set(ubigeoData.filter((i: any) => i.departamento === dpto).map((i: any) => i.provincia))].sort() as string[]);
    } else {
      setListaProvincias([]);
    }
    setListaDistritos([]);
  };

  const cambiarProvincia = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value;
    setFormulario({ ...formulario, provincia: prov, distrito: '' });
    if (prov) {
      setListaDistritos([...new Set(ubigeoData.filter((i: any) => i.departamento === formulario.departamento && i.provincia === prov).map((i: any) => i.distrito))].sort() as string[]);
    } else {
      setListaDistritos([]);
    }
  };

  const guardarCambios = async () => {
    if (!clienteSeleccionado) return;
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update(formulario)
        .eq('id', clienteSeleccionado.id);

      if (error) throw error;

      setClientes(clientes.map(c => 
        c.id === clienteSeleccionado.id ? { ...c, ...formulario } : c
      ));
      
      setModalAbierto(false);
    } catch (error: any) {
      alert("Error al actualizar cliente: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCliente = async () => {
    if (!clienteSeleccionado) return;
    
    const confirmar = window.confirm(`¿Estás seguro de eliminar permanentemente a @${clienteSeleccionado.usuario_tiktok}? \n\nNota: Si este cliente ya tiene pedidos registrados, el sistema no permitirá borrarlo por seguridad contable.`);
    if (!confirmar) return;

    setGuardando(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteSeleccionado.id);

      if (error) throw error;

      setClientes(clientes.filter(c => c.id !== clienteSeleccionado.id));
      setModalAbierto(false);
    } catch (error: any) {
      alert("No se pudo eliminar el cliente. Es probable que tenga cajas/pedidos asociados en el historial. Error técnico: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirWhatsApp = (e: React.MouseEvent, celular: string) => {
    e.stopPropagation(); 
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
    <div className="min-h-screen p-6 md:p-8 font-sans text-gray-800 relative">
      <header className="mb-8 relative z-10">
        <h1 className="text-3xl font-bold text-green-700"> Directorio de Clientes</h1>
        <p className="text-gray-500">Gestión de contactos y seguimiento de estado</p>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 relative z-10">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por @usuario, nombre, DNI o celular..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none transition-all text-sm font-medium" 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      {cargando ? (
        <div className="text-center text-gray-500 py-10 font-medium relative z-10">Cargando directorio...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {clientesFiltrados.map((cliente) => {
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
              <div 
                key={cliente.id} 
                onClick={() => abrirModalCliente(cliente)}
                className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border p-5 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:-translate-y-1 ${cliente.estadoLogistico === 'enviado' ? 'border-purple-200' : 'border-gray-100'}`}
              >
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-lg text-gray-800 truncate pr-2">@{cliente.usuario_tiktok}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 ${colorClases}`}>
                      <IconoEstado size={12}/> {textoEstado}
                    </span>
                  </div>
                  
                  {cliente.nombre_completo && (
                    <div className="text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2 truncate">
                      <User size={14} className="shrink-0"/> <span className="truncate">{cliente.nombre_completo}</span>
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
                  <div className="text-sm font-mono text-gray-600 font-semibold">
                    {cliente.celular ? cliente.celular : 'Sin celular'}
                  </div>
                  <button 
                    onClick={(e) => abrirWhatsApp(e, cliente.celular)}
                    disabled={!cliente.celular}
                    className={`p-2 rounded-xl transition-all flex items-center gap-2 ${cliente.celular ? 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                    title={cliente.celular ? 'Abrir WhatsApp' : 'No tiene celular registrado'}
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {!cargando && clientesFiltrados.length === 0 && (
        <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4 relative z-10">
          No se encontraron clientes con la búsqueda "{busqueda}".
        </div>
      )}

      {/* MODAL DE EDICIÓN DE CLIENTE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] flex flex-col">
            
            <div className="bg-blue-50/50 p-5 md:p-6 border-b border-blue-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-blue-800 flex items-center gap-2 text-lg">
                <Edit size={22} /> Editar Cliente
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-800 bg-white shadow-sm rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">Usuario TikTok</label>
                  <input type="text" name="usuario_tiktok" value={formulario.usuario_tiktok} onChange={manejarCambioInput} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-bold text-sm bg-gray-50" placeholder="@usuario" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                  <input type="text" name="nombre_completo" value={formulario.nombre_completo} onChange={manejarCambioInput} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-sm" placeholder="Ej. Juan Pérez" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">DNI</label>
                  <input type="text" name="dni" value={formulario.dni} onChange={manejarCambioInput} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-mono text-sm" placeholder="Documento de identidad" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">Celular / WhatsApp</label>
                  <input type="text" name="celular" value={formulario.celular} onChange={manejarCambioInput} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-mono text-sm" placeholder="Ej. 999888777" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={16} className="text-red-500"/> Datos de Envío</h4>
                
                {/* ✅ AQUÍ ESTÁN LOS NUEVOS SELECTORES INTELIGENTES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Departamento</label>
                    <select 
                      name="departamento" 
                      value={formulario.departamento} 
                      onChange={cambiarDepartamento} 
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="">Seleccione...</option>
                      {listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Provincia</label>
                    <select 
                      name="provincia" 
                      value={formulario.provincia} 
                      onChange={cambiarProvincia} 
                      disabled={!formulario.departamento}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-semibold text-gray-700 bg-white disabled:opacity-50"
                    >
                      <option value="">Seleccione...</option>
                      {listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Distrito</label>
                    <select 
                      name="distrito" 
                      value={formulario.distrito} 
                      onChange={(e) => setFormulario({...formulario, distrito: e.target.value})} 
                      disabled={!formulario.provincia}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm font-semibold text-gray-700 bg-white disabled:opacity-50"
                    >
                      <option value="">Seleccione...</option>
                      {listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dirección Exacta</label>
                    <input type="text" name="direccion" value={formulario.direccion} onChange={manejarCambioInput} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm" placeholder="Calle, Avenida, Mz, Lote..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Referencia</label>
                    <input type="text" name="referencia" value={formulario.referencia} onChange={manejarCambioInput} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm" placeholder="A la espalda de, cerca al parque..." />
                  </div>
                </div>
              </div>

            </div>

            <div className="p-5 md:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 rounded-b-[2rem]">
              <button 
                onClick={eliminarCliente}
                disabled={guardando}
                className="w-full sm:w-auto px-4 py-3 text-red-600 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18}/> Eliminar Cliente
              </button>
              
              <div className="flex w-full sm:w-auto gap-3">
                <button 
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={guardarCambios}
                  disabled={guardando}
                  className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <Save size={18}/> {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}