'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, Edit, X, Save, Trash2, User } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estados para la Base de Datos del Perú (UBIGEO)
  const [ubigeoData, setUbigeoData] = useState<any[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  const [listaProvincias, setListaProvincias] = useState<string[]>([]);
  const [listaDistritos, setListaDistritos] = useState<string[]>([]);

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const [datosFormulario, setDatosFormulario] = useState({
    nombre_completo: '', dni: '', direccion: '', departamento: '', provincia: '', distrito: ''
  });

  useEffect(() => {
    cargarClientes();
    cargarUbigeoPeru();
  }, []);

  const cargarClientes = async () => {
    setCargando(true);
    const { data } = await supabase.from('clientes').select('*').order('usuario_tiktok', { ascending: true });
    if (data) setClientes(data);
    setCargando(false);
  };

  const cargarUbigeoPeru = async () => {
    try {
      const res = await fetch('https://raw.githubusercontent.com/jmcastagnetto/ubigeo-peru-aumentado/main/ubigeo_distrito.json');
      const data = await res.json();
      setUbigeoData(data);
      const depts = [...new Set(data.map((item: any) => item.departamento))].sort() as string[];
      setListaDepartamentos(depts);
    } catch (error) {
      console.error("Error al cargar Ubigeo", error);
    }
  };

  const abrirModal = (cliente: any) => {
    setClienteEditando(cliente);
    setDatosFormulario({
      nombre_completo: cliente.nombre_completo || '',
      dni: cliente.dni || '',
      direccion: cliente.direccion || '',
      departamento: cliente.departamento || '',
      provincia: cliente.provincia || '',
      distrito: cliente.distrito || ''
    });

    if (cliente.departamento) {
      setListaProvincias([...new Set(ubigeoData.filter((i: any) => i.departamento === cliente.departamento).map((i: any) => i.provincia))].sort() as string[]);
    } else {
      setListaProvincias([]);
    }
    
    if (cliente.departamento && cliente.provincia) {
      setListaDistritos([...new Set(ubigeoData.filter((i: any) => i.departamento === cliente.departamento && i.provincia === cliente.provincia).map((i: any) => i.distrito))].sort() as string[]);
    } else {
      setListaDistritos([]);
    }

    setModalAbierto(true);
  };

  const guardarDatosEnvio = async () => {
    setCargando(true);
    const { error } = await supabase.from('clientes').update(datosFormulario).eq('id', clienteEditando.id);

    if (!error) {
      setClientes(clientes.map(c => c.id === clienteEditando.id ? { ...c, ...datosFormulario } : c));
      setModalAbierto(false);
    } else {
      alert("Error al guardar: " + error.message);
    }
    setCargando(false);
  };

  const eliminarCliente = async (idCliente: string, usuario: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente al cliente @${usuario}?`)) return;
    
    setCargando(true);
    const { error } = await supabase.from('clientes').delete().eq('id', idCliente);
    
    if (error) {
      alert("⚠️ No puedes eliminar a este cliente porque ya tiene pedidos registrados. Por seguridad contable, primero debes eliminar sus pedidos en el Historial.");
    } else {
      setClientes(clientes.filter(c => c.id !== idCliente));
    }
    setCargando(false);
  };

  const clientesFiltrados = clientes.filter(c => {
    const termino = busqueda.toLowerCase();
    return (
      (c.usuario_tiktok?.toLowerCase() || '').includes(termino) ||
      (c.nombre_completo?.toLowerCase() || '').includes(termino) ||
      (c.dni?.toLowerCase() || '').includes(termino) ||
      (c.departamento?.toLowerCase() || '').includes(termino) ||
      (c.provincia?.toLowerCase() || '').includes(termino) ||
      (c.distrito?.toLowerCase() || '').includes(termino)
    );
  });

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans text-gray-800">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">📦 Directorio de Clientes</h1>
        <p className="text-gray-500">Gestión de datos de envío y facturación</p>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="relative w-full max-w-3xl">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por @usuario, nombre, DNI o ubicación (Ej. Cusco)..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all bg-gray-50/50 text-sm" 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clientesFiltrados.map((cliente) => (
          <div key={cliente.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden">
            
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
              <button onClick={() => abrirModal(cliente)} className="text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar Datos">
                <Edit size={18} />
              </button>
              <button onClick={() => eliminarCliente(cliente.id, cliente.usuario_tiktok)} className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Eliminar Cliente">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 text-green-700 p-2 rounded-full">
                <User size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">@{cliente.usuario_tiktok}</h2>
            </div>

            {cliente.nombre_completo ? (
              <div className="ml-11">
                <p className="text-sm font-semibold text-gray-700">{cliente.nombre_completo}</p>
                <p className="text-xs text-gray-500">DNI: {cliente.dni || 'No registrado'}</p>
              </div>
            ) : (
              <p className="text-sm italic text-gray-400 ml-11">Sin datos personales registrados</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-50 flex items-start gap-3">
              <MapPin size={18} className="text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm text-gray-600 flex-1">
                {cliente.departamento || cliente.provincia || cliente.distrito ? (
                  <>
                    {/* ORDEN INVERTIDO: UBIGEO COMO TEXTO PRINCIPAL */}
                    <p className="font-medium text-gray-800">
                      {[cliente.distrito, cliente.provincia, cliente.departamento].filter(Boolean).join(', ')}
                    </p>
                    
                    {/* DIRECCIÓN COMO REFERENCIA OPCIONAL */}
                    {cliente.direccion && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Ref: {cliente.direccion}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-orange-600 text-xs font-semibold bg-orange-50 border border-orange-100 px-2 py-1 rounded">Faltan datos de envío</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {clientesFiltrados.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-20" />
            <p>No se encontraron clientes con esos datos.</p>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN CON MENÚS DESPLEGABLES */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
              <h3 className="font-bold text-green-800 flex items-center gap-2"><MapPin size={20}/> Envío a @{clienteEditando?.usuario_tiktok}</h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-red-500 bg-white rounded-full p-1"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nombre Completo</label>
                  <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" value={datosFormulario.nombre_completo} onChange={(e) => setDatosFormulario({...datosFormulario, nombre_completo: e.target.value})} />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">DNI (8 dígitos)</label>
                  <input 
                    type="text" 
                    maxLength={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-mono" 
                    value={datosFormulario.dni} 
                    onChange={(e) => {
                      const soloNumeros = e.target.value.replace(/\D/g, ''); 
                      setDatosFormulario({...datosFormulario, dni: soloNumeros});
                    }} 
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Departamento</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 bg-gray-50/50"
                    value={datosFormulario.departamento}
                    onChange={(e) => {
                      const dpto = e.target.value;
                      setDatosFormulario({...datosFormulario, departamento: dpto, provincia: '', distrito: ''});
                      setListaProvincias([...new Set(ubigeoData.filter((i: any) => i.departamento === dpto).map((i: any) => i.provincia))].sort() as string[]);
                      setListaDistritos([]);
                    }}
                  >
                    <option value="">Seleccione Departamento...</option>
                    {listaDepartamentos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Provincia</label>
                  <select 
                    disabled={!datosFormulario.departamento}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 bg-gray-50/50"
                    value={datosFormulario.provincia}
                    onChange={(e) => {
                      const prov = e.target.value;
                      setDatosFormulario({...datosFormulario, provincia: prov, distrito: ''});
                      setListaDistritos([...new Set(ubigeoData.filter((i: any) => i.departamento === datosFormulario.departamento && i.provincia === prov).map((i: any) => i.distrito))].sort() as string[]);
                    }}
                  >
                    <option value="">Seleccione...</option>
                    {listaProvincias.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Distrito</label>
                  <select 
                    disabled={!datosFormulario.provincia}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 bg-gray-50/50"
                    value={datosFormulario.distrito}
                    onChange={(e) => setDatosFormulario({...datosFormulario, distrito: e.target.value})}
                  >
                    <option value="">Seleccione...</option>
                    {listaDistritos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Dirección Exacta <span className="text-gray-400 font-normal">(Opcional)</span></label>
                  <input type="text" placeholder="Ej. Av. Los Pinos 123, Mz B Lote 4..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" value={datosFormulario.direccion} onChange={(e) => setDatosFormulario({...datosFormulario, direccion: e.target.value})} />
                </div>
              </div>
              
              <button onClick={guardarDatosEnvio} disabled={cargando} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-green-500/20 transition-all">
                <Save size={20} /> {cargando ? 'Guardando...' : 'Guardar Información de Envío'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}