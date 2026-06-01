/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cpu, Layers, Smile, Sparkles, ArrowRight } from "lucide-react";
import { ModuleType } from "../types";

interface MainMenuProps {
  onStartModule: (module: ModuleType) => void;
}

/**
 * Vista de Menú Principal (Pantalla 1).
 * Presenta una grilla bento de tarjetas de vidrio (glassmorphism) con un diseño tecnológico pulido,
 * propicio para auditorías de portafolio o expansiones con nuevos experimentos de IA espacial.
 */
export function MainMenu({ onStartModule }: MainMenuProps) {
  return (
    <div id="view-menu" className="w-full min-h-full flex flex-col items-center justify-start md:justify-center py-8 px-6 overflow-y-auto mx-auto animate-fade-in relative">
      
      {/* Fondo Decorativo Cyberpunk (Grid y Líneas) */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
        backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }}></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[#10B981]/5 to-transparent opacity-30 animate-pulse"></div>

      {/* Sección Hero / Encabezado */}
      <div className="text-center mb-16 max-w-2xl relative z-10">
        <div className="inline-block mb-4 border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1 rounded-full">
          <span className="text-[#10B981] font-mono text-[10px] tracking-[0.2em] uppercase">
            Sistema Inicializado v2.4.0
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-white uppercase drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          Simbiosis de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#06b6d4]">IA Espacial</span>
        </h2>
        <p className="text-[#A1A1AA] text-xs md:text-sm leading-relaxed font-mono tracking-wide">
          &gt; Interactúa en tiempo real con tu cuerpo a través de computer vision local y segura.<br/>
          &gt; Selecciona un módulo de procesamiento para comenzar.
        </p>
      </div>

      {/* Grilla Bento / Secciones del Laboratorio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl relative z-10">
        
        {/* Módulo 1 */}
        <div className="relative group">
          {/* Decoración Esquinas Sci-Fi */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#10B981] to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-xl blur"></div>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#10B981] opacity-50 group-hover:opacity-100 transition-opacity z-20 rounded-tl-lg"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#10B981] opacity-50 group-hover:opacity-100 transition-opacity z-20 rounded-br-lg"></div>
          
          <div 
            className="glass-card relative h-full rounded-xl p-7 flex flex-col cursor-pointer border border-[#2A2A2C] bg-[#0A0A0B]/80 hover:bg-[#111112]/90 transition-all z-10"
            onClick={() => onStartModule("FILTERS")}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded-lg transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[#10B981]/50 font-mono text-[10px] tracking-widest">MOD_01</span>
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-widest mb-3 group-hover:text-[#10B981] transition-colors drop-shadow-md">
              Ingeniería vs Producto
            </h3>
            <p className="text-[#A1A1AA] text-xs font-mono leading-relaxed mb-8 flex-grow">
              Comparativa de malla matemática cruda vs filtros comerciales. Soporta Plexus, CyberMask y Fuego Dinámico.
            </p>
            <button type="button" className="w-full bg-transparent border border-[#2A2A2C] group-hover:border-[#10B981] text-[#A1A1AA] group-hover:text-[#10B981] py-2.5 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-2">
              Ejecutar <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Módulo 2 */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-xl blur"></div>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-purple-500 opacity-50 group-hover:opacity-100 transition-opacity z-20 rounded-tl-lg"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-500 opacity-50 group-hover:opacity-100 transition-opacity z-20 rounded-br-lg"></div>
          
          <div 
            className="glass-card relative h-full rounded-xl p-7 flex flex-col cursor-pointer border border-[#2A2A2C] bg-[#0A0A0B]/80 hover:bg-[#111112]/90 transition-all z-10"
            onClick={() => onStartModule("EMOTIONS")}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Smile className="w-6 h-6" />
              </div>
              <span className="text-purple-500/50 font-mono text-[10px] tracking-widest">MOD_02</span>
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-widest mb-3 group-hover:text-purple-400 transition-colors drop-shadow-md">
              Lector Biométrico
            </h3>
            <p className="text-[#A1A1AA] text-xs font-mono leading-relaxed mb-8 flex-grow">
              Análisis micro-facial en tiempo real. Calcula aperturas, curvaturas labiales y evalúa tu porcentaje de asombro o alegría.
            </p>
            <button type="button" className="w-full bg-transparent border border-[#2A2A2C] group-hover:border-purple-500 text-[#A1A1AA] group-hover:text-purple-400 py-2.5 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-2">
              Escanear <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Módulo 3 */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-xl blur"></div>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-500 opacity-50 group-hover:opacity-100 transition-opacity z-20 rounded-tl-lg"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-500 opacity-50 group-hover:opacity-100 transition-opacity z-20 rounded-br-lg"></div>
          
          <div 
            className="glass-card relative h-full rounded-xl p-7 flex flex-col cursor-pointer border border-[#2A2A2C] bg-[#0A0A0B]/80 hover:bg-[#111112]/90 transition-all z-10"
            onClick={() => onStartModule("BUBBLES")}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-blue-500/50 font-mono text-[10px] tracking-widest">MOD_03</span>
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-widest mb-3 group-hover:text-blue-400 transition-colors drop-shadow-md">
              Hand Tracking
            </h3>
            <p className="text-[#A1A1AA] text-xs font-mono leading-relaxed mb-8 flex-grow">
              Rastreo de manos de latencia ultra-baja. Explota esferas con tu dedo índice y desafía tus tiempos de reacción.
            </p>
            <button type="button" className="w-full bg-transparent border border-[#2A2A2C] group-hover:border-blue-500 text-[#A1A1AA] group-hover:text-blue-400 py-2.5 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-2">
              Iniciar Test <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

      </div>

      {/* Footer y Créditos */}
      <div className="mt-16 text-center relative z-10 w-full">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#2A2A2C] to-transparent mb-6"></div>
        <p className="text-[#10B981] font-mono text-[10px] tracking-[0.2em] uppercase mb-2">
          Creado por el Ingeniero <strong className="text-white">Jose Gabriel Rojas</strong>
        </p>
        <p className="text-[9px] text-[#636366] tracking-widest uppercase font-mono max-w-md mx-auto mb-1">
          ENLACE SECURE • PROCESAMIENTO LOCAL NEURAL ON-DEVICE
        </p>
        <p className="text-[8px] text-[#636366] tracking-wider uppercase font-mono">
          Sistema asistido por tecnologías de Google para visión artificial
        </p>
      </div>
    </div>
  );
}
