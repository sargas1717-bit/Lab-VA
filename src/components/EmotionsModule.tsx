/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { SavedEmotion, EmotionMetrics } from "../types";
import { Sliders, Camera, Minimize2, Trash2, ChevronDown, ChevronUp, BarChart2, CornerDownRight } from "lucide-react";
import { playSuccessSound } from "../utils/audio";

interface EmotionsModuleProps {
  currentEmotion: string;
  currentEmoji: string;
  metrics: any; // Distancias biométricas actuales calculated on canvas
  savedEmotions: SavedEmotion[];
  onSaveCurrentSample: (forcedEmotion?: string) => void;
  onDeleteSample: (id: number) => void;
  onToggleSampleCoordsValue: (id: number) => void;
  onTriggerAutoCalibrate: (id: number, emotionType: string) => void;
  isTemplateMatched?: boolean;

  // Parámetros de sintonización de sliders
  sliderSmile: number;
  setSliderSmile: (val: number) => void;
  sliderSurprise: number;
  setSliderSurprise: (val: number) => void;
  sliderSad: number;
  setSliderSad: (val: number) => void;
  sliderAngry: number;
  setSliderAngry: (val: number) => void;
  sliderSurpriseBrows: number;
  setSliderSurpriseBrows: (val: number) => void;
  sliderSurpriseRatio: number;
  setSliderSurpriseRatio: (val: number) => void;

  // Nuevas props para el Reto de Replicar Emociones
  targetChallengeEmotion: "Feliz" | "Sorpresa" | "Triste" | "Molesto" | null;
  challengeProgress: number;
  challengeCompleted: boolean;
  onChangeChallenge: (emotion: "Feliz" | "Sorpresa" | "Triste" | "Molesto" | null) => void;
  detectionConfidence: number;
}

/**
 * Panel de Calibración del Módulo 2 (Lector de Emociones).
 * Muestra las barras de métricas en tiempo real de MediaPipe, expone sliders para ajustar
 * zonas muertas / tolerancias y administra las muestras biométricas guardadas.
 */
export function EmotionsModule({
  currentEmotion,
  currentEmoji,
  metrics,
  savedEmotions,
  onSaveCurrentSample,
  onDeleteSample,
  onToggleSampleCoordsValue,
  onTriggerAutoCalibrate,

  sliderSmile,
  setSliderSmile,
  sliderSurprise,
  setSliderSurprise,
  sliderSad,
  setSliderSad,
  sliderAngry,
  setSliderAngry,
  sliderSurpriseBrows,
  setSliderSurpriseBrows,
  sliderSurpriseRatio,
  setSliderSurpriseRatio,

  // Nuevas props
  targetChallengeEmotion,
  challengeProgress,
  challengeCompleted,
  onChangeChallenge,
  detectionConfidence,
  isTemplateMatched = false,
}: EmotionsModuleProps) {
  const [calibOpen, setCalibOpen] = useState(true);

  // Valores predeterminados o vacíos si no hay métricas disponibles en el momento
  const pLipGap = metrics ? metrics.lipGap : 0;
  const pCurvature = metrics ? metrics.curvature : 50;
  const pBrowFurrow = metrics ? metrics.browFurrow : 0;
  const pBrowHeight = metrics ? metrics.browHeight : 0;
  const pMouthRatio = metrics ? metrics.mouthRatio : 0;
  const rawLipGap = metrics ? metrics.rawLipGap : 0;
  const rawCurvature = metrics ? metrics.rawCurvature : 0;
  const rawBrowHeight = metrics ? metrics.rawBrowHeight : 0.22;
  const rawBrowFurrow = metrics ? metrics.rawBrowFurrow : 0.24;

  return (
    <div className="flex-grow flex flex-col justify-between gap-4 text-[#E0E0E0] animate-fade-in" id="emotions-container">
      <div className="flex-grow flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
        {/* Encabezado */}
        <div>
          <span className="text-[10px] font-mono tracking-wider text-[#10B981] bg-[#1C1C1E] px-2 py-0.5 rounded border border-[#2A2A2C]">
            MÓDULO DE PRUEBA_02
          </span>
          <h4 className="text-xl font-extrabold text-white mt-1">
            Lector de Emociones
          </h4>
          <p className="text-xs text-[#A1A1AA] mt-1 pb-2 border-b border-[#2A2A2C] leading-normal">
            Calibra rangos y captura coordenadas 3D para entender cómo la inteligencia artificial mapea gesticulaciones humanas.
          </p>
        </div>

        {/* DETECTOR Y PANEL DE FEEDBACK FACIAL (PREMIUM INTERACTIVE SELECTOR) */}
        <div className="bg-[#151517] border border-[#2A2A2C] rounded-xl overflow-hidden shadow-lg flex flex-col" id="detector-feedback-panel">
          
          {/* Header del Panel */}
          <div className="bg-[#1C1C1E] px-3.5 py-3 border-b border-[#2A2A2C] flex items-center justify-between" id="feedback-panel-header">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span className="text-[10px] font-mono font-black text-white tracking-widest uppercase">
                DETECTOR Y PANEL DE FEEDBACK
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/20">
              MEDICIÓN ACTIVA
            </span>
          </div>

          <div className="p-3.5 flex flex-col gap-3.5">
            <p className="text-[11px] text-[#A1A1AA] leading-normal font-sans">
              Selecciona una emoción biométrica del selector de alta precisión a continuación. Un molde holográfico se ajustará en tiempo real sobre tu rostro en el canvas para analizar y guiar tus facciones.
            </p>

            {/* BARRA DE DIAGNÓSTICO DE CONFIANZA DE DETECCIÓN (NUEVA) */}
            <div className="p-2.5 bg-[#1C1C1E] border border-[#10B981]/15 rounded-lg flex flex-col gap-1.5" id="diagnostic-confidence-bar">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${detectionConfidence > 0 ? "bg-[#10B981] animate-pulse" : "bg-red-500"}`} />
                  <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                    Diagnóstico: Confianza de Detección
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-black ${detectionConfidence > 0 ? "text-[#10B981]" : "text-red-500 animate-pulse"}`}>
                  {detectionConfidence > 0 ? `${detectionConfidence}%` : "0% (Rostro No Detectado)"}
                </span>
              </div>
              <div className="w-full bg-[#111112] border border-[#2A2A2C] h-2 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    detectionConfidence > 80
                      ? "bg-[#10B981] shadow-[0_0_8px_#10B981]"
                      : detectionConfidence > 0
                      ? "bg-amber-400"
                      : "w-0"
                  }`}
                  style={{ width: `${detectionConfidence}%` }}
                />
              </div>
              <div className="text-[8.5px] font-mono text-[#636366] leading-none flex justify-between">
                <span>Motor: MediaPipe Face Mesh v2</span>
                <span>Alinea tu rostro y eleva la luz ambiental si falla</span>
              </div>
            </div>

            {/* SELECTOR INTERACTIVO MUY ELEANTE */}
            <div className="flex flex-col gap-1.5" id="elegant-emotion-selector">
              <span className="text-[8px] font-mono text-[#636366] font-bold uppercase tracking-wider block mb-0.5">
                SELECTOR GESTICULANTE:
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                
                {/* 1. Neutro */}
                <button
                  onClick={() => onChangeChallenge(null)}
                  type="button"
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition border relative cursor-pointer group ${
                    targetChallengeEmotion === null
                      ? "bg-[#27272A]/30 border-zinc-400 text-white scale-[1.02] shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                      : "bg-[#111112] border-[#2A2A2C] hover:border-zinc-700 text-[#A1A1AA]"
                  }`}
                >
                  <span className="text-xl group-hover:scale-110 transition duration-200">😐</span>
                  <span className="text-[10px] font-bold mt-1 font-mono">Neutro</span>
                  <span className="text-[7px] font-mono text-zinc-500 mt-0.5">Pokerface</span>
                  {targetChallengeEmotion === null && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                  )}
                </button>

                {/* 2. Feliz */}
                <button
                  onClick={() => onChangeChallenge("Feliz")}
                  type="button"
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition border relative cursor-pointer group ${
                    targetChallengeEmotion === "Feliz"
                      ? "bg-[#10B981]/10 border-[#10B981] text-white scale-[1.02] shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "bg-[#111112] border-[#2A2A2C] hover:border-zinc-700 text-[#A1A1AA]"
                  }`}
                >
                  <span className="text-xl group-hover:scale-110 transition duration-200">😊</span>
                  <span className="text-[10px] font-bold mt-1 font-mono">Feliz</span>
                  <span className="text-[7px] font-mono text-[#10B981] mt-0.5">Sonrisa</span>
                  {targetChallengeEmotion === "Feliz" && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  )}
                </button>

                {/* 3. Sorpresa */}
                <button
                  onClick={() => onChangeChallenge("Sorpresa")}
                  type="button"
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition border relative cursor-pointer group ${
                    targetChallengeEmotion === "Sorpresa"
                      ? "bg-[#06B6D4]/10 border-[#06B6D4] text-white scale-[1.02] shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                      : "bg-[#111112] border-[#2A2A2C] hover:border-zinc-700 text-[#A1A1AA]"
                  }`}
                >
                  <span className="text-xl group-hover:scale-110 transition duration-200">😲</span>
                  <span className="text-[10px] font-bold mt-1 font-mono">Sorpresa</span>
                  <span className="text-[7px] font-mono text-[#06B6D4] mt-0.5">Vertical</span>
                  {targetChallengeEmotion === "Sorpresa" && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
                  )}
                </button>

                {/* 4. Triste */}
                <button
                  onClick={() => onChangeChallenge("Triste")}
                  type="button"
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition border relative cursor-pointer group ${
                    targetChallengeEmotion === "Triste"
                      ? "bg-[#EF4444]/10 border-[#EF4444] text-white scale-[1.02] shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                      : "bg-[#111112] border-[#2A2A2C] hover:border-zinc-700 text-[#A1A1AA]"
                  }`}
                >
                  <span className="text-xl group-hover:scale-110 transition duration-200">😢</span>
                  <span className="text-[10px] font-bold mt-1 font-mono">Triste</span>
                  <span className="text-[7px] font-mono text-[#EF4444] mt-0.5">Caído</span>
                  {targetChallengeEmotion === "Triste" && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                  )}
                </button>

                {/* 5. Molesto */}
                <button
                  onClick={() => onChangeChallenge("Molesto")}
                  type="button"
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition border relative cursor-pointer group ${
                    targetChallengeEmotion === "Molesto"
                      ? "bg-[#EAB308]/10 border-[#EAB308] text-white scale-[1.02] shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                      : "bg-[#111112] border-[#2A2A2C] hover:border-zinc-700 text-[#A1A1AA]"
                  }`}
                >
                  <span className="text-xl group-hover:scale-110 transition duration-200">😠</span>
                  <span className="text-[10px] font-bold mt-1 font-mono">Molesto</span>
                  <span className="text-[7px] font-mono text-[#EAB308] mt-0.5">Ceño</span>
                  {targetChallengeEmotion === "Molesto" && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#EAB308] animate-pulse" />
                  )}
                </button>

              </div>
            </div>

            {/* PANEL DE FEEDBACK GESTICULANTE ACTIVO */}
            <div className="p-3 bg-[#111112] border border-[#2A2A2C] rounded-lg flex flex-col gap-2.5" id="live-feedback-wizard">
              <div className="flex items-center justify-between border-b border-[#2A2A2C] pb-1.5">
                <span className="text-[9px] font-mono font-bold tracking-wider text-neutral-400 uppercase">
                  ASISTENCIA DE COLOCACIÓN BIOMÉTRICA
                </span>
                <span className="text-[8px] font-mono bg-zinc-800 text-zinc-300 px-1 py-0.5 rounded">
                  {targetChallengeEmotion ? targetChallengeEmotion.toUpperCase() : "ALINEACIÓN NEUTRA"}
                </span>
              </div>

              {/* Instrucciones gesticulares e Inteligencia de comparación en vivo */}
              {targetChallengeEmotion === null && (
                <div className="space-y-1.5 text-[11px] text-[#A1A1AA] leading-relaxed">
                  <p className="font-semibold text-zinc-400 flex items-center gap-1">
                    <span>😐</span> Pokerface Neutro Activo
                  </p>
                  <p>Manten tus músculos faciales relajados. No sonrías, no frunzas el ceño y mantén los labios juntos en posición de reposo absoluto.</p>
                  <div className="text-[9.5px] font-mono text-[#10B981] bg-[#10B981]/5 p-1 px-1.5 border border-[#10B981]/15 rounded flex items-center gap-1 mt-1 justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    SISTEMA ALINEADO Y RECONOCIENDO LIMITES
                  </div>
                </div>
              )}

              {targetChallengeEmotion === "Feliz" && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#E0E0E0] leading-relaxed">
                    <p className="font-bold text-emerald-400 mb-0.5">😊 Gesto de Felicidad:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#A1A1AA] text-[10.5px]">
                      <li>Estira horizontalmente tu boca hacia los lados.</li>
                      <li>Eleva las comisuras de los labios hacia tus pómulos.</li>
                    </ul>
                  </div>
                  {/* Consejos en tiempo real basados en sensor geométrico */}
                  <div className="p-1.5 bg-[#10B981]/5 border border-[#10B981]/15 rounded text-[10px] text-[#10B981] font-mono text-center">
                    {pCurvature < 52.8 && rawCurvature > sliderSmile ? (
                      <span>⚠️ FEEDBACK: ¡Sonríe más fuerte! Eleva las comisuras de tu boca.</span>
                    ) : (
                      <span>✓ FEEDBACK: Curvatura de sonrisa exitosa detectada.</span>
                    )}
                  </div>
                </div>
              )}

              {targetChallengeEmotion === "Sorpresa" && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#E0E0E0] leading-relaxed">
                    <p className="font-bold text-cyan-400 mb-0.5">😲 Gesto de Sorpresa:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#A1A1AA] text-[10.5px]">
                      <li>Abre la boca verticalmente al máximo en forma de &quot;O&quot;.</li>
                      <li>Eleva tu frente levantando ambas cejas.</li>
                    </ul>
                  </div>
                  {/* Consejos en tiempo real basados en sensor geométrico */}
                  <div className="p-1.5 bg-[#06B6D4]/5 border border-[#06B6D4]/15 rounded text-[10px] text-[#06B6D4] font-mono text-center">
                    {rawLipGap < sliderSurprise * 0.9 || pMouthRatio > sliderSurpriseRatio || rawBrowHeight < sliderSurpriseBrows * 0.90 ? (
                      <span>⚠️ FEEDBACK: Abre más la boca verticalmente y eleva tus cejas con asombro.</span>
                    ) : (
                      <span>✓ FEEDBACK: ¡Excelente! Gesto de asombro impecable.</span>
                    )}
                  </div>
                </div>
              )}

              {targetChallengeEmotion === "Triste" && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#E0E0E0] leading-relaxed">
                    <p className="font-bold text-[#EF4444] mb-0.5">😢 Gesto de Tristeza:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#A1A1AA] text-[10.5px]">
                      <li>Curva las comisuras de tu boca hacia abajo, arqueando el labio.</li>
                      <li>Inclina tus cejas de forma de caída melancólica.</li>
                    </ul>
                  </div>
                  {/* Consejos en tiempo real basados en sensor geométrico */}
                  <div className="p-1.5 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded text-[10px] text-[#EF4444] font-mono text-center">
                    {pCurvature > 47.8 && rawCurvature < sliderSad ? (
                      <span>⚠️ FEEDBACK: Curva hacia abajo las comisuras labiales (haz puchero).</span>
                    ) : (
                      <span>✓ FEEDBACK: Tensión melancólica correcta registrada.</span>
                    )}
                  </div>
                </div>
              )}

              {targetChallengeEmotion === "Molesto" && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#E0E0E0] leading-relaxed">
                    <p className="font-bold text-[#EAB308] mb-0.5">😠 Gesto de Enfado / Enojo:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[#A1A1AA] text-[10.5px]">
                      <li>Frunce fuertemente el ceño juntando ambas cejas en el centro de tu nariz.</li>
                      <li>Tensa los labios formando una línea horizontal rígida.</li>
                    </ul>
                  </div>
                  {/* Consejos en tiempo real basados en sensor geométrico */}
                  <div className="p-1.5 bg-[#EAB308]/5 border border-[#EAB308]/15 rounded text-[10px] text-[#EAB308] font-mono text-center">
                    {pBrowFurrow < sliderAngry || rawBrowHeight > Math.max(0.255, sliderSurpriseBrows) ? (
                      <span>⚠️ FEEDBACK: Junta tus cejas al entrecejo con fuerza (enfado).</span>
                    ) : (
                      <span>✓ FEEDBACK: Arrugas de enfado del entrecejo detectadas correctamente.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Barra de progreso de coincidencia holográfica */}
              {targetChallengeEmotion && (
                <div className="pt-2 border-t border-[#2A2A2C] mt-1">
                  <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                    <span className="text-zinc-400">COINCIDENCIA FACIAL:</span>
                    <span className={`font-black tracking-wider ${challengeCompleted ? "text-emerald-400 animate-pulse text-[11px]" : "text-[#10B981]"}`}>
                      {challengeCompleted ? "🏆 ¡GESTO DOMINADO!" : `${Math.round(challengeProgress)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-[#1C1C1E] border border-[#2A2A2C] h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-75 ${
                        challengeCompleted ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-[#10B981]"
                      }`}
                      style={{ width: `${challengeProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* BOTÓN INTELIGENTE AUTO-CALIBRAR RANGO DESDE ROSTRO ACTUAL */}
              {targetChallengeEmotion && (
                <div className="pt-1.5 border-t border-[#2A2A2C] flex gap-1.5">
                  <button
                    onClick={() => {
                      if (!metrics) return;
                      // Ajustar el slider respectivo tomando el valor real de su rostro y sumando un margen de confort
                      if (targetChallengeEmotion === "Feliz") {
                        // curvature es 50 - rawCurv * 210, rawCurvature es lo que usa el clasificador
                        // si quiere calibrar que el límite sea su rostro actual:
                        setSliderSmile(metrics.rawCurvature + 0.003); // margen de holgura
                      } else if (targetChallengeEmotion === "Sorpresa") {
                        setSliderSurprise(Math.max(0.05, metrics.rawLipGap - 0.02));
                        setSliderSurpriseBrows(Math.max(0.18, metrics.rawBrowHeight - 0.03));
                      } else if (targetChallengeEmotion === "Triste") {
                        setSliderSad(Math.max(0.01, metrics.rawCurvature - 0.005));
                      } else if (targetChallengeEmotion === "Molesto") {
                        setSliderAngry(Math.max(20, Math.round(metrics.browFurrow - 5)));
                      }
                      playSuccessSound();
                    }}
                    disabled={!metrics}
                    type="button"
                    className="w-full bg-[#1C1C1E] hover:bg-[#2A2A2C] border border-zinc-700 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-1 px-2 rounded font-mono text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Añade tu gesticulación real actual como el límite de calibración para este slider automáticamente"
                  >
                    ⚡ CONFIGURAR CON ROSTRO ACTUAL (AUTO-AJUSTE)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráficas de Barra Dinámicas */}
        <div className="space-y-2.5 bg-[#1C1C1E] p-3 rounded-lg border border-[#2A2A2C]" id="live-metrics-panel">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-[10px] font-mono text-[#636366] uppercase tracking-wider">Lectura Biométrica Cruda</span>
          </div>

          {/* Apertura labios */}
          <div>
            <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-0.5 font-mono">
              <span>Distancia Labios ({rawLipGap.toFixed(4)}):</span>
              <span className="font-bold text-[#10B981]">{pLipGap.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#10B981] h-full transition-all duration-100"
                style={{ width: `${pLipGap}%` }}
              />
            </div>
          </div>

          {/* Curvatura sonrisa */}
          <div>
            <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-0.5 font-mono">
              <span>Curvatura Comisuras ({rawCurvature.toFixed(4)}):</span>
              <span className="font-bold text-emerald-400">{pCurvature.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-100"
                style={{ width: `${pCurvature}%` }}
              />
            </div>
          </div>

          {/* Cejas fruncidas */}
          <div>
            <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-0.5 font-mono">
              <span>Fruncido de Cejas:</span>
              <span className="font-bold text-teal-400">{pBrowFurrow.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full transition-all duration-100"
                style={{ width: `${pBrowFurrow}%` }}
              />
            </div>
          </div>

          {/* Altura de cejas */}
          <div>
            <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-0.5 font-mono">
              <span>Elevación de Cejas:</span>
              <span className="font-bold text-neutral-400">{pBrowHeight.toFixed(2)}</span>
            </div>
            <div className="w-full bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#323235] h-full transition-all duration-100"
                style={{ width: `${Math.min(100, (pBrowHeight / 0.4) * 100)}%` }}
              />
            </div>
          </div>

          {/* Relación de aspecto de boca */}
          <div>
            <div className="flex justify-between text-[10px] text-[#A1A1AA] mb-0.5 font-mono">
              <span>Aspecto de Boca (Ancho/Alto):</span>
              <span className="font-bold text-stone-400">
                {pMouthRatio === 99.0 ? "N/A" : pMouthRatio.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#636366] h-full transition-all duration-100"
                style={{ width: `${Math.min(100, (pMouthRatio / 3.0) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Acordeón de Ajustes manuales */}
        <div className="bg-[#1C1C1E] rounded-lg border border-[#2A2A2C] p-3 shadow-sm transition-all" id="calibration-settings-card">
          <button
            type="button"
            onClick={() => setCalibOpen(!calibOpen)}
            className="w-full text-left text-xs font-bold text-[#10B981] flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              SINTONIZACIÓN DE TOLERANCIAS
            </span>
            {calibOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {calibOpen && (
            <div className="space-y-3 pt-3.5 text-[11px] border-t border-[#2A2A2C] mt-2">
              {/* Slider 1: Sonrisa */}
              <div>
                <div className="flex justify-between text-[10px] text-[#636366] mb-0.5 font-mono">
                  <span>Sensibilidad Sonrisa:</span>
                  <span className="font-bold text-[#10B981]">{sliderSmile.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.04"
                  max="0.00"
                  step="0.001"
                  value={sliderSmile}
                  onChange={(e) => setSliderSmile(parseFloat(e.target.value))}
                  className="w-full accent-[#10B981] bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 2: Sorpresa Boca */}
              <div>
                <div className="flex justify-between text-[10px] text-[#636366] mb-0.5 font-mono">
                  <span>Apertura Sorpresa:</span>
                  <span className="font-bold text-[#10B981]">{sliderSurprise.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.25"
                  step="0.01"
                  value={sliderSurprise}
                  onChange={(e) => setSliderSurprise(parseFloat(e.target.value))}
                  className="w-full accent-[#10B981] bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 3: Triste */}
              <div>
                <div className="flex justify-between text-[10px] text-[#636366] mb-0.5 font-mono">
                  <span>Comisuras Caídas (Triste):</span>
                  <span className="font-bold text-[#10B981]">{sliderSad.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.08"
                  step="0.002"
                  value={sliderSad}
                  onChange={(e) => setSliderSad(parseFloat(e.target.value))}
                  className="w-full accent-[#10B981] bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 4: Molesto */}
              <div>
                <div className="flex justify-between text-[10px] text-[#636366] mb-0.5 font-mono">
                  <span>Fruncido de Cejas (Enfado):</span>
                  <span className="font-bold text-[#10B981]">{sliderAngry}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={sliderAngry}
                  onChange={(e) => setSliderAngry(parseInt(e.target.value))}
                  className="w-full accent-[#10B981] bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 5: Surprise Brows */}
              <div>
                <div className="flex justify-between text-[10px] text-[#636366] mb-0.5 font-mono">
                  <span>Cejas Sorpresa:</span>
                  <span className="font-bold text-[#10B981]">{sliderSurpriseBrows.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.18"
                  max="0.35"
                  step="0.01"
                  value={sliderSurpriseBrows}
                  onChange={(e) => setSliderSurpriseBrows(parseFloat(e.target.value))}
                  className="w-full accent-[#10B981] bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider 6: Surprise Ratio */}
              <div>
                <div className="flex justify-between text-[10px] text-[#636366] mb-0.5 font-mono">
                  <span>Redondez de Boca Max:</span>
                  <span className="font-bold text-[#10B981]">{sliderSurpriseRatio.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.2"
                  step="0.05"
                  value={sliderSurpriseRatio}
                  onChange={(e) => setSliderSurpriseRatio(parseFloat(e.target.value))}
                  className="w-full accent-[#10B981] bg-[#111112] border border-[#2A2A2C] h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caja de Estado Evaluado en Vivo */}
      <div className={`p-3 border rounded-xl text-center flex flex-col items-center shrink-0 shadow-sm transition-all duration-300 ${isTemplateMatched ? "bg-[#10B981]/10 border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.08)] animate-pulse" : "bg-[#1C1C1E] border-[#2A2A2C]"}`} id="realtime-diagnostic-box">
        <span className={`text-[9px] block uppercase font-bold tracking-widest font-mono ${isTemplateMatched ? "text-emerald-400" : "text-[#636366]"}`}>
          {isTemplateMatched ? "✓ COMPARANDO CONTRA TU EXP. GUARDADA" : "DIAGNÓSTICO EN TIEMPO REAL"}
        </span>
        <div className="text-3xl my-1.5">{currentEmoji}</div>
        <div className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5 justify-center">
          <span>{currentEmotion}</span>
          {isTemplateMatched && (
            <span className="text-[8px] bg-[#10B981] text-black px-1 py-0.5 rounded font-black font-mono tracking-wider">
              MOLDE CORRESPONDIENTE
            </span>
          )}
        </div>
      </div>

      {/* Botón de Captura y Auditoría */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-[#2A2A2C] shrink-0">
        
        {/* NUEVA SECCIÓN DE ENTRENAMIENTO BIOMÉTRICO INSTANTÁNEO POR BOTÓN EN ESPAÑOL */}
        <div className="bg-[#151517] border border-[#2A2A2C] rounded-lg p-2.5 flex flex-col gap-2" id="training-template-capturer">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold text-[#10B981] uppercase tracking-wider">
              Captura Directa de Plantilla Biométrica
            </span>
            <span className="text-[8.5px] text-[#8E8E93] leading-tight mt-0.5">
              Haz la expresión con tu rostro y presiona el botón respectivo para guardar su molde y auto-ajustar el detector de inmediato:
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { if (metrics) onSaveCurrentSample("Feliz"); }}
              disabled={!metrics}
              type="button"
              className="px-2 py-1.5 bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 hover:border-[#10B981] disabled:opacity-40 disabled:cursor-not-allowed rounded text-[#10B981] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
              title="Haz cara de felicidad y guárdala para calibrar tu sonrisa"
            >
              <span>😊</span> Feliz
            </button>
            <button
              onClick={() => { if (metrics) onSaveCurrentSample("Sorpresa"); }}
              disabled={!metrics}
              type="button"
              className="px-2 py-1.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 border border-[#06B6D4]/30 hover:border-[#06B6D4] disabled:opacity-40 disabled:cursor-not-allowed rounded text-[#06B6D4] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
              title="Abre la boca y levanta las cejas, luego presiona para calibrar tu asombro"
            >
              <span>😲</span> Sorpresa
            </button>
            <button
              onClick={() => { if (metrics) onSaveCurrentSample("Triste"); }}
              disabled={!metrics}
              type="button"
              className="px-2 py-1.5 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 hover:border-[#EF4444] disabled:opacity-40 disabled:cursor-not-allowed rounded text-[#EF4444] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
              title="Haz puchero y junta las cejas con tristeza, luego presiona para calibrar"
            >
              <span>😢</span> Triste
            </button>
            <button
              onClick={() => { if (metrics) onSaveCurrentSample("Molesto"); }}
              disabled={!metrics}
              type="button"
              className="px-2 py-1.5 bg-[#EAB308]/10 hover:bg-[#EAB308]/20 border border-[#EAB308]/30 hover:border-[#EAB308] disabled:opacity-40 disabled:cursor-not-allowed rounded text-[#EAB308] font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
              title="Frunce fuertemente el ceño y presiona para calibrar tu enfado"
            >
              <span>😠</span> Molesto
            </button>
          </div>
          
          <button
            onClick={() => { if (metrics) onSaveCurrentSample("Neutro"); }}
            disabled={!metrics}
            type="button"
            className="w-full py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-zinc-700 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
            title="Calibra tus facciones en estado de reposo absoluto"
          >
            <span>😐</span> Guardar como Neutro (Cara Seria)
          </button>
        </div>

        {/* Botón original de captura rápida */}
        <button
          onClick={() => onSaveCurrentSample()}
          type="button"
          id="btn-save-sample"
          className="w-full bg-[#1C1C1E] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer shadow-inner"
          title="Registra tus vectores 3D actuales en el historial sin forzar auto-calibración instantánea"
        >
          <Camera className="w-3.5 h-3.5 text-zinc-400" />
          Registrar con Emoción Auto-Detectada
        </button>

        <div>
          <span className="text-[9px] text-[#636366] font-bold uppercase tracking-wider block mb-1.5 font-mono">
            MUESTRAS REGISTRADAS ({savedEmotions.length})
          </span>

          <div className="flex flex-col gap-2 max-h-[170px] overflow-y-auto pr-1" id="samples-history-panel">
            {savedEmotions.length === 0 ? (
              <div className="text-center py-4 text-[#636366] text-[10px] italic">
                Ninguna calibración guardada en sesión.
              </div>
            ) : (
              savedEmotions.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-[#151517] border border-[#2A2A2C] rounded-lg relative hover:border-[#10B981]/30 transition flex flex-col gap-1.5 text-xs text-slate-200"
                >
                  {/* Botón de borrado */}
                  <button
                    onClick={() => onDeleteSample(item.id)}
                    type="button"
                    id={`btn-delete-sample-${item.id}`}
                    className="absolute top-2 right-2 text-[#636366] hover:text-red-400 transition"
                    title="Eliminar muestra"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Fila del emoji */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">{item.emotion}</span>
                      <span className="text-[8px] text-[#636366] font-mono">{item.time}</span>
                    </div>
                  </div>

                  {/* Tabla en miniatura */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono bg-[#0A0A0B] p-1.5 rounded-md border border-[#2A2A2C]">
                    <div className="flex justify-between">
                      <span className="text-[#636366]">Curvatura:</span>
                      <span className="text-white">{item.metrics.curvature.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#636366]">Apertura:</span>
                      <span className="text-white">{item.metrics.lipGap.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#636366]">Fruncido:</span>
                      <span className="text-white">{item.metrics.browFurrow.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#636366]">Elevación:</span>
                      <span className="text-white">{item.metrics.browHeight.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botón de auto calibrar rápido */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <button
                      onClick={() => onTriggerAutoCalibrate(item.id, "Feliz")}
                      type="button"
                      className="bg-[#1C1C1E] hover:bg-[#323235] border border-[#2A2A2C] text-[8px] text-[#A1A1AA] font-bold py-0.5 px-1.5 rounded transition cursor-pointer"
                    >
                      Feliz 😊
                    </button>
                    <button
                      onClick={() => onTriggerAutoCalibrate(item.id, "Sorpresa")}
                      type="button"
                      className="bg-[#1C1C1E] hover:bg-[#323235] border border-[#2A2A2C] text-[8px] text-[#A1A1AA] font-bold py-0.5 px-1.5 rounded transition cursor-pointer"
                    >
                      Sorpr 😲
                    </button>
                    <button
                      onClick={() => onTriggerAutoCalibrate(item.id, "Triste")}
                      type="button"
                      className="bg-[#1C1C1E] hover:bg-[#323235] border border-[#2A2A2C] text-[8px] text-[#A1A1AA] font-bold py-0.5 px-1.5 rounded transition cursor-pointer"
                    >
                      Triste 😢
                    </button>
                    <button
                      onClick={() => onTriggerAutoCalibrate(item.id, "Molesto")}
                      type="button"
                      className="bg-[#1C1C1E] hover:bg-[#323235] border border-[#2A2A2C] text-[8px] text-[#A1A1AA] font-bold py-0.5 px-1.5 rounded transition cursor-pointer"
                    >
                      Enfad 😠
                    </button>
                  </div>

                  {/* Desglose de coordenadas en 3D para la auditoría */}
                  <div className="border-t border-[#2A2A2C] pt-1.5">
                    <button
                      onClick={() => onToggleSampleCoordsValue(item.id)}
                      type="button"
                      className="text-[9px] font-bold text-[#636366] hover:text-white flex items-center justify-between w-full font-mono cursor-pointer"
                    >
                      <span>VECTORES_FOTOGRAMÉTRICOS_3D</span>
                      {item.showCoords ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {item.showCoords && (
                      <div className="mt-1.5 p-1.5 bg-[#0A0A0B] rounded border border-[#2A2A2C] text-[8px] font-mono text-[#A1A1AA] space-y-0.5 leading-normal max-h-[120px] overflow-y-auto">
                        <div className="text-[7px] text-[#10B981] font-bold border-b border-[#2A2A2C] pb-0.5 mb-1 flex justify-between">
                          <span>PIXEL ANCLA</span>
                          <span>COORDENADAS (X, Y, Z)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labio Sup (13):</span>
                          <span className="text-slate-200">
                            ({item.landmarks.labioSup.x.toFixed(3)}, {item.landmarks.labioSup.y.toFixed(3)}, {item.landmarks.labioSup.z.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labio Inf (14):</span>
                          <span className="text-slate-200">
                            ({item.landmarks.labioInf.x.toFixed(3)}, {item.landmarks.labioInf.y.toFixed(3)}, {item.landmarks.labioInf.z.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Comisura Izq (61):</span>
                          <span className="text-slate-200">
                            ({item.landmarks.comisuraIzq.x.toFixed(3)}, {item.landmarks.comisuraIzq.y.toFixed(3)}, {item.landmarks.comisuraIzq.z.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Comisura Der (291):</span>
                          <span className="text-slate-200">
                            ({item.landmarks.comisuraDer.x.toFixed(3)}, {item.landmarks.comisuraDer.y.toFixed(3)}, {item.landmarks.comisuraDer.z.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ceja Izq (107):</span>
                          <span className="text-slate-200">
                            ({item.landmarks.cejaIzq.x.toFixed(3)}, {item.landmarks.cejaIzq.y.toFixed(3)}, {item.landmarks.cejaIzq.z.toFixed(3)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ceja Der (336):</span>
                          <span className="text-slate-200">
                            ({item.landmarks.cejaDer.x.toFixed(3)}, {item.landmarks.cejaDer.y.toFixed(3)}, {item.landmarks.cejaDer.z.toFixed(3)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
