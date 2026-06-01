/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles, Trophy, Clock, RotateCcw, Gamepad2 } from "lucide-react";

interface BubblesModuleProps {
  score: number;
  timeLeft: number;
  highScore: number;
  onResetGame: () => void;
  gameMode: "bubbles" | "plasma" | "lightning";
  onSelectGameMode: (mode: "bubbles" | "plasma" | "lightning") => void;
}

/**
 * Panel de Control del Módulo 3 (Juegos Sensoriales e Interacción Dual).
 * Muestra el panel de estadísticas, puntuación y temporizador del minijuego.
 * Permite reiniciar el temporizador a 30s y regenerar las burbujas virtuales o núcleos de plasma.
 */
export function BubblesModule({
  score,
  timeLeft,
  highScore,
  onResetGame,
  gameMode,
  onSelectGameMode,
}: BubblesModuleProps) {
  return (
    <div className="flex-grow flex flex-col justify-between gap-5 text-[#E0E0E0] animate-fade-in" id="bubbles-container">
      <div>
        {/* Cabecera del Módulo */}
        <div className="mb-4">
          <span className={`text-[10px] font-mono tracking-wider bg-[#1C1C1E] px-2 py-0.5 rounded border ${
            gameMode === "plasma" ? "text-[#06B6D4] border-[#06B6D4]/30" : 
            gameMode === "lightning" ? "text-[#EAB308] border-[#EAB308]/30" : "text-[#10B981] border-[#10B981]/20"
          }`}>
            MÓDULO DE PRUEBA_03
          </span>
          <h4 className="text-lg font-bold text-white uppercase mt-2.5">
            {gameMode === "bubbles" && "Burbujas Virtuales"}
            {gameMode === "plasma" && "Tormenta de Plasma"}
            {gameMode === "lightning" && "Pilas y Súper Rayos"}
          </h4>
          
          <p className="text-xs text-[#A1A1AA] mt-1.5 pb-3 border-b border-[#2A2A2C] leading-relaxed">
            {gameMode === "bubbles" && (
              <>
                Rastrea tu extremidad superior. Posiciona y mueve la punta de tu dedo índice (<strong className="text-[#10B981]">Punto 8</strong>) sobre la pantalla para colisionar y reventar burbujas.
              </>
            )}
            {gameMode === "plasma" && (
              <>
                ¡Suma ambas manos! Un potente arco de plasma conectará tus dedos índices. Explota esferas con tus dedos o <strong className="text-[#06B6D4]">corta los núcleos con el rayo dual</strong> para ganar <span className="text-[#06B6D4] font-bold">¡PUNTOS DOBLES (⚡x2)!</span>
              </>
            )}
            {gameMode === "lightning" && (
              <>
                Mueve tus manos <strong className="text-[#EAB308]">rápidamente</strong> para invocar descargas eléctricas de relámpago con sonido. ¡Atrapa las pilas cayendo para completar tu energía y ganar con la <strong>cyberMáscara</strong>!
              </>
            )}
          </p>
        </div>

        {/* Selector de Modo de Juego */}
        <div className="flex gap-1.5 p-1 bg-[#141416] border border-[#2A2A2C] rounded-lg mb-4">
          <button
            type="button"
            onClick={() => onSelectGameMode("bubbles")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded transition-all duration-200 cursor-pointer ${gameMode === "bubbles" ? "bg-[#10B981] text-black shadow-lg" : "text-[#A1A1AA] hover:text-white"}`}
          >
            Burbujas
          </button>
          <button
            type="button"
            onClick={() => onSelectGameMode("plasma")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded transition-all duration-200 cursor-pointer ${gameMode === "plasma" ? "bg-[#06B6D4] text-black shadow-lg" : "text-[#A1A1AA] hover:text-white"}`}
          >
            Plasma
          </button>
          <button
            type="button"
            onClick={() => onSelectGameMode("lightning")}
            className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded transition-all duration-200 cursor-pointer ${gameMode === "lightning" ? "bg-[#EAB308] text-black shadow-lg" : "text-[#A1A1AA] hover:text-white"}`}
          >
            Súper Pilas
          </button>
        </div>

        {/* Marcadores de Estadísticas en Bento Cards */}
        <div className="grid grid-cols-2 gap-3" id="scores-widgets-bento">
          {/* Puntuación */}
          <div className="p-3 bg-[#1C1C1E] rounded-lg border border-[#2A2A2C] text-center flex flex-col justify-center items-center shadow-sm">
            <Gamepad2 className={`w-4 h-4 mb-1 ${
              gameMode === "plasma" ? "text-[#06B6D4]" : 
              gameMode === "lightning" ? "text-[#EAB308]" : "text-[#10B981]"
            }`} />
            <span className="text-[9px] text-[#636366] block uppercase font-bold tracking-widest font-mono">
              {gameMode === "lightning" ? "PILAS" : "BURBUJAS"}
            </span>
            <span className={`text-2xl font-bold font-mono mt-0.5 transition-all ${
              gameMode === "plasma" ? "text-[#06B6D4]" : 
              gameMode === "lightning" ? "text-[#EAB308]" : "text-[#10B981]"
            }`}>
              {score}
            </span>
          </div>

          {/* Tiempo restante */}
          <div className="p-3 bg-[#1C1C1E] rounded-lg border border-[#2A2A2C] text-center flex flex-col justify-center items-center shadow-sm">
            <Clock className={`w-4 h-4 mb-1 ${timeLeft <= 5 ? "text-red-500 animate-pulse" : (
              gameMode === "plasma" ? "text-[#06B6D4]" : 
              gameMode === "lightning" ? "text-[#EAB308]" : "text-[#10B981]"
            )}`} />
            <span className="text-[9px] text-[#636366] block uppercase font-bold tracking-widest font-mono">
              TIEMPO
            </span>
            <span className={`text-2xl font-bold font-mono mt-0.5 ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Récord Máximo Histórico */}
        <div className="p-3 bg-[#1C1C1E] rounded-lg border border-[#2A2A2C] text-center mt-3 flex items-center justify-center gap-2">
          <Trophy className={`w-4 h-4 shrink-0 colSpan-2 ${
            gameMode === "plasma" ? "text-[#06B6D4]" : 
            gameMode === "lightning" ? "text-[#EAB308]" : "text-[#10B981]"
          }`} />
          <span className="text-xs text-[#A1A1AA]">
            Récord Máximo:
            <strong className="text-white ml-1.5 font-bold font-mono">{highScore}</strong>
          </span>
        </div>

        {/* Explicación de puntos clave */}
        <div className="mt-4 p-3.5 bg-[#111112] border border-[#2A2A2C] rounded-lg flex gap-2.5 items-start">
          <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${
            gameMode === "plasma" ? "text-[#06B6D4]" : 
            gameMode === "lightning" ? "text-[#EAB308]" : "text-[#10B981]"
          }`} />
          <div className="text-[10px] text-[#A1A1AA] leading-normal animate-fade-in">
            {gameMode === "bubbles" && (
              <>
                <h6 className="font-bold text-white mb-0.5 uppercase tracking-wide font-mono text-[9px]">Punto 8 del Sensor</h6>
                La inteligencia artificial de MediaPipe detecta de forma automática los 21 puntos óseos de tu mano. El cursor está exclusivamente anclado al extremo final de tu dedo índice.
              </>
            )}
            {gameMode === "plasma" && (
              <>
                <h6 className="font-bold text-[#06B6D4] mb-0.5 uppercase tracking-wide font-mono text-[9px]">Interferencia de Plasma Dual</h6>
                El motor geométrico biométrico rastrea ambas manos secuencialmente en paralelo. El haz electromagnético interceptará y detona los núcleos con un multiplicador espacial.
              </>
            )}
            {gameMode === "lightning" && (
              <>
                <h6 className="font-bold text-[#EAB308] mb-0.5 uppercase tracking-wide font-mono text-[9px]">SOBRECARGA VOLTAICA</h6>
                ¡Establece campos eléctricos acelerados! Mover rápido tus manos genera destellos con sonido procedimental. Carga pilas para activar la cyberMáscara con ojos de tormenta eléctrica.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Botón de reinicio */}
      <div>
        <button
          onClick={onResetGame}
          type="button"
          id="btn-restart-game"
          className={`w-full text-black font-extrabold py-2.5 px-3 rounded-lg text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
            gameMode === "plasma" ? "bg-[#06B6D4] hover:bg-[#0891b2]" : 
            gameMode === "lightning" ? "bg-[#EAB308] hover:bg-[#ca8a04]" : "bg-[#10B981] hover:bg-[#059669]"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-black" />
          REINICIAR TEMPORIZADOR
        </button>
      </div>
    </div>
  );
}
