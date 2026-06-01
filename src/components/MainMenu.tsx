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
    <div id="view-menu" className="w-full min-h-full flex flex-col items-center justify-start md:justify-center py-8 px-6 overflow-y-auto max-w-6xl mx-auto animate-fade-in">
      
      {/* Sección Hero / Encabezado */}
      <div className="text-center mb-12 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight leading-tight text-white">
          Simbiosis de <span className="text-[#10B981] font-mono tracking-wide">[IA ESPACIAL]</span>
        </h2>
        <p className="text-[#A1A1AA] text-xs md:text-sm leading-relaxed font-sans">
          Interactúa en tiempo real con tu cuerpo a través de computer vision local y segura. 
          Elige uno de nuestros módulos interactivos para comenzar las pruebas biométricas de alta precisión.
        </p>
      </div>

      {/* Grilla Bento / Secciones del Laboratorio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        
        {/* Tarjeta de Módulo 1: Ingeniería vs Producto (Filtros) */}
        <div 
          className="glass-card rounded-xl p-6 flex flex-col cursor-pointer group hover:border-[#10B981]/50"
          id="card-module-filters"
          onClick={() => onStartModule("FILTERS")}
        >
          <div className="p-3 bg-[#111112] text-[#10B981] border border-[#2A2A2C] rounded-lg w-fit mb-5 transition-transform group-hover:scale-105">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 group-hover:text-[#10B981] transition-colors">
            Ingeniería vs Producto
          </h3>
          <p className="text-[#636366] text-xs leading-relaxed mb-6 flex-grow">
            Divide inteligentemente la pantalla en dos. A la izquierda observarás la malla matemática cruda de ingeniería en tiempo real y a la derecha filtros de distribución comercial.
          </p>
          <button 
            type="button"
            className="w-full bg-[#323235] hover:bg-[#10B981] hover:text-black text-white py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm border border-[#2A2A2C] hover:border-[#10B981]"
          >
            Abrir Demostración
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Tarjeta de Módulo 2: Lector de Emociones (Biometría Calibrable) */}
        <div 
          className="glass-card rounded-xl p-6 flex flex-col cursor-pointer group hover:border-[#10B981]/50"
          id="card-module-emotions"
          onClick={() => onStartModule("EMOTIONS")}
        >
          <div className="p-3 bg-[#111112] text-[#10B981] border border-[#2A2A2C] rounded-lg w-fit mb-5 transition-transform group-hover:scale-105">
            <Smile className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 group-hover:text-[#10B981] transition-colors">
            Lector de Emociones
          </h3>
          <p className="text-[#636366] text-xs leading-relaxed mb-6 flex-grow">
            Analizador biométrico calibrable mediante variables de distancia. Mide curvatura labial, apertura, fruncido e interpolación ocular con opción de captura e historial de coordenadas 3D.
          </p>
          <button 
            type="button"
            className="w-full bg-[#323235] hover:bg-[#10B981] hover:text-black text-white py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm border border-[#2A2A2C] hover:border-[#10B981]"
          >
            Iniciar Escáner
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Tarjeta de Módulo 3: Juego de Burbujas interactivo */}
        <div 
          className="glass-card rounded-xl p-6 flex flex-col cursor-pointer group hover:border-[#10B981]/50"
          id="card-module-bubbles"
          onClick={() => onStartModule("BUBBLES")}
        >
          <div className="p-3 bg-[#111112] text-[#10B981] border border-[#2A2A2C] rounded-lg w-fit mb-5 transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 group-hover:text-[#10B981] transition-colors">
            Puntero y Burbujas
          </h3>
          <p className="text-[#636366] text-xs leading-relaxed mb-6 flex-grow">
            Ubica y rastrea el Punto de Articulación 8 (punta del índice) para controlar un cursor virtual y reventar burbujas físicas con simulador de colisiones y tabla de posiciones local.
          </p>
          <button 
            type="button"
            className="w-full bg-[#323235] hover:bg-[#10B981] hover:text-black text-white py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm border border-[#2A2A2C] hover:border-[#10B981]"
          >
            Jugar Ahora
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

      </div>

      {/* Nota de Auditoría de Sistemas al Pie */}
      <div className="mt-16 text-[9px] text-[#636366] tracking-widest uppercase font-mono max-w-md text-center">
        ENLACE SECURE • TODOS LOS BIOPUNTOS SE PROCESAN LOCALMENTE EN SU DISPOSITIVO
      </div>
    </div>
  );
}
