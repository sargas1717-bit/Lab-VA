/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MeshType, FilterType } from "../types";
import { Settings, ShoppingBag, Layers, Eye, ShieldAlert } from "lucide-react";

interface FiltersModuleProps {
  selectedMesh: MeshType;
  onChangeMesh: (mesh: MeshType) => void;
  selectedFilter: FilterType;
  onChangeFilter: (filter: FilterType) => void;
}

/**
 * Panel de Control del Módulo 1 (Ingeniería vs Producto).
 * Explica las mecánicas de renderizado y permite al usuario conmutar los meshes
 * y filtros mediante controles UI físicos directos para propósitos de auditoría fácil.
 */
export function FiltersModule({
  selectedMesh,
  onChangeMesh,
  selectedFilter,
  onChangeFilter,
}: FiltersModuleProps) {
  // Lista de meshes de ingeniería disponibles
  const meshes = [
    { id: "clasico" as MeshType, emoji: "🧬", label: "Clásico", desc: "Malla alámbrica facial estándar a 60 FPS" },
    { id: "biolum" as MeshType, emoji: "🦠", label: "Biolum", desc: "Esporas orgánicas y nodos con pulso cromático" },
    { id: "cyber" as MeshType, emoji: "🤖", label: "CyberMask", desc: "Placas complejas de escáner y ojos láser cian" },
    { id: "plexus" as MeshType, emoji: "💠", label: "Plexus Cyber", desc: "Red neuronal conectiva y temas de color dinámicos con halo" },
    { id: "fuego" as MeshType, emoji: "🔥", label: "Fuego", desc: "Magma fluyente, llamas ascendentes y ojos de lava de calor" },
    { id: "electrico" as MeshType, emoji: "⚡", label: "Electro", desc: "Red de alto voltaje con rayos y relámpagos fluorescentes" },
  ];

  // Lista de filtros comerciales de producto disponibles
  const filters = [
    { id: "lentes" as FilterType, emoji: "👓", label: "Lentes de Sol", desc: "Montura oscura de acetato con brillos de luz" },
    { id: "orejas" as FilterType, emoji: "🐰", label: "Conejo", desc: "Orejas animadas, nariz rosa y bigotes 3D" },
    { id: "sombrero" as FilterType, emoji: "🎩", label: "Sombrero Copa", desc: "Sombrero de mago elegante con cinta de satín" },
    { id: "rastro" as FilterType, emoji: "💫", label: "Rastro Luminoso", desc: "Rastro arcoíris 3D de alta intensidad y lluvia de destellos al moverte" },
    { id: "todo" as FilterType, emoji: "✨", label: "Todo Junto", desc: "Aplica de forma simultánea todos los filtros comerciales incluyendo el rastro" },
    { id: "limpiar" as FilterType, emoji: "❌", label: "Limpiar", desc: "Elimina todos los filtros cosméticos de la pantalla" },
  ];

  return (
    <div className="flex-grow flex flex-col justify-between gap-5 text-[#E0E0E0] animate-fade-in" id="filters-container">
      <div>
        {/* Cabecera del Módulo */}
        <div className="mb-4">
          <span className="text-[10px] font-mono tracking-wider text-[#10B981] bg-[#1C1C1E] px-2 py-0.5 rounded border border-[#2A2A2C]">
            MÓDULO DE PRUEBA_01
          </span>
          <h4 className="text-lg font-bold text-white uppercase mt-2.5">
            Ingeniería vs Producto
          </h4>
          <p className="text-xs text-[#A1A1AA] mt-1 pb-3 border-b border-[#2A2A2C] leading-relaxed">
            Compara la visualización de datos de ingeniería profunda contra la experiencia final de consumo del cliente en una misma interfaz dividida.
          </p>
        </div>

        {/* Sección 1: Ingeniería */}
        <div className="mb-5">
          <h5 className="text-[10px] font-mono text-[#636366] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-[#10B981]" />
            Lado Izquierdo: Ingeniería
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {meshes.map((m) => {
              const active = selectedMesh === m.id;
              return (
                <button
                  key={m.id}
                  id={`btn-mesh-${m.id}`}
                  onClick={() => onChangeMesh(m.id)}
                  type="button"
                  className={`p-2.5 text-left rounded-lg transition-all border text-xs flex flex-col gap-1 cursor-pointer ${
                    active
                      ? "bg-[#323235] border-[#10B981] text-white shadow-sm font-semibold"
                      : "bg-[#1C1C1E] border-[#2A2A2C] hover:border-[#3A3A3C] text-[#A1A1AA] hover:bg-[#151517] hover:text-white"
                  }`}
                >
                  <span className="text-base flex items-center gap-1">
                    {m.emoji}
                    <span className="text-xs font-bold">{m.label}</span>
                  </span>
                  <span className="text-[9px] text-[#636366] leading-normal block font-normal">
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sección 2: Comercial */}
        <div>
          <h5 className="text-[10px] font-mono text-[#636366] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-[#10B981]" />
            Lado Derecho: Comercial
          </h5>
          <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1">
            {filters.map((f) => {
              const active = selectedFilter === f.id;
              return (
                <button
                  key={f.id}
                  id={`btn-filter-${f.id}`}
                  onClick={() => onChangeFilter(f.id)}
                  type="button"
                  className={`p-2 px-3 text-left rounded-lg transition-all border text-xs flex items-center justify-between cursor-pointer ${
                    active
                      ? "bg-[#323235] border-[#10B981] text-white shadow-sm font-semibold"
                      : "bg-[#1C1C1E] border-[#2A2A2C] hover:border-[#3A3A3C] text-[#A1A1AA] hover:bg-[#151517] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{f.emoji}</span>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold">{f.label}</span>
                      <span className="text-[9px] text-[#636366] leading-tight font-normal">
                        {f.desc}
                      </span>
                    </div>
                  </div>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Consejo Interactivo */}
      <div className="p-3 bg-[#111112] border border-[#2A2A2C] rounded-lg flex gap-2 items-start shrink-0">
        <Eye className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
          <strong className="text-emerald-400 font-mono">[INTERACTION]</strong> Puedes apuntar el dedo índice al sensor oval en el visor para activarlo automáticamente.
        </p>
      </div>

      {/* Créditos del Creador */}
      <div className="mt-2 text-center text-[#636366]">
        <p className="text-[9px] uppercase tracking-wider font-mono">
          Creado por el Ingeniero <strong>Jose Gabriel Rojas</strong>
        </p>
        <p className="text-[8px] mt-1 leading-tight">
          Sistema asistido por tecnologías de Google para visión artificial
        </p>
      </div>
    </div>
  );
}
