/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ModuleType, SavedEmotion } from "./types";
import { useVision } from "./hooks/useVision";
import { MainMenu } from "./components/MainMenu";
import { Workspace } from "./components/Workspace";
import { Cpu, Wifi, WifiOff } from "lucide-react";

/**
 * Componente Principal del Sistema (App).
 * Actúa como orquestador central del estado del laboratorio de visión artificial.
 * Administra el estado global del módulo activo, el repositorio histórico de calibraciones
 * biométricas y enlaza la tubería inteligente de useVision.
 */
export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>("MENU");
  const [savedSamples, setSavedSamples] = useState<SavedEmotion[]>(() => {
    try {
      const stored = localStorage.getItem("saved_biometric_samples");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error loading biometric samples from localStorage:", e);
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    try {
      localStorage.setItem("saved_biometric_samples", JSON.stringify(savedSamples));
    } catch (e) {
      console.error("Error saving biometric samples to localStorage:", e);
    }
  }, [savedSamples]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("[Connection] Web app is now online.");
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log("[Connection] Web app is working offline from cached Service Worker.");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Inicialización inteligente y centralizada de la cámara y clasificadores neuronales (reutilización)
  const {
    isLoaded,
    isLoading,
    error,
    faceLandmarks,
    handLandmarks,
    videoElement,
    detectionConfidence,
  } = useVision(activeModule);

  // Manipulación del repositorio histórico de calibración (Lector de Emociones)
  const handleSaveSample = (sample: Omit<SavedEmotion, "id" | "time" | "showCoords">) => {
    const newSample: SavedEmotion = {
      ...sample,
      id: Date.now(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      showCoords: false,
    };
    setSavedSamples((prev) => [newSample, ...prev]);
  };

  const handleDeleteSample = (id: number) => {
    setSavedSamples((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden selection:bg-emerald-500 selection:text-black bg-[#0A0A0B]" id="main-portal">
      
      {/* CABECERA PRINCIPAL UNIFICADA (HEADER) */}
      <header className="h-14 border-b border-[#2A2A2C] px-6 flex items-center justify-between bg-[#111112] shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#1C1C1E] border border-[#2A2A2C] text-[#10B981] p-1.5 rounded-md shadow-sm active:scale-95 transition-all">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-widest uppercase text-[#10B981]">
                VISIÓN ARTIFICIAL LAB
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#1C1C1E] text-[#636366] text-[9px] font-mono border border-[#2A2A2C]">v3.5.0</span>
            </div>
          </div>
        </div>

        {/* Indicador de estado del hardware del sensor (Cámara) */}
        <div className="flex items-center gap-4">
          {activeModule !== "MENU" && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded border text-[10px] font-mono ${
                error
                  ? "bg-red-400/10 text-red-400 border-red-400/20"
                  : isLoaded
                  ? "bg-[#1C1C1E] text-[#10B981] border-[#2A2A2C] shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                  : "bg-amber-400/10 text-amber-400 border-amber-400/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full mr-2 ${
                  error
                    ? "bg-red-400"
                    : isLoaded
                    ? "bg-[#10B981] shadow-[0_0_6px_#10B981]"
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              {error ? "FAIL" : isLoaded ? "LIVE_FEED" : "SYNCING"}
            </span>
          )}
          {/* Indicador de Conexión de Red (Soporte Offline/Online) */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono ${
              isOnline
                ? "bg-emerald-950/20 text-[#10B981] border-[#10B981]/20"
                : "bg-amber-950/20 text-amber-500 border-amber-500/20"
            }`}
            title={isOnline ? "Estableciendo conexión a Internet" : "Ejecutando en modo local seguro y desconectado"}
          >
            {isOnline ? (
              <Wifi className="w-2.5 h-2.5 mr-1 text-[#10B981]" />
            ) : (
              <WifiOff className="w-2.5 h-2.5 mr-1 text-amber-500" />
            )}
            {isOnline ? "ONLINE" : "OFFLINE LOCAL"}
          </span>
          <div className="hidden md:block text-[10px] font-mono text-[#636366]">MEM_USE: 142.4MB / 1.0GB</div>
        </div>
      </header>

      {/* ÁREA ENTORNO SWITCHER VISTA */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-[#0A0A0B]">
        {activeModule === "MENU" ? (
          <MainMenu onStartModule={setActiveModule} />
        ) : (
          <Workspace
            activeModule={activeModule}
            onExitToMenu={() => setActiveModule("MENU")}
            faceLandmarks={faceLandmarks}
            handLandmarks={handLandmarks}
            videoElement={videoElement}
            isLoading={isLoading}
            error={error}
            savedEmotions={savedSamples}
            onSaveSample={handleSaveSample}
            onDeleteSample={handleDeleteSample}
            detectionConfidence={detectionConfidence}
          />
        )}
      </main>
    </div>
  );
}
