import { useState } from 'react';
import { motion } from 'framer-motion';
import { autores, temas, instituciones } from '@/data/mockData';
import { Users, BookOpen, Building2, Settings, Save, Plus, Trash2, Pencil } from 'lucide-react';

type ConfigTab = 'general' | 'autores' | 'temas' | 'instituciones';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('general');
  const [temporalWindow, setTemporalWindow] = useState({ min: 2, max: 24, pesoOptimo: 1.0, pesoTardio: 0.6, pesoRapido: 0.2 });

  const tabs = [
    { id: 'general' as ConfigTab, label: 'General', icon: Settings },
    { id: 'autores' as ConfigTab, label: 'Autores', icon: Users },
    { id: 'temas' as ConfigTab, label: 'Temas', icon: BookOpen },
    { id: 'instituciones' as ConfigTab, label: 'Instituciones', icon: Building2 },
  ];

  return (
    <div className="pt-16 min-h-screen" style={{ background: '#F7F7F5' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-[40px] leading-[48px] tracking-[-0.4px] text-[#1A1D23]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Configuración
          </h1>
          <p className="text-[14px] text-[#5C6370] mt-1">
            Gestión de fuentes de datos, parámetros del sistema y catálogos
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left text-[14px] font-medium transition-colors border-b border-[#F0F1F4] last:border-0 ${
                    activeTab === tab.id ? 'bg-[#2E4A62]/5 text-[#2E4A62]' : 'text-[#5C6370] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* General Settings */}
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Parámetros III */}
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <h3 className="text-[18px] font-medium text-[#1A1D23] mb-1">Parámetros del III</h3>
                  <p className="text-[13px] text-[#5C6370] mb-6">Configuración de la ponderación temporal del Índice de Impacto de Ideas</p>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-2 block">
                          Ventana Mínima (meses)
                        </label>
                        <input
                          type="number"
                          value={temporalWindow.min}
                          onChange={e => setTemporalWindow({ ...temporalWindow, min: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#1A1D23] focus:outline-none focus:ring-2 focus:ring-[#2E4A62]/20 focus:border-[#2E4A62]"
                        />
                        <p className="text-[12px] text-[#5C6370] mt-1">Menos de esto = impacto rápido</p>
                      </div>
                      <div>
                        <label className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-2 block">
                          Ventana Óptima Máx (meses)
                        </label>
                        <input
                          type="number"
                          value={temporalWindow.max}
                          onChange={e => setTemporalWindow({ ...temporalWindow, max: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#1A1D23] focus:outline-none focus:ring-2 focus:ring-[#2E4A62]/20 focus:border-[#2E4A62]"
                        />
                        <p className="text-[12px] text-[#5C6370] mt-1">Más de esto = impacto tardío</p>
                      </div>
                      <div>
                        <label className="text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] mb-2 block">
                          Peso Óptimo
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={temporalWindow.pesoOptimo}
                          onChange={e => setTemporalWindow({ ...temporalWindow, pesoOptimo: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[14px] text-[#1A1D23] focus:outline-none focus:ring-2 focus:ring-[#2E4A62]/20 focus:border-[#2E4A62]"
                        />
                        <p className="text-[12px] text-[#5C6370] mt-1">Factor multiplicador óptimo</p>
                      </div>
                    </div>

                    <div className="bg-[#FAFAF8] rounded-lg p-4 border border-[#F0F1F4]">
                      <p className="text-[13px] font-medium text-[#1A1D23] mb-2">Lógica actual:</p>
                      <ul className="space-y-1.5 text-[13px] text-[#5C6370]">
                        <li>• Menos de {temporalWindow.min} meses → peso {temporalWindow.pesoRapido} (demasiado rápido)</li>
                        <li>• {temporalWindow.min} a {temporalWindow.max} meses → peso {temporalWindow.pesoOptimo} (ventana óptima)</li>
                        <li>• Más de {temporalWindow.max} meses → peso {temporalWindow.pesoTardio} (impacto tardío)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[#2E4A62] text-white rounded-lg text-[14px] font-medium hover:bg-[#243a4e] transition-colors">
                      <Save className="w-4 h-4" /> Guardar Cambios
                    </button>
                  </div>
                </div>

                {/* Fuentes de Datos */}
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <h3 className="text-[18px] font-medium text-[#1A1D23] mb-1">Fuentes de Datos</h3>
                  <p className="text-[13px] text-[#5C6370] mb-6">Habilitar o deshabilitar fuentes de ingesta de datos</p>

                  <div className="space-y-3">
                    {[
                      { name: 'Asamblea Legislativa', desc: 'Actas, expedientes y transcripciones', active: true },
                      { name: 'La Gaceta Digital', desc: 'Decretos, leyes y decretos ejecutivos', active: true },
                      { name: 'Medios Digitales', desc: 'RSS de periódicos y sitios de noticias', active: true },
                      { name: 'Redes Sociales', desc: 'Menciones en Twitter y Facebook', active: false },
                      { name: 'YouTube', desc: 'Transcripciones de canales de noticias', active: false },
                    ].map((source, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-[#F0F1F4] last:border-0">
                        <div>
                          <p className="text-[14px] font-medium text-[#1A1D23]">{source.name}</p>
                          <p className="text-[12px] text-[#5C6370]">{source.desc}</p>
                        </div>
                        <button
                          className={`relative w-11 h-6 rounded-full transition-colors ${source.active ? 'bg-[#1E7A5F]' : 'bg-[#E5E7EB]'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${source.active ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Autores */}
            {activeTab === 'autores' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-medium text-[#1A1D23]">Autores ({autores.length})</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#2E4A62] text-white rounded-lg text-[13px] font-medium hover:bg-[#243a4e] transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E5E7EB]">
                          <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Nombre</th>
                          <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Tipo</th>
                          <th className="text-right text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {autores.map((autor, i) => (
                          <tr key={autor.id} className={`border-b border-[#F0F1F4] hover:bg-[#F5F5F3] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}>
                            <td className="py-3 pr-4 text-[14px] text-[#1A1D23]">{autor.nombre}</td>
                            <td className="py-3 pr-4">
                              <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-[#2E4A62]/10 text-[#2E4A62]">
                                {autor.tipo}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[#F0F1F4] text-[#5C6370]">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[#F0F1F4] text-[#C4523A]">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Temas */}
            {activeTab === 'temas' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-medium text-[#1A1D23]">Temas de Investigación ({temas.length})</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#2E4A62] text-white rounded-lg text-[13px] font-medium hover:bg-[#243a4e] transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {temas.map(tema => (
                      <div key={tema.id} className="flex items-center justify-between py-3 px-4 bg-[#FAFAF8] rounded-lg border border-[#F0F1F4]">
                        <div>
                          <p className="text-[14px] font-medium text-[#1A1D23]">{tema.nombre}</p>
                          <p className="text-[12px] text-[#5C6370]">{tema.descripcion}</p>
                        </div>
                        <div className="flex gap-1">
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-[#5C6370]">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-[#C4523A]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Instituciones */}
            {activeTab === 'instituciones' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-medium text-[#1A1D23]">Instituciones ({instituciones.length})</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#2E4A62] text-white rounded-lg text-[13px] font-medium hover:bg-[#243a4e] transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E5E7EB]">
                          <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Nombre</th>
                          <th className="text-left text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3 pr-4">Sector</th>
                          <th className="text-right text-[12px] font-medium uppercase tracking-[0.12px] text-[#9BA3B0] pb-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instituciones.map((inst, i) => (
                          <tr key={inst.id} className={`border-b border-[#F0F1F4] hover:bg-[#F5F5F3] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}>
                            <td className="py-3 pr-4 text-[14px] text-[#1A1D23]">{inst.nombre}</td>
                            <td className="py-3 pr-4">
                              <span className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-[#3A8B8C]/10 text-[#3A8B8C]">
                                {inst.sector}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[#F0F1F4] text-[#5C6370]">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[#F0F1F4] text-[#C4523A]">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
