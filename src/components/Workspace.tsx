/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { ModuleType, MeshType, FilterType, EmotionMetrics, SavedEmotion, Bubble, Particle, Spore } from "../types";
import { playPopSound, playSuccessSound, playElectricSound } from "../utils/audio";
import { FiltersModule } from "./FiltersModule";
import { EmotionsModule } from "./EmotionsModule";
import { BubblesModule } from "./BubblesModule";
import { ArrowLeft, RefreshCw, Smartphone, EyeOff, ShieldAlert } from "lucide-react";

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  type: "trail" | "head";
}

interface WorkspaceProps {
  activeModule: ModuleType;
  onExitToMenu: () => void;
  faceLandmarks: any;
  handLandmarks: any;
  videoElement: HTMLVideoElement | null;
  isLoading: boolean;
  error: Error | null;

  // Estados de muestras biométricas
  savedEmotions: SavedEmotion[];
  onSaveSample: (sample: Omit<SavedEmotion, "id" | "time" | "showCoords">) => void;
  onDeleteSample: (id: number) => void;
  detectionConfidence: number;
}

/**
 * Entorno de Trabajo Principal (Workspace).
 * Integra los paneles laterales de control con el visor general basado en HTML5 Canvas.
 * Implementa el bucle de renderizado interactivo optimizado a 60 FPS mediante refs y requestAnimationFrame
 * para garantizar máxima fluidez operativa.
 */
export function Workspace({
  activeModule,
  onExitToMenu,
  faceLandmarks,
  handLandmarks,
  videoElement,
  isLoading,
  error,
  savedEmotions,
  onSaveSample,
  onDeleteSample,
  detectionConfidence,
}: WorkspaceProps) {
  // --- ESTADOS LOCALES DE CONFIGURACIÓN ---
  const [selectedMesh, setSelectedMesh] = useState<MeshType>("cyber");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("todo");

  // Calibraciones del lector de emociones
  const [sliderSmile, setSliderSmile] = useState(-0.012);
  const [sliderSurprise, setSliderSurprise] = useState(0.075);
  const [sliderSad, setSliderSad] = useState(0.04);
  const [sliderAngry, setSliderAngry] = useState(32);
  const [sliderSurpriseBrows, setSliderSurpriseBrows] = useState(0.235);
  const [sliderSurpriseRatio, setSliderSurpriseRatio] = useState(1.90);

  // Historial de muestras: Estado UI expandido
  const [samples, setSamples] = useState<SavedEmotion[]>(savedEmotions);

  // Sincronizar historial con el prop padre
  useEffect(() => {
    setSamples(savedEmotions);
  }, [savedEmotions]);

  // --- ESTADOS LOCALES DEL JUEGO DE BURBUJAS (MÓDULO 03) ---
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem("bubble_high_score") || "0");
    } catch {
      return 0;
    }
  });
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<"bubbles" | "plasma" | "lightning" | "emotions">("bubbles");
  const gameModeRef = useRef<"bubbles" | "plasma" | "lightning" | "emotions">("bubbles");

  // Estado del menú / lobby interno de juegos en el canvas y barra de energía
  const [inGameLobby, setInGameLobby] = useState(true);
  const inGameLobbyRef = useRef(true);
  const [electricEnergy, setElectricEnergy] = useState(0);
  const electricEnergyRef = useRef(0);

  // Estados de victoria y animación del juego de relámpago
  const [electricWinState, setElectricWinState] = useState<"playing" | "victory_menu" | "animating_tesla" | "animating_storm" | "animating_supernova">("playing");
  const electricWinStateRef = useRef<"playing" | "victory_menu" | "animating_tesla" | "animating_storm" | "animating_supernova">("playing");
  const [electricAnimDuration, setElectricAnimDuration] = useState(0); // para barra de la animación
  const electricAnimDurationRef = useRef(0);

  // Historial de posiciones anteriores de las manos para detectar velocidad (poderes eléctricos)
  const prevP1Ref = useRef({ x: 0, y: 0 });
  const prevP2Ref = useRef({ x: 0, y: 0 });
  const soundCooldownRef = useRef(0);

  const emotionsGameTargetRef = useRef<"Feliz" | "Sorpresa" | "Triste" | "Molesto">("Feliz");
  const initialTimeLimitRef = useRef(30);

  // Lista de pilas/baterías cayendo para el modo de juego eléctrico
  const batteriesListRef = useRef<Array<{
    x: number;
    y: number;
    vy: number;
    angle: number;
    spin: number;
    size: number;
    charge: number;
    isNegative?: boolean; // Pila descargada / de polaridad opuesta
  }>>([]);

  // --- REFS CRUCIALES PARA EL BUCLE DE DIBUJO ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Guardamos las métricas calculadas en tiempo real en un Ref para que el módulo de emotions las dibuje
  const [liveMetrics, setLiveMetrics] = useState<EmotionMetrics | null>(null);
  const [liveEmotion, setLiveEmotion] = useState("Neutro");
  const [liveEmoji, setLiveEmoji] = useState("😐");
  const [isTemplateMatched, setIsTemplateMatched] = useState(false);

  // --- ESTADOS DEL RETO DE COINCIDENCIA DE EMOCIONES (ENTRENAMIENTO BIOMÉTRICO) ---
  const [targetChallengeEmotion, setTargetChallengeEmotion] = useState<"Feliz" | "Sorpresa" | "Triste" | "Molesto" | null>(null);
  const targetChallengeEmotionRef = useRef<"Feliz" | "Sorpresa" | "Triste" | "Molesto" | null>(null);
  useEffect(() => { targetChallengeEmotionRef.current = targetChallengeEmotion; }, [targetChallengeEmotion]);

  const [challengeProgress, setChallengeProgress] = useState(0);
  const challengeProgressRef = useRef(0);
  useEffect(() => { challengeProgressRef.current = challengeProgress; }, [challengeProgress]);

  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const challengeCompletedRef = useRef(false);
  useEffect(() => { challengeCompletedRef.current = challengeCompleted; }, [challengeCompleted]);

  const handleSelectChallengeEmotion = (emotion: "Feliz" | "Sorpresa" | "Triste" | "Molesto" | null) => {
    setTargetChallengeEmotion(emotion);
    setChallengeProgress(0);
    setChallengeCompleted(false);
    challengeProgressRef.current = 0;
    challengeCompletedRef.current = false;
    playSuccessSound();
  };
  
  // Blink state and control refs
  const lastBlinkStateRef = useRef(false);
  const blinkIntensityRef = useRef(0);

  // Moving averages (EMA) for stabilizing emotion metrics
  const emaMetricsRef = useRef<{
    lipGap: number;
    curvature: number;
    browFurrow: number;
    browHeight: number;
    mouthRatio: number;
    rawLipGap: number;
    rawCurvature: number;
    rawBrowFurrow: number;
    rawBrowHeight: number;
    rawEyeOpenness: number;
    rawBrowTilt: number;
    rawNoseScrunchDist: number;
  }>({
    lipGap: 0,
    curvature: 50,
    browFurrow: 0,
    browHeight: 0.22,
    mouthRatio: 1.0,
    rawLipGap: 0,
    rawCurvature: 0,
    rawBrowFurrow: 0.24,
    rawBrowHeight: 0.22,
    rawEyeOpenness: 0.07,
    rawBrowTilt: 0,
    rawNoseScrunchDist: 0.15,
  });

  // Refs de landmarks actualizados por props para evitar re-montado del canvas
  const faceLandmarksRef = useRef<any>(null);
  const handLandmarksRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const samplesRef = useRef<SavedEmotion[]>(samples);

  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  // Refs de configuraciones cambiantes de sliders para el canvas
  const sliderSmileRef = useRef(sliderSmile);
  const sliderSurpriseRef = useRef(sliderSurprise);
  const sliderSadRef = useRef(sliderSad);
  const sliderAngryRef = useRef(sliderAngry);
  const sliderSurpriseBrowsRef = useRef(sliderSurpriseBrows);
  const sliderSurpriseRatioRef = useRef(sliderSurpriseRatio);

  const selectedMeshRef = useRef(selectedMesh);
  const selectedFilterRef = useRef(selectedFilter);

  // Objetos animados dentro del canvas
  const bubblesListRef = useRef<Bubble[]>([]);
  const particlesListRef = useRef<Particle[]>([]);
  const sporesListRef = useRef<Spore[]>([]); // Esporas del biolum y llamas de fuego
  const noseSparklesRef = useRef<SparkleParticle[]>([]); // Destellos del rastro de la nariz y movimiento
  const prevNoseRef = useRef<{ x: number; y: number } | null>(null);

  const gameActiveRef = useRef(gameActive);
  const scoreRef = useRef(score);

  // Timers hover para los botones virtuales interactivos en Filtros
  const hoverTimersRef = useRef<{ [key: string]: number }>({
    clasico: 0,
    biolum: 0,
    cyber: 0,
    fuego: 0,
    electrico: 0,
    lentes: 0,
    orejas: 0,
    sombrero: 0,
    todo: 0,
    limpiar: 0,
  });

  // --- SINCRONIZACIÓN CONSTANTE DE REFS ---
  useEffect(() => { faceLandmarksRef.current = faceLandmarks; }, [faceLandmarks]);
  useEffect(() => { handLandmarksRef.current = handLandmarks; }, [handLandmarks]);
  useEffect(() => { videoElementRef.current = videoElement; }, [videoElement]);

  useEffect(() => { sliderSmileRef.current = sliderSmile; }, [sliderSmile]);
  useEffect(() => { sliderSurpriseRef.current = sliderSurprise; }, [sliderSurprise]);
  useEffect(() => { sliderSadRef.current = sliderSad; }, [sliderSad]);
  useEffect(() => { sliderAngryRef.current = sliderAngry; }, [sliderAngry]);
  useEffect(() => { sliderSurpriseBrowsRef.current = sliderSurpriseBrows; }, [sliderSurpriseBrows]);
  useEffect(() => { sliderSurpriseRatioRef.current = sliderSurpriseRatio; }, [sliderSurpriseRatio]);

  useEffect(() => { selectedMeshRef.current = selectedMesh; }, [selectedMesh]);
  useEffect(() => { selectedFilterRef.current = selectedFilter; }, [selectedFilter]);

  useEffect(() => { gameActiveRef.current = gameActive; }, [gameActive]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { inGameLobbyRef.current = inGameLobby; }, [inGameLobby]);
  useEffect(() => { electricEnergyRef.current = electricEnergy; }, [electricEnergy]);
  useEffect(() => { electricWinStateRef.current = electricWinState; }, [electricWinState]);
  useEffect(() => { electricAnimDurationRef.current = electricAnimDuration; }, [electricAnimDuration]);

  // --- LÓGICA DEL MINIJUEGO DE BURBUJAS (MÓDULO 03) ---

  const spawnBubble = (canvasWidth: number, canvasHeight: number) => {
    const list = bubblesListRef.current;
    if (list.length >= 8) return;

    const colors = [
      "rgba(52, 211, 153, 0.75)", // Esmeralda
      "rgba(99, 102, 241, 0.75)",  // Indigo
      "rgba(244, 114, 182, 0.75)", // Rosa
      "rgba(56, 189, 248, 0.75)",  // Celeste
      "rgba(251, 191, 36, 0.75)",  // Ámbar
    ];

    list.push({
      x: Math.random() * (canvasWidth - 100) + 50,
      y: canvasHeight + Math.random() * 120 + 40,
      radius: Math.random() * 25 + 20,
      speedY: Math.random() * 1.8 + 1.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI,
    });
  };

  const createPopParticles = (x: number, y: number, color: string) => {
    const list = particlesListRef.current;
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 5 + 2.5;
      list.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        color,
      });
    }
  };

  const resetGame = (timeLimit?: number) => {
    const time = typeof timeLimit === 'number' ? timeLimit : initialTimeLimitRef.current;
    initialTimeLimitRef.current = time;
    console.log("[Workspace] Reiniciando partida con tiempo:", time);
    setScore(0);
    setTimeLeft(time);
    setGameActive(true);
    setShowGameOver(false);
    setElectricEnergy(0);
    setElectricWinState("playing");
    setElectricAnimDuration(0);

    bubblesListRef.current = [];
    particlesListRef.current = [];
    batteriesListRef.current = [];
    prevP1Ref.current = { x: 0, y: 0 };
    prevP2Ref.current = { x: 0, y: 0 };

    const emotionsList = ["Feliz", "Sorpresa", "Triste", "Molesto"];
    emotionsGameTargetRef.current = emotionsList[Math.floor(Math.random() * emotionsList.length)] as any;

    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        // Si ya ganamos y estamos en el menú de victoria o en las animaciones especiales de relámpago, pausamos el cronómetro
        if (electricWinStateRef.current !== "playing") {
          return prev;
        }
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    // Si ya ganamos el de pilas/rayos, evitamos que un temporizador huérfano interrumpa la gloria
    if (electricWinStateRef.current !== "playing") {
      return;
    }
    setGameActive(false);
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }

    const finalScore = scoreRef.current;
    setHighScore((prev) => {
      if (finalScore > prev) {
        try {
          localStorage.setItem("bubble_high_score", String(finalScore));
        } catch {}
        return finalScore;
      }
      return prev;
    });

    setShowGameOver(true);
  };

  useEffect(() => {
    if (activeModule === "BUBBLES") {
      setInGameLobby(true);
      setGameActive(false);
      setShowGameOver(false);
    } else {
      setGameActive(false);
      setShowGameOver(false);
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    }

    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    };
  }, [activeModule]);

  // --- AUDITORÍA DE MUESTRAS: GUARDAR LECTURA DE EMOCIÓN EN EL PADRE ---
  const handleSaveCurrentEmotion = (forcedEmotion?: string) => {
    if (!faceLandmarksRef.current) {
      console.warn("No se puede registrar coordenadas si no hay un rostro presente.");
      return;
    }
    const landmarks = faceLandmarksRef.current;

    // Estructuramos los 6 puntos clave en 3D requeridos para auditoría
    const keyPoints = {
      labioSup: { x: landmarks[13].x, y: landmarks[13].y, z: landmarks[13].z },
      labioInf: { x: landmarks[14].x, y: landmarks[14].y, z: landmarks[14].z },
      comisuraIzq: { x: landmarks[61].x, y: landmarks[61].y, z: landmarks[61].z },
      comisuraDer: { x: landmarks[291].x, y: landmarks[291].y, z: landmarks[291].z },
      cejaIzq: { x: landmarks[107].x, y: landmarks[107].y, z: landmarks[107].z },
      cejaDer: { x: landmarks[336].x, y: landmarks[336].y, z: landmarks[336].z },
    };

    let emotion = liveEmotion;
    let emoji = liveEmoji;

    if (forcedEmotion) {
      emotion = forcedEmotion;
      if (forcedEmotion === "Feliz") emoji = "😊";
      else if (forcedEmotion === "Sorpresa") emoji = "😲";
      else if (forcedEmotion === "Triste") emoji = "😢";
      else if (forcedEmotion === "Molesto") emoji = "😠";
      else if (forcedEmotion === "Neutro") emoji = "😐";
    }

    if (liveMetrics) {
      onSaveSample({
        emotion,
        emoji,
        metrics: liveMetrics,
        landmarks: keyPoints,
      });

      // ¡Calibración automatizada instantánea al vuelo para la comodidad absoluta del usuario!
      if (forcedEmotion === "Feliz") {
        const target = liveMetrics.rawCurvature - 0.002;
        setSliderSmile(Math.max(-0.04, Math.min(0.00, target)));
      } else if (forcedEmotion === "Sorpresa") {
        setSliderSurprise(Math.max(0.05, Math.min(0.25, liveMetrics.rawLipGap - 0.01)));
        setSliderSurpriseBrows(Math.max(0.18, Math.min(0.35, liveMetrics.rawBrowHeight - 0.01)));
        setSliderSurpriseRatio(Math.max(1.0, Math.min(2.2, liveMetrics.mouthRatio - 0.05)));
      } else if (forcedEmotion === "Triste") {
        setSliderSad(Math.max(0.01, Math.min(0.08, liveMetrics.rawCurvature + 0.003)));
      } else if (forcedEmotion === "Molesto") {
        setSliderAngry(Math.max(20, Math.min(80, Math.round(liveMetrics.browFurrow - 5))));
      }

      playSuccessSound();
    }
  };

  // Auto-calibrar sliders basados en una muestra histórica
  const handleTriggerAutoCalibrate = (id: number, emotionType: string) => {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;

    if (emotionType === "Feliz") {
      const target = sample.metrics.rawCurvature - 0.002;
      setSliderSmile(Math.max(-0.04, Math.min(0.00, target)));
    } else if (emotionType === "Sorpresa") {
      setSliderSurprise(Math.max(0.05, Math.min(0.25, sample.metrics.rawLipGap - 0.01)));
      setSliderSurpriseBrows(Math.max(0.18, Math.min(0.35, sample.metrics.rawBrowHeight - 0.01)));
      setSliderSurpriseRatio(Math.max(1.0, Math.min(2.2, sample.metrics.mouthRatio - 0.05)));
    } else if (emotionType === "Triste") {
      setSliderSad(Math.max(0.01, Math.min(0.08, sample.metrics.rawCurvature + 0.003)));
    } else if (emotionType === "Molesto") {
      setSliderAngry(Math.max(20, Math.min(80, Math.round(sample.metrics.browFurrow - 5))));
    }

    playSuccessSound();
  };

  const handleToggleSampleCoords = (id: number) => {
    onToggleSampleCoordsValue(id);
  };

  // Delegar de vuelta al padre
  const onToggleSampleCoordsValue = (id: number) => {
    // Actualización local para propulsar reactividad inmediata de la lista colapsable
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showCoords: !s.showCoords } : s))
    );
  };

  // --- SECCIÓN: ALGORITMOS DE DIBUJO E INTERPRETACIÓN ---

  // Lentes de Sol con efecto espejo
  const drawSunglasses = (ctx: CanvasRenderingContext2D, leftEye: { x: number; y: number }, rightEye: { x: number; y: number }, distance: number, angle: number) => {
    ctx.save();
    const centerX = (leftEye.x + rightEye.x) / 2;
    const centerY = (leftEye.y + rightEye.y) / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    const gWidth = distance * 2.1;
    const gHeight = distance * 0.65;

    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Montura
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#818cf8"; // Indigo 400
    ctx.lineWidth = 3;

    // Lente izquierdo
    ctx.beginPath();
    ctx.roundRect(-gWidth / 2 + 2, -gHeight / 2, gWidth / 2.2, gHeight, [4, 4, 15, 15]);
    ctx.fill();
    ctx.stroke();

    // Lente derecho
    ctx.beginPath();
    ctx.roundRect(4, -gHeight / 2, gWidth / 2.2, gHeight, [4, 4, 15, 15]);
    ctx.fill();
    ctx.stroke();

    // Puente de la nariz
    ctx.beginPath();
    ctx.moveTo(-10, -gHeight / 6);
    ctx.quadraticCurveTo(0, -gHeight / 3, 10, -gHeight / 6);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    // Reflejo blanco diagonal de los lentes
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";

    ctx.beginPath();
    ctx.moveTo(-gWidth / 2 + 12, -gHeight / 2 + 6);
    ctx.lineTo(-gWidth / 2 + 28, -gHeight / 2 + 6);
    ctx.lineTo(-gWidth / 2 + 12, gHeight / 2 - 12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, -gHeight / 2 + 6);
    ctx.lineTo(32, -gHeight / 2 + 6);
    ctx.lineTo(16, gHeight / 2 - 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Orejas de conejo adorables + nariz rosada y bigotes
  const drawBunnyFilter = (ctx: CanvasRenderingContext2D, headTop: { x: number; y: number }, noseTip: { x: number; y: number }, distance: number, angle: number) => {
    // 1. Orejas
    ctx.save();
    ctx.translate(headTop.x, headTop.y - distance * 0.15);
    ctx.rotate(angle);

    const earWidth = distance * 0.26;
    const earHeight = distance * 1.35;

    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = -2;

    // Oreja Izquierda
    ctx.save();
    ctx.translate(-distance * 0.28, -distance * 0.1);
    ctx.rotate(-0.08);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-earWidth, 0);
    ctx.bezierCurveTo(-earWidth * 1.2, -earHeight * 0.8, -earWidth * 0.5, -earHeight, 0, -earHeight);
    ctx.bezierCurveTo(earWidth * 0.5, -earHeight, earWidth * 1.2, -earHeight * 0.8, earWidth, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Centro de oreja rosa
    ctx.fillStyle = "#f472b6"; // pink-400
    ctx.beginPath();
    ctx.moveTo(-earWidth * 0.6, -5);
    ctx.bezierCurveTo(-earWidth * 0.8, -earHeight * 0.7, -earWidth * 0.3, -earHeight * 0.9, 0, -earHeight * 0.9);
    ctx.bezierCurveTo(earWidth * 0.3, -earHeight * 0.9, earWidth * 0.8, -earHeight * 0.7, earWidth * 0.6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Oreja Derecha
    ctx.save();
    ctx.translate(distance * 0.28, -distance * 0.1);
    ctx.rotate(0.08);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-earWidth, 0);
    ctx.bezierCurveTo(-earWidth * 1.2, -earHeight * 0.8, -earWidth * 0.5, -earHeight, 0, -earHeight);
    ctx.bezierCurveTo(earWidth * 0.5, -earHeight, earWidth * 1.2, -earHeight * 0.8, earWidth, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Centro rosa
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.moveTo(-earWidth * 0.6, -5);
    ctx.bezierCurveTo(-earWidth * 0.8, -earHeight * 0.7, -earWidth * 0.3, -earHeight * 0.9, 0, -earHeight * 0.9);
    ctx.bezierCurveTo(earWidth * 0.3, -earHeight * 0.9, earWidth * 0.8, -earHeight * 0.7, earWidth * 0.6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // 2. Nariz y Bigotes
    if (noseTip) {
      ctx.save();
      ctx.translate(noseTip.x, noseTip.y);
      ctx.rotate(angle);

      const noseWidth = distance * 0.20;
      const noseHeight = distance * 0.13;

      // Triángulo dulce
      ctx.fillStyle = "#fb7185"; // rose-400
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-noseWidth / 2, -noseHeight / 3);
      ctx.bezierCurveTo(-noseWidth / 2, -noseHeight, noseWidth / 2, -noseHeight, noseWidth / 2, -noseHeight / 3);
      ctx.bezierCurveTo(noseWidth / 2, noseHeight / 2, 0, noseHeight, 0, noseHeight);
      ctx.bezierCurveTo(0, noseHeight, -noseWidth / 2, noseHeight / 2, -noseWidth / 2, -noseHeight / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Brillo
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.beginPath();
      ctx.ellipse(-noseWidth * 0.15, -noseHeight * 0.3, noseWidth * 0.08, noseHeight * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tres bigotes blancos flotantes a cada lado
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";

      const wLength = distance * 0.75;
      const dY1 = distance * 0.06;
      const dY2 = distance * 0.16;

      // Izquierda
      ctx.beginPath();
      ctx.moveTo(-noseWidth * 0.25, noseHeight * 0.2);
      ctx.quadraticCurveTo(-distance * 0.3, -dY1, -wLength, -dY2);

      ctx.moveTo(-noseWidth * 0.25, noseHeight * 0.4);
      ctx.quadraticCurveTo(-distance * 0.3, noseHeight * 0.4, -wLength, noseHeight * 0.3);

      ctx.moveTo(-noseWidth * 0.25, noseHeight * 0.6);
      ctx.quadraticCurveTo(-distance * 0.3, dY1, -wLength, dY2);
      ctx.stroke();

      // Derecha
      ctx.beginPath();
      ctx.moveTo(noseWidth * 0.25, noseHeight * 0.2);
      ctx.quadraticCurveTo(distance * 0.3, -dY1, wLength, -dY2);

      ctx.moveTo(noseWidth * 0.25, noseHeight * 0.4);
      ctx.quadraticCurveTo(distance * 0.3, noseHeight * 0.4, wLength, noseHeight * 0.3);

      ctx.moveTo(noseWidth * 0.25, noseHeight * 0.6);
      ctx.quadraticCurveTo(distance * 0.3, dY1, wLength, dY2);
      ctx.stroke();

      ctx.restore();
    }
  };

  // Sombrero de Mago
  const drawHat = (ctx: CanvasRenderingContext2D, headTop: { x: number; y: number }, distance: number, angle: number) => {
    ctx.save();
    ctx.translate(headTop.x, headTop.y - distance * 0.12);
    ctx.rotate(angle);

    const hatWidth = distance * 1.35;
    const hatHeight = distance * 0.95;

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Ala del Sombrero
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -6, hatWidth * 0.7, distance * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Copa del Sombrero
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(-hatWidth * 0.45, -6);
    ctx.lineTo(-hatWidth * 0.5, -hatHeight);
    ctx.lineTo(hatWidth * 0.5, -hatHeight);
    ctx.lineTo(hatWidth * 0.45, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cinta roja
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ef4444"; // red-500
    ctx.beginPath();
    ctx.moveTo(-hatWidth * 0.46, -6);
    ctx.lineTo(-hatWidth * 0.47, -distance * 0.24);
    ctx.lineTo(hatWidth * 0.47, -distance * 0.24);
    ctx.lineTo(hatWidth * 0.46, -6);
    ctx.closePath();
    ctx.fill();

    // Hebilla dorada
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-distance * 0.12, -distance * 0.25, distance * 0.24, distance * 0.20, 4);
    ctx.fill();
    ctx.stroke();

    // Fondo de hebilla
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.roundRect(-distance * 0.06, -distance * 0.21, distance * 0.12, distance * 0.12, 2);
    ctx.fill();

    ctx.restore();
  };

  // Dibujar ojos láser almendrados (CyberMask)
  const drawCyberGlowEyeShape = (ctx: CanvasRenderingContext2D, landmarks: any[], indices: number[], width: number, height: number, eyeDistance: number) => {
    ctx.save();

    ctx.beginPath();
    let sumX = 0;
    let sumY = 0;

    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      sumX += x;
      sumY += y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const centerX = sumX / indices.length;
    const centerY = sumY / indices.length;
    const glowSize = eyeDistance * 0.24;

    ctx.save();
    ctx.clip(); // Limitar brillo al párpado

    const radialGlow = ctx.createRadialGradient(centerX, centerY, glowSize * 0.05, centerX, centerY, glowSize * 1.1);
    radialGlow.addColorStop(0, "#ffffff");
    radialGlow.addColorStop(0.35, "rgba(34, 211, 238, 0.95)"); // Cian 400
    radialGlow.addColorStop(0.75, "rgba(6, 182, 212, 0.45)");
    radialGlow.addColorStop(1, "rgba(6, 182, 212, 0)");

    ctx.fillStyle = radialGlow;
    ctx.fillRect(centerX - glowSize * 2, centerY - glowSize * 2, glowSize * 4, glowSize * 4);
    ctx.restore();

    // Contorno
    ctx.save();
    ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Destello horizontal fino (Lens Flare)
    ctx.save();
    const flareGrad = ctx.createLinearGradient(centerX - eyeDistance * 0.75, centerY, centerX + eyeDistance * 0.75, centerY);
    flareGrad.addColorStop(0, "rgba(6, 182, 212, 0)");
    flareGrad.addColorStop(0.5, "rgba(34, 211, 238, 0.8)");
    flareGrad.addColorStop(1, "rgba(6, 182, 212, 0)");

    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, eyeDistance * 0.75, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  // Dibujar ojos de lava incandescente (Fuego)
  const drawFieryEyeShape = (ctx: CanvasRenderingContext2D, landmarks: any[], indices: number[], width: number, height: number, eyeDistance: number) => {
    ctx.save();

    ctx.beginPath();
    let sumX = 0;
    let sumY = 0;

    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      sumX += x;
      sumY += y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const centerX = sumX / indices.length;
    const centerY = sumY / indices.length;
    const glowSize = eyeDistance * 0.24;

    ctx.save();
    ctx.clip(); // Limitar lava al interior

    const radialGlow = ctx.createRadialGradient(centerX, centerY, glowSize * 0.05, centerX, centerY, glowSize * 1.15);
    radialGlow.addColorStop(0, "#ffffff"); // Blanco-calor
    radialGlow.addColorStop(0.2, "#facc15");  // Amarillo oro
    radialGlow.addColorStop(0.5, "#f97316");  // Naranja brasa
    radialGlow.addColorStop(0.85, "#dc2626"); // Rojo llama
    radialGlow.addColorStop(1, "rgba(220, 38, 38, 0)");

    ctx.fillStyle = radialGlow;
    ctx.fillRect(centerX - glowSize * 2, centerY - glowSize * 2, glowSize * 4, glowSize * 4);
    ctx.restore();

    // Contorno volcánico
    ctx.save();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.0;
    ctx.shadowColor = "#dc2626";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Destello de calor horizontal
    ctx.save();
    const flareGrad = ctx.createLinearGradient(centerX - eyeDistance * 0.8, centerY, centerX + eyeDistance * 0.8, centerY);
    flareGrad.addColorStop(0, "rgba(220, 38, 38, 0)");
    flareGrad.addColorStop(0.5, "rgba(253, 224, 71, 0.85)");
    flareGrad.addColorStop(1, "rgba(220, 38, 38, 0)");

    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, eyeDistance * 0.8, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  // Dibujar ojos de tormenta eléctrica (Electro Amarillo Trueno)
  const drawElectricEyeShape = (ctx: CanvasRenderingContext2D, landmarks: any[], indices: number[], width: number, height: number, eyeDistance: number) => {
    ctx.save();

    ctx.beginPath();
    let sumX = 0;
    let sumY = 0;

    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      sumX += x;
      sumY += y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const centerX = sumX / indices.length;
    const centerY = sumY / indices.length;
    const glowSize = eyeDistance * 0.24;

    ctx.save();
    ctx.clip(); // Limitar electricidad al interior del ojo

    const radialGlow = ctx.createRadialGradient(centerX, centerY, glowSize * 0.05, centerX, centerY, glowSize * 1.15);
    radialGlow.addColorStop(0, "#ffffff"); // Centro blanco incandescente
    radialGlow.addColorStop(0.3, "#fef08a");  // Amarillo relámpago suave
    radialGlow.addColorStop(0.65, "#eab308");  // Amarillo trueno denso
    radialGlow.addColorStop(0.9, "#ca8a04"); // Ámbar/dorado eléctrico de borde
    radialGlow.addColorStop(1, "rgba(202, 138, 4, 0)");

    ctx.fillStyle = radialGlow;
    ctx.fillRect(centerX - glowSize * 2, centerY - glowSize * 2, glowSize * 4, glowSize * 4);
    ctx.restore();

    // Contorno eléctrico chispeante
    ctx.save();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2.0;
    ctx.shadowColor = "#eab308";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = (1 - pt.x) * width;
      const y = pt.y * height;
      
      // Jitter para dar un contorno de rayo vibrante
      const jitterRange = 1.5;
      const jX = (Math.random() - 0.5) * jitterRange;
      const jY = (Math.random() - 0.5) * jitterRange;

      if (i === 0) ctx.moveTo(x + jX, y + jY);
      else ctx.lineTo(x + jX, y + jY);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Destello de trueno horizontal vibrante
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const thunderFlare = ctx.createLinearGradient(centerX - eyeDistance * 0.8, centerY, centerX + eyeDistance * 0.8, centerY);
    thunderFlare.addColorStop(0, "rgba(234, 179, 8, 0)");
    thunderFlare.addColorStop(0.5, "rgba(255, 255, 255, 0.95)"); // Rayo de calor blanco central
    thunderFlare.addColorStop(1, "rgba(234, 179, 8, 0)");

    ctx.fillStyle = thunderFlare;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, eyeDistance * 0.8, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  // Dibujar máscara cyber-eléctrica de relámpago dorado (Copia de cyberMask súper cargada)
  const drawElectricCyberMask = (ctx: CanvasRenderingContext2D, face: any[], width: number, height: number, eyeDist: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(234, 179, 8, ${0.45 * alpha})`; // Amarillo voltio
    ctx.lineWidth = 0.85;

    const magmaY = ((Math.sin(Date.now() / 300) + 1) / 2) * height; // Oscilación rápida

    for (let i = 0; i < face.length - 12; i += 12) {
      const p1 = face[i];
      const p2 = face[i + 4];
      const p3 = face[i + 8];

      const x1 = (1 - p1.x) * width;
      const y1 = p1.y * height;
      const x2 = (1 - p2.x) * width;
      const y2 = p2.y * height;
      const x3 = (1 - p3.x) * width;
      const y3 = p3.y * height;

      const isClose = Math.abs(y1 - magmaY) < 40 || Math.abs(y2 - magmaY) < 40 || Math.abs(y3 - magmaY) < 40;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();

      ctx.fillStyle = isClose ? "rgba(254, 240, 138, 0.25)" : "rgba(234, 179, 8, 0.04)";
      ctx.fill();
      ctx.stroke();
    }

    // Ojos eléctricos amarillos
    const leftEyeIndices = [33, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163];
    const rightEyeIndices = [263, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390];
    drawElectricEyeShape(ctx, face, leftEyeIndices, width, height, eyeDist);
    drawElectricEyeShape(ctx, face, rightEyeIndices, width, height, eyeDist);

    // Escáner eléctrico horizontal rayado
    ctx.save();
    ctx.strokeStyle = "rgba(254, 240, 138, 0.95)";
    ctx.lineWidth = 3.0;
    ctx.shadowColor = "#eab308";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, magmaY);
    ctx.lineTo(width, magmaY);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // --- DIBUJADO DE MASCARA GUIA HOLOGRAFICA PARA EL ENTRENADOR DE EMOCIONES ---
  const drawChallengeHologram = (
    ctx: CanvasRenderingContext2D,
    face: any[],
    width: number,
    height: number,
    target: "Feliz" | "Sorpresa" | "Triste" | "Molesto",
    faceScale: number
  ) => {
    ctx.save();

    // 1. Calcular puntos de referencia estables alineados con la orientación
    const nose = face[4];
    const nX = (1 - nose.x) * width;
    const nY = nose.y * height;

    const leftEye = face[159];
    const rightEye = face[386];
    const mouthL = face[61];
    const mouthR = face[291];

    const leX = (1 - leftEye.x) * width;
    const leY = leftEye.y * height;
    const reX = (1 - rightEye.x) * width;
    const reY = rightEye.y * height;

    const mLx = (1 - mouthL.x) * width;
    const mLy = mouthL.y * height;
    const mRx = (1 - mouthR.x) * width;
    const mRy = mouthR.y * height;

    const eyeCtrX = (leX + reX) / 2;
    const eyeCtrY = (leY + reY) / 2;
    const mCtrX = (mLx + mRx) / 2;
    const mCtrY = (mLy + mRy) / 2;

    const faceW = faceScale * width;
    const faceH = faceScale * height;

    // Usar colores neón dependiendo del desafío
    let primaryColor = "rgba(16, 185, 129, 0.85)"; // Verde esmeralda por defecto
    let shadowColor = "#10b981";

    if (target === "Feliz") {
      primaryColor = "rgba(16, 185, 129, 0.9)"; // Verde para feliz
      shadowColor = "#10B981";
    } else if (target === "Sorpresa") {
      primaryColor = "rgba(6, 182, 212, 0.9)"; // Cian para sorpresa
      shadowColor = "#06b6d4";
    } else if (target === "Triste") {
      primaryColor = "rgba(239, 68, 68, 0.9)"; // Rojo para triste
      shadowColor = "#ef4444";
    } else if (target === "Molesto") {
      primaryColor = "rgba(234, 179, 8, 0.9)"; // Amarillo para enfado
      shadowColor = "#eab308";
    }

    ctx.strokeStyle = primaryColor;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);

    // A. Dibujar cejas sugeridas (Template holográfico)
    if (target === "Feliz") {
      // Cejas alegres, ligeramente arqueadas arriba (calibradas a altura natural)
      ctx.beginPath();
      ctx.arc(leX, leY - faceH * 0.17, faceW * 0.16, Math.PI, Math.PI * 1.8);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(reX, reY - faceH * 0.17, faceW * 0.16, Math.PI * 1.2, Math.PI * 2);
      ctx.stroke();

      // Ojos en arco (^ ^)
      ctx.lineWidth = 3.0;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(leX, leY + 2, faceW * 0.08, Math.PI, 0, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(reX, reY + 2, faceW * 0.08, Math.PI, 0, false);
      ctx.stroke();

      // Sonrisa feliz amplia y curva hacia arriba
      ctx.strokeStyle = "rgba(52, 211, 153, 0.95)"; // Esmeralda brillante
      ctx.beginPath();
      ctx.moveTo(mCtrX - faceW * 0.20, mCtrY - faceH * 0.05);
      ctx.quadraticCurveTo(mCtrX, mCtrY + faceH * 0.13, mCtrX + faceW * 0.20, mCtrY - faceH * 0.05);
      ctx.stroke();

    } else if (target === "Sorpresa") {
      // Cejas arqueadas altas pero realistas (calibradas a un rango cómodo y alcanzable)
      ctx.beginPath();
      ctx.arc(leX, leY - faceH * 0.22, faceW * 0.16, Math.PI * 0.9, Math.PI * 1.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(reX, reY - faceH * 0.22, faceW * 0.16, Math.PI * 1.1, Math.PI * 2.1);
      ctx.stroke();

      // Ojos circulares muy abiertos
      ctx.beginPath();
      ctx.arc(leX, leY, faceW * 0.08, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(reX, reY, faceW * 0.08, 0, Math.PI * 2);
      ctx.stroke();

      // Boca circular en 'O' grande
      ctx.strokeStyle = "rgba(34, 211, 238, 0.95)"; // Cian brillante
      ctx.beginPath();
      ctx.ellipse(mCtrX, mCtrY, faceW * 0.12, faceH * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();

    } else if (target === "Triste") {
      // Cejas tristes inclinadas a altura realista
      ctx.beginPath();
      ctx.moveTo(leX - faceW * 0.14, leY - faceH * 0.14);
      ctx.lineTo(leX + faceW * 0.1, leY - faceH * 0.19);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(reX - faceW * 0.1, reY - faceH * 0.19);
      ctx.lineTo(reX + faceW * 0.14, reY - faceH * 0.14);
      ctx.stroke();

      // Ojos caídos
      ctx.beginPath();
      ctx.moveTo(leX - faceW * 0.08, leY);
      ctx.quadraticCurveTo(leX, leY - faceH * 0.04, leX + faceW * 0.08, leY);
      ctx.lineTo(leX - faceW * 0.08, leY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(reX - faceW * 0.08, reY);
      ctx.quadraticCurveTo(reX, reY - faceH * 0.04, reX + faceW * 0.08, reY);
      ctx.lineTo(reX - faceW * 0.08, reY);
      ctx.stroke();

      // Boca triste caída
      ctx.strokeStyle = "rgba(244, 114, 182, 0.95)"; // Rosa triste
      ctx.beginPath();
      ctx.moveTo(mCtrX - faceW * 0.17, mCtrY + faceH * 0.05);
      ctx.quadraticCurveTo(mCtrX, mCtrY - faceH * 0.03, mCtrX + faceW * 0.17, mCtrY + faceH * 0.05);
      ctx.stroke();

    } else if (target === "Molesto") {
      // Cejas enojadas inclinadas hacia el entrecejo con alturas perfectamente humanas y alcanzables
      ctx.beginPath();
      ctx.moveTo(leX - faceW * 0.14, leY - faceH * 0.18);
      ctx.lineTo(leX + faceW * 0.09, leY - faceH * 0.125);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(reX - faceW * 0.09, reY - faceH * 0.125);
      ctx.lineTo(reX + faceW * 0.14, reY - faceH * 0.18);
      ctx.stroke();

      // Ojos achicados / firmes
      ctx.beginPath();
      ctx.moveTo(leX - faceW * 0.08, leY + 2);
      ctx.lineTo(leX + faceW * 0.08, leY - 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(reX - faceW * 0.08, reY - 2);
      ctx.lineTo(reX + faceW * 0.08, reY + 2);
      ctx.stroke();

      // Boca tensa plana
      ctx.strokeStyle = "rgba(234, 179, 8, 0.95)";
      ctx.beginPath();
      ctx.rect(mCtrX - faceW * 0.15, mCtrY - faceH * 0.02, faceW * 0.30, faceH * 0.04);
      ctx.stroke();
    }

    // Circunferencia HUD de alineación
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(nX, nY, faceH * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Textos del Holograma
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 9px var(--font-mono)";
    ctx.textAlign = "center";
    ctx.fillText(`⚡ GESTO OBJECTIVO: ${target.toUpperCase()}`, nX, nY - faceH * 0.82);
    ctx.fillText("ALINEA TU ROSTRO CON EL MOLDE", nX, nY + faceH * 0.85);

    ctx.restore();
  };

  // --- RENDERING CANVAS LOOP (SISTEMA INTEGRADO) ---
  useEffect(() => {
    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext("2d");

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Dibujar video espejo retroalimentación de cámara
      const video = videoElementRef.current;
      if (video && (video.readyState >= 2 || video.videoWidth > 0)) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();
      } else {
        // Fondo degradado oscuro mientras carga la señal
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#94a3b8"; // slate-400
        ctx.font = "bold 13px Inter";
        ctx.textAlign = "center";
        ctx.fillText("Estableciendo enlace de video biométrico...", width / 2, height / 2);

        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Obtener dedo índice del sensor si hay señal para colisión o activación interactiva
      const rawHands = handLandmarksRef.current;
      let pointerX = -100;
      let pointerY = -100;
      let hasPointer = false;

      let singleHand = null;
      if (rawHands) {
        if (Array.isArray(rawHands)) {
          if (rawHands.length > 0) {
            singleHand = rawHands[0];
          }
        } else if (rawHands.length > 8) {
          singleHand = rawHands;
        }
      }

      if (singleHand && singleHand.length > 8) {
        const indexFingerTip = singleHand[8]; // Punto clave 8 es el extremo del índice
        pointerX = (1 - indexFingerTip.x) * width;
        pointerY = indexFingerTip.y * height;
        hasPointer = true;
      }

      // --- COMPORTAMIENTOS DINÁMICOS POR MÓDULO ---

      // MÓDULO 1: FILTROS + INTERACTIVIDAD FLUIDA
      if (activeModule === "FILTERS") {
        // Línea divisora
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Banner Ingeniería
        ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
        ctx.beginPath();
        ctx.roundRect(15, 15, 95, 24, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px Inter";
        ctx.textAlign = "center";
        ctx.fillText("INGENIERÍA", 15 + 47.5, 15 + 15);

        // Banner Comercial
        ctx.fillStyle = "rgba(236, 72, 153, 0.9)";
        ctx.beginPath();
        ctx.roundRect(width - 110, 15, 95, 24, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("COMERCIAL", width - 110 + 47.5, 15 + 15);

        // --- BOTONES VIRTUALES IZQUIERDOS (INGENIERÍA) ---
        const leftButtons = [
          { id: "clasico", emoji: "🧬", label: "Clásico" },
          { id: "biolum", emoji: "🦠", label: "Biolum" },
          { id: "cyber", emoji: "🤖", label: "Cyber" },
          { id: "fuego", emoji: "🔥", label: "Fuego" },
          { id: "electrico", emoji: "⚡", label: "Electro" },
        ];

        leftButtons.forEach((btn, idx) => {
          const btnX = (width / 2) * (0.10 + idx * 0.20);
          const btnY = 50;
          const btnR = 21;

          let isHovered = false;
          if (hasPointer) {
            const dist = Math.sqrt(Math.pow(pointerX - btnX, 2) + Math.pow(pointerY - btnY, 2));
            if (dist < btnR) isHovered = true;
          }

          const hoverMap = hoverTimersRef.current;
          if (isHovered) {
            hoverMap[btn.id] = Math.min(hoverMap[btn.id] + 1, 35);
            if (hoverMap[btn.id] === 35 && selectedMeshRef.current !== btn.id) {
              setSelectedMesh(btn.id as MeshType);
              playSuccessSound();
            }
          } else {
            hoverMap[btn.id] = Math.max(hoverMap[btn.id] - 1.5, 0);
          }

          // Dibujar circulo del botón
          const active = selectedMeshRef.current === btn.id;
          ctx.save();
          ctx.shadowColor = active ? "rgba(99, 102, 241, 0.5)" : "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = active
            ? "rgba(99, 102, 241, 0.95)"
            : isHovered
            ? "rgba(30, 41, 59, 0.85)"
            : "rgba(15, 23, 42, 0.65)";
          ctx.strokeStyle = active ? "#ffffff" : "rgba(255,255,255,0.18)";
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Dibujar emoji
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px Inter";
          ctx.fillText(btn.emoji, btnX, btnY + 4.5);

          // Etiqueta
          ctx.fillStyle = active ? "#a5b4fc" : "rgba(255, 255, 255, 0.75)";
          ctx.font = "bold 8px Inter";
          ctx.fillText(btn.label, btnX, btnY + btnR + 10);

          // Anillo progreso circular de hover automático
          if (hoverMap[btn.id] > 0) {
            const progress = hoverMap[btn.id] / 35;
            ctx.strokeStyle = "#6366f1";
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(btnX, btnY, btnR + 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
          }
          ctx.restore();
        });

        // --- BOTONES VIRTUALES DERECHOS (COMERCIAL) ---
        const rightButtons = [
          { id: "lentes", emoji: "👓", label: "Lentes" },
          { id: "orejas", emoji: "🐰", label: "Conejo" },
          { id: "sombrero", emoji: "🎩", label: "Gorr." },
          { id: "todo", emoji: "✨", label: "Todo" },
          { id: "limpiar", emoji: "❌", label: "Limp." },
        ];

        rightButtons.forEach((btn, idx) => {
          const rightSideW = width / 2;
          const btnX = width / 2 + rightSideW * (0.10 + idx * 0.20);
          const btnY = 50;
          const btnR = 21;

          let isHovered = false;
          if (hasPointer) {
            const dist = Math.sqrt(Math.pow(pointerX - btnX, 2) + Math.pow(pointerY - btnY, 2));
            if (dist < btnR) isHovered = true;
          }

          const hoverMap = hoverTimersRef.current;
          if (isHovered) {
            hoverMap[btn.id] = Math.min(hoverMap[btn.id] + 1, 35);
            if (hoverMap[btn.id] === 35 && selectedFilterRef.current !== btn.id) {
              setSelectedFilter(btn.id as FilterType);
              playSuccessSound();
            }
          } else {
            hoverMap[btn.id] = Math.max(hoverMap[btn.id] - 1.5, 0);
          }

          // Dibujar circulo del botón
          const active = selectedFilterRef.current === btn.id;
          ctx.save();
          ctx.shadowColor = active ? "rgba(236, 72, 153, 0.5)" : "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = active
            ? "rgba(236, 72, 153, 0.95)"
            : isHovered
            ? "rgba(30, 41, 59, 0.85)"
            : "rgba(15, 23, 42, 0.65)";
          ctx.strokeStyle = active ? "#ffffff" : "rgba(255,255,255,0.18)";
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Dibujar emoji
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px Inter";
          ctx.fillText(btn.emoji, btnX, btnY + 4.5);

          // Etiqueta
          ctx.fillStyle = active ? "#f472b6" : "rgba(255, 255, 255, 0.75)";
          ctx.font = "bold 8px Inter";
          ctx.fillText(btn.label, btnX, btnY + btnR + 10);

          // Anillo progreso circular de hover automático
          if (hoverMap[btn.id] > 0) {
            const progress = hoverMap[btn.id] / 35;
            ctx.strokeStyle = "#10b981"; // emerald-500
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(btnX, btnY, btnR + 3.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
          }
          ctx.restore();
        });

        // --- SUB-DIBUJO DE MUESTRA FACIAL EN FILTERS ---
        const face = faceLandmarksRef.current;
        if (face && face.length > 0) {
          const noseGlobal = { x: (1 - face[4].x) * width, y: face[4].y * height };
          let headSpeed = 0;
          if (prevNoseRef.current) {
            const dx = noseGlobal.x - prevNoseRef.current.x;
            const dy = noseGlobal.y - prevNoseRef.current.y;
            headSpeed = Math.sqrt(dx * dx + dy * dy);
          }
          prevNoseRef.current = { x: noseGlobal.x, y: noseGlobal.y };

          const leftEyeRef = { x: (1 - face[33].x) * width, y: face[33].y * height };
          const rightEyeRef = { x: (1 - face[263].x) * width, y: face[263].y * height };
          const eyeDist = Math.sqrt(Math.pow(rightEyeRef.x - leftEyeRef.x, 2) + Math.pow(rightEyeRef.y - leftEyeRef.y, 2));

          const meshType = selectedMeshRef.current;
          const filterType = selectedFilterRef.current;

          // LADO DE INGENIERÍA (Izquierdo)
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, width / 2, height);
          ctx.clip();

          // A. Clásico - Malla Oficial de MediaPipe de Alta Fidelidad + Esqueleto de Manos Completo
          if (meshType === "clasico") {
            // Dibujar lineas de la cara en una sola pasada para optima velocidad (Rendering Batching)
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            for (let i = 0; i < face.length; i++) {
              const pt1 = face[i];
              const p1X = (1 - pt1.x) * width;
              const p1Y = pt1.y * height;

              // Conexión secuencial (contornos de la cara)
              const pt2 = face[(i + 1) % face.length];
              ctx.moveTo(p1X, p1Y);
              ctx.lineTo((1 - pt2.x) * width, pt2.y * height);

              // Conexiones transversales para formar una malla 3D de alta densidad (optimizado en saltos selectivos para evitar lag)
              if (i % 2 === 0) {
                const pt3 = face[(i + 7) % face.length];
                ctx.moveTo(p1X, p1Y);
                ctx.lineTo((1 - pt3.x) * width, pt3.y * height);

                const pt4 = face[(i + 13) % face.length];
                ctx.moveTo(p1X, p1Y);
                ctx.lineTo((1 - pt4.x) * width, pt4.y * height);
              }
            }
            ctx.stroke();

            // Dibujar TODOS los puntos de la cara como una densa red de nodos cian resplandecientes (como la imagen oficial)
            ctx.fillStyle = "#00d2ff"; // cyan / light blue
            ctx.beginPath();
            for (let i = 0; i < face.length; i++) {
              const pt = face[i];
              const px = (1 - pt.x) * width;
              const py = pt.y * height;
              ctx.moveTo(px + 1.2, py);
              ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            }
            ctx.fill();

            // Dibujar malla tradicional de las manos si se detectan (MediaPipe Skeletal Engineering)
            if (rawHands) {
              const handsList = Array.isArray(rawHands) ? rawHands : [rawHands];
              handsList.forEach((hand) => {
                if (hand && hand.length > 0) {
                  const connectJoints = (idx1: number, idx2: number) => {
                    const pt1 = hand[idx1];
                    const pt2 = hand[idx2];
                    if (pt1 && pt2) {
                      ctx.moveTo((1 - pt1.x) * width, pt1.y * height);
                      ctx.lineTo((1 - pt2.x) * width, pt2.y * height);
                    }
                  };

                  ctx.save();
                  // Líneas blancas nítidas con resplandor neón celeste de fondo
                  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
                  ctx.lineWidth = 1.8;
                  ctx.shadowColor = "#00d2ff";
                  ctx.shadowBlur = 6;
                  ctx.beginPath();

                  // Segmentar dedos y carpo de las manos en un único trazado súper veloz
                  // Pulgar
                  connectJoints(0, 1); connectJoints(1, 2); connectJoints(2, 3); connectJoints(3, 4);
                  // Índice
                  connectJoints(0, 5); connectJoints(5, 6); connectJoints(6, 7); connectJoints(7, 8);
                  // Medio
                  connectJoints(0, 9); connectJoints(9, 10); connectJoints(10, 11); connectJoints(11, 12);
                  // Anular
                  connectJoints(0, 13); connectJoints(13, 14); connectJoints(14, 15); connectJoints(15, 16);
                  // Meñique
                  connectJoints(0, 17); connectJoints(17, 18); connectJoints(18, 19); connectJoints(19, 20);
                  // Palma
                  connectJoints(5, 9); connectJoints(9, 13); connectJoints(13, 17);

                  ctx.stroke();
                  ctx.restore();

                  // Dibujar los 21 puntos clave de articulaciones
                  ctx.save();
                  ctx.fillStyle = "#00d2ff";
                  ctx.shadowColor = "#00d2ff";
                  ctx.shadowBlur = 8;
                  ctx.beginPath();
                  for (let i = 0; i < hand.length; i++) {
                    const pt = hand[i];
                    if (pt) {
                      const hX = (1 - pt.x) * width;
                      const hY = pt.y * height;
                      ctx.moveTo(hX + 3.8, hY);
                      ctx.arc(hX, hY, 3.8, 0, Math.PI * 2);
                    }
                  }
                  ctx.fill();

                  // Centro blanco cristalino brillante
                  ctx.fillStyle = "#ffffff";
                  ctx.shadowBlur = 0;
                  ctx.beginPath();
                  for (let i = 0; i < hand.length; i++) {
                    const pt = hand[i];
                    if (pt) {
                      const hX = (1 - pt.x) * width;
                      const hY = pt.y * height;
                      ctx.moveTo(hX + 1.2, hY);
                      ctx.arc(hX, hY, 1.2, 0, Math.PI * 2);
                    }
                  }
                  ctx.fill();
                  ctx.restore();
                }
              });
            }
          }

          // B. Biolum
          else if (meshType === "biolum") {
            ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
            ctx.lineWidth = 0.7;
            for (let i = 0; i < face.length; i += 5) {
              const pt1 = face[i];
              const pt2 = face[(i + 5) % face.length];
              ctx.beginPath();
              ctx.moveTo((1 - pt1.x) * width, pt1.y * height);
              ctx.lineTo((1 - pt2.x) * width, pt2.y * height);
              ctx.stroke();
            }

            // Nodos bioluminiscentes pulsantes
            ctx.save();
            const pulseT = Date.now() / 180;
            for (let i = 0; i < face.length; i += 8) {
              const pt = face[i];
              const cx = (1 - pt.x) * width;
              const cy = pt.y * height;
              const sz = 1.5 + Math.sin(pulseT + i) * 1.5;
              const alpha = 0.4 + Math.sin(pulseT + i) * 0.3;

              ctx.shadowColor = "#10b981";
              ctx.shadowBlur = 8;
              ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
              ctx.beginPath();
              ctx.arc(cx, cy, 2.5 + sz, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Emitir esporas bioluminiscentes
            if (Math.random() < 0.2) {
              const rndPt = face[Math.floor(Math.random() * face.length)];
              if (sporesListRef.current.length > 80) sporesListRef.current.shift();
              sporesListRef.current.push({
                x: (1 - rndPt.x) * width,
                y: rndPt.y * height,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 1.1 - 0.4,
                size: Math.random() * 3 + 1,
                alpha: 1.0,
                decay: 0.009 + Math.random() * 0.005,
                color: Math.random() > 0.5 ? "#10b981" : "#06b6d4",
              });
            }
          }

          // C. CyberMask 🤖
          else if (meshType === "cyber") {
            const scannerY = ((Math.sin(Date.now() / 900) + 1) / 2) * height;

            ctx.save();
            ctx.globalCompositeOperation = "screen";
            
            // Usamos solo un subconjunto de puntos (1 de cada 4) para el efecto plexus
            const activeNodes = [];
            for (let i = 0; i < face.length; i += 4) {
              activeNodes.push({
                x: (1 - face[i].x) * width,
                y: face[i].y * height
              });
            }

            // Dibujar puntos y líneas de la malla Plexus
            for (let i = 0; i < activeNodes.length; i++) {
              const node = activeNodes[i];
              const isCloseToScanner = Math.abs(node.y - scannerY) < 35;
              
              // Puntos (Brillan más cuando pasa el escáner)
              ctx.fillStyle = isCloseToScanner ? "rgba(6, 182, 212, 0.95)" : "rgba(6, 182, 212, 0.5)";
              ctx.beginPath();
              ctx.arc(node.x, node.y, isCloseToScanner ? 1.8 : 1.0, 0, Math.PI * 2);
              ctx.fill();

              // Líneas conectoras
              ctx.lineWidth = isCloseToScanner ? 1.2 : 0.5;
              ctx.strokeStyle = isCloseToScanner ? "rgba(6, 182, 212, 0.7)" : "rgba(6, 182, 212, 0.35)";
              
              for (let j = i + 1; j < activeNodes.length; j++) {
                const nodeB = activeNodes[j];
                const dx = node.x - nodeB.x;
                const dy = node.y - nodeB.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Conectar solo los nodos cercanos proporcionalmente a la cara
                if (dist < eyeDist * 0.35) {
                  ctx.beginPath();
                  ctx.moveTo(node.x, node.y);
                  ctx.lineTo(nodeB.x, nodeB.y);
                  ctx.stroke();
                }
              }
            }
            ctx.restore();

            // Ojos láser
            const leftEyeIndices = [33, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163];
            const rightEyeIndices = [263, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390];
            drawCyberGlowEyeShape(ctx, face, leftEyeIndices, width, height, eyeDist);
            drawCyberGlowEyeShape(ctx, face, rightEyeIndices, width, height, eyeDist);

            // Escáner láser vertical
            ctx.save();
            ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#06b6d4";
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(0, scannerY);
            ctx.lineTo(width / 2, scannerY);
            ctx.stroke();
            ctx.restore();
          }

          // D. Fuego 🔥
          else if (meshType === "fuego") {
            ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
            ctx.lineWidth = 0.85;

            const magmaY = ((Math.sin(Date.now() / 700) + 1) / 2) * height;

            for (let i = 0; i < face.length - 12; i += 12) {
              const p1 = face[i];
              const p2 = face[i + 4];
              const p3 = face[i + 8];

              const x1 = (1 - p1.x) * width;
              const y1 = p1.y * height;
              const x2 = (1 - p2.x) * width;
              const y2 = p2.y * height;
              const x3 = (1 - p3.x) * width;
              const y3 = p3.y * height;

              const isClose = Math.abs(y1 - magmaY) < 35 || Math.abs(y2 - magmaY) < 35 || Math.abs(y3 - magmaY) < 35;

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.lineTo(x3, y3);
              ctx.closePath();

              ctx.fillStyle = isClose ? "rgba(253, 224, 71, 0.22)" : "rgba(220, 38, 38, 0.05)";
              ctx.fill();
              ctx.stroke();
            }

            // Cabello llameante (partículas de fuego ascendente con mezcla aditiva)
            const topIndices = [10, 109, 338, 67, 297, 103, 332, 54, 284, 21, 251];
            if (Math.random() < 0.8) {
              const headCenterX = (1 - face[10].x) * width; // Punto central del cabello superior

              topIndices.forEach((idx) => {
                if (Math.random() > 0.3) return; // Solo 30% de probabilidad por punto por frame para evitar saturación
                const pt = face[idx];
                const hX = (1 - pt.x) * width;
                const hY = pt.y * height;

                if (sporesListRef.current.length > 500) sporesListRef.current.shift();
                sporesListRef.current.push({
                  x: hX + (Math.random() - 0.5) * (eyeDist * 0.15), // Mucho más centrado en el punto
                  y: hY - Math.random() * 3, // Nace casi exactamente en el punto superior
                  vx: (Math.random() - 0.5) * 0.8,
                  vy: -Math.random() * 3 - 1.5,
                  size: Math.random() * (eyeDist * 0.08) + (eyeDist * 0.04), // 💥 TAMAÑO MINÚSCULO (Aprox 5-12px)
                  alpha: 0.5 + Math.random() * 0.3, // Menos opaco para evitar blob blanco
                  decay: Math.random() * 0.015 + 0.01,
                  colorType: "fire",
                  r: 255,
                  g: Math.floor(Math.random() * 60 + 30), // Más rojo
                  b: 0,
                  targetX: headCenterX
                });
              });
            }

            // Ojos de lava
            const leftEyeIndices = [33, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163];
            const rightEyeIndices = [263, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390];
            drawFieryEyeShape(ctx, face, leftEyeIndices, width, height, eyeDist);
            drawFieryEyeShape(ctx, face, rightEyeIndices, width, height, eyeDist);

            // Escáner de calor magma horizontal
            ctx.save();
            ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#f97316";
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(0, magmaY);
            ctx.lineTo(width / 2, magmaY);
            ctx.stroke();
            ctx.restore();
          }

          // E. Electrizante ⚡
          else if (meshType === "electrico") {
            ctx.strokeStyle = "rgba(234, 179, 8, 0.35)"; // Gold/yellow electric mesh lines
            ctx.lineWidth = 0.85;

            const electricY = ((Math.sin(Date.now() / 500) + 1) / 2) * height;

            // Draw electric facial contours and triangles
            for (let i = 0; i < face.length - 12; i += 12) {
              const p1 = face[i];
              const p2 = face[i + 4];
              const p3 = face[i + 8];

              const x1 = (1 - p1.x) * width;
              const y1 = p1.y * height;
              const x2 = (1 - p2.x) * width;
              const y2 = p2.y * height;
              const x3 = (1 - p3.x) * width;
              const y3 = p3.y * height;

              const isClose = Math.abs(y1 - electricY) < 35 || Math.abs(y2 - electricY) < 35 || Math.abs(y3 - electricY) < 35;

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.lineTo(x3, y3);
              ctx.closePath();

              // Glowing yellow-gold fill if close to scanline, subtle golden/translucent yellow otherwise
              ctx.fillStyle = isClose ? "rgba(250, 204, 21, 0.22)" : "rgba(202, 138, 4, 0.05)";
              ctx.fill();
              ctx.stroke();
            }

            // CORONA DE RAYOS ACTIVA (Bordes del cabello cargados con relámpagos reales) - OPTIMIZACION DE RENDIMIENTO EXCEPCIONAL
            const topIndices = [10, 109, 338, 67, 297, 103, 332, 54, 284, 21, 251];
            
            // Dibujar destellos de rayos de la corona sutiles pero de alto impacto visual
            if (Math.random() < 0.12) {
              const idx = topIndices[Math.floor(Math.random() * topIndices.length)];
              const pt = face[idx];
              const hX = (1 - pt.x) * width;
              const hY = pt.y * height;

              ctx.save();
              ctx.globalCompositeOperation = "screen";
              ctx.strokeStyle = "#ffffff"; // Núcleo blanco
              ctx.lineWidth = 1.8;
              ctx.shadowColor = "#06b6d4"; // Resplandor cian plasma
              ctx.shadowBlur = 12;

              ctx.beginPath();
              ctx.moveTo(hX, hY);

              const steps = 4;
              const rayLength = (eyeDist * 0.75) * (0.8 + Math.random() * 0.5);
              for (let s = 1; s <= steps; s++) {
                const targetY = hY - (rayLength * s) / steps;
                const targetX = hX + (Math.random() - 0.5) * 20;
                ctx.lineTo(targetX, targetY);
              }
              ctx.stroke();

              // Brillo amarillo trueno secundario
              ctx.strokeStyle = "rgba(234, 179, 8, 0.45)";
              ctx.lineWidth = 3.5;
              ctx.stroke();
              ctx.restore();
            }

            // Lluvia de electrones en el cabello: Emisión de esporas de plasma de alta velocidad (Optimizada)
            if (Math.random() < 0.28) {
              const idx = topIndices[Math.floor(Math.random() * topIndices.length)];
              const pt = face[idx];
              const hX = (1 - pt.x) * width;
              const hY = pt.y * height;

              if (sporesListRef.current.length > 80) sporesListRef.current.shift();
              sporesListRef.current.push({
                x: hX + (Math.random() - 0.5) * (eyeDist * 0.35),
                y: hY - Math.random() * 4,
                vx: (Math.random() - 0.5) * 3.0, 
                vy: -Math.random() * 9.0 - 5.0,  // Velocidad extrema hacia arriba
                size: Math.random() * (eyeDist * 0.12) + (eyeDist * 0.05),
                alpha: 1.0,
                decay: 0.05 + Math.random() * 0.03, // Decaimiento rápido
                colorType: "electric",
              });
            }

            // Ojos de tormenta eléctrica (Electro Amarillo Trueno)
            const leftEyeIndices = [33, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163];
            const rightEyeIndices = [263, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390];
            drawElectricEyeShape(ctx, face, leftEyeIndices, width, height, eyeDist);
            drawElectricEyeShape(ctx, face, rightEyeIndices, width, height, eyeDist);

            // Escáner horizontal de relámpago
            ctx.save();
            ctx.strokeStyle = "rgba(253, 224, 71, 0.95)"; // Amarillo neón relámpago
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#eab308";
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.moveTo(0, electricY);
            ctx.lineTo(width / 2, electricY);
            ctx.stroke();
            ctx.restore();

            // Descargas eléctricas aleatorias (relámpagos que conectan puntos de la cara)
            ctx.save();
            ctx.strokeStyle = "#ffffff"; // núcleo blanco caliente
            ctx.lineWidth = 1.5;
            ctx.shadowColor = "#eab308"; // resplandor amarillo
            ctx.shadowBlur = 12;

            if (Math.random() < 0.7) {
              const numBolts = Math.floor(Math.random() * 3) + 1;
              for (let b = 0; b < numBolts; b++) {
                const startIdx = Math.floor(Math.random() * face.length);
                const endIdx = (startIdx + 15 + Math.floor(Math.random() * 30)) % face.length;

                const startFacePt = face[startIdx];
                const endFacePt = face[endIdx];

                const sX = (1 - startFacePt.x) * width;
                const sY = startFacePt.y * height;
                const eX = (1 - endFacePt.x) * width;
                const eY = endFacePt.y * height;

                ctx.beginPath();
                ctx.moveTo(sX, sY);

                const segments = 6;
                for (let s = 1; s < segments; s++) {
                  const targetSegmentX = sX + (eX - sX) * (s / segments);
                  const targetSegmentY = sY + (eY - sY) * (s / segments);

                  const jitterRange = 15;
                  const jitterX = (Math.random() - 0.5) * jitterRange;
                  const jitterY = (Math.random() - 0.5) * jitterRange;

                  ctx.lineTo(targetSegmentX + jitterX, targetSegmentY + jitterY);
                }

                ctx.lineTo(eX, eY);
                ctx.stroke();
              }
            }
            ctx.restore();
          }

          // Dibujar y decaer esporas/llamas
          const spores = sporesListRef.current;
          for (let i = spores.length - 1; i >= 0; i--) {
            const sp = spores[i];
            
            // Física específica para las llamas aditivas (fuego)
            if (sp.colorType === "fire") {
              const target = sp.targetX || width / 4;
              if (sp.x < target) {
                sp.vx += 0.015; // Suave tracción al centro
              } else {
                sp.vx -= 0.015;
              }
              sp.size -= 0.15; // Reducción lenta proporcional a su nuevo tamaño minúsculo
            }

            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.alpha -= sp.decay;

            // Limpieza de partículas muertas
            if (sp.alpha <= 0 || sp.x > width / 2 || sp.size <= 0) {
              spores.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.globalAlpha = sp.alpha;

            if (sp.colorType) {
              ctx.globalCompositeOperation = "screen";

              if (sp.colorType === "electric") {
                // Rápido y elegante filamento o rayo lineal compacto
                ctx.save();
                ctx.strokeStyle = "rgba(6, 182, 212, 0.85)"; // cian plasma
                ctx.lineWidth = 1.3 * sp.alpha;
                ctx.beginPath();
                ctx.moveTo(sp.x, sp.y);
                ctx.lineTo(sp.x + (Math.random() - 0.5) * 5, sp.y + sp.vy * 0.7); // línea de velocidad
                ctx.stroke();

                // Núcleo brillante amarillo/blanco
                ctx.fillStyle = "rgba(255, 255, 180, 0.95)";
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, 1.8 * sp.alpha, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              } else if (sp.colorType === "fire") {
                // Fuego denso con mezcla aditiva y gradiente radial (Adaptado)
                ctx.globalCompositeOperation = "lighter";
                const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, Math.max(0.1, sp.size));
                grad.addColorStop(0, `rgba(${sp.r}, ${sp.g}, ${sp.b}, ${sp.alpha})`);
                grad.addColorStop(1, `rgba(${sp.r}, ${sp.g}, ${sp.b}, 0)`);
                
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, Math.max(0.1, sp.size), 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
              } else {
                let hue = 15; // Red
                if (sp.colorType === "orange") hue = 32;
                if (sp.colorType === "yellow") hue = 50;

                // Glowing outer halo (súper veloz en GPU)
                ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${sp.alpha * 0.25})`;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size * sp.alpha * 1.5, 0, Math.PI * 2);
                ctx.fill();

                // Núcleo central incandescente
                ctx.fillStyle = `hsla(${hue + 10}, 100%, 85%, ${sp.alpha})`;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size * sp.alpha * 0.65, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              // Estilo bioluminiscente estándar optimizado sin shadowBlur lento por partícula
              ctx.fillStyle = sp.color || "#10b981";
              
              // Aura suave
              ctx.globalAlpha = sp.alpha * 0.3;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size * 1.7, 0, Math.PI * 2);
              ctx.fill();
              
              // Núcleo brillante
              ctx.globalAlpha = sp.alpha;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          ctx.restore(); // Termina clipping izquierdo

          // LADO DE PRODUCTO COMERCIAL (Derecho)
          ctx.save();
          ctx.beginPath();
          ctx.rect(width / 2, 0, width / 2, height);
          ctx.clip();

          const headTop = { x: (1 - face[10].x) * width, y: face[10].y * height };
          const nose = { x: (1 - face[4].x) * width, y: face[4].y * height };

          const dx = rightEyeRef.x - leftEyeRef.x;
          const dy = rightEyeRef.y - leftEyeRef.y;
          let angle = Math.atan2(dy, dx);

          // Normalizar ángulo
          while (angle > Math.PI / 2) angle -= Math.PI;
          while (angle < -Math.PI / 2) angle += Math.PI;

          const activeLentes = filterType === "lentes" || filterType === "todo";
          const activeConejo = filterType === "orejas" || filterType === "todo";
          const activeGorro = filterType === "sombrero" || filterType === "todo";
          const activeRastro = filterType === "rastro" || filterType === "todo";

          if (activeLentes) {
            drawSunglasses(ctx, leftEyeRef, rightEyeRef, eyeDist, angle);
          }
          if (activeConejo) {
            drawBunnyFilter(ctx, headTop, nose, eyeDist, angle);
          }
          if (activeGorro) {
            drawHat(ctx, headTop, eyeDist, angle);
          }

          // Spawning de rastro y destellos si la opción extraRastro está disponible
          if (activeRastro) {
            // Rastro multicolor neón fluorescente en la punta de la nariz (Arcoíris neón de alto brillo)
            if (noseSparklesRef.current.length > 80) noseSparklesRef.current.shift();
            noseSparklesRef.current.push({
              id: Math.random(),
              x: nose.x,
              y: nose.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              size: Math.random() * 6 + 4,
              alpha: 1.0,
              decay: 0.02 + Math.random() * 0.012,
              color: `hsl(${(Date.now() / 8) % 360}, 100%, 65%)`, 
              type: "trail",
            });

            // Destellos por movimiento de la cabeza (Velocidad angular y desplazamiento orgánico)
            if (headSpeed > 2.8) {
              const numSparkles = Math.min(10, Math.floor(headSpeed / 1.1));
              for (let s = 1; s <= numSparkles; s++) {
                const rndIdx = Math.floor(Math.random() * face.length);
                const pt = face[rndIdx];
                const pX = (1 - pt.x) * width;
                const pY = pt.y * height;

                const isGold = Math.random() < 0.5;
                const sparkleColor = isGold ? "#facc15" : "#06b6d4"; // dorado orgánico vs celeste neón

                if (noseSparklesRef.current.length > 80) noseSparklesRef.current.shift();
                noseSparklesRef.current.push({
                  id: Math.random(),
                  x: pX,
                  y: pY,
                  vx: (Math.random() - 0.5) * 4.0,
                  vy: (Math.random() - 0.5) * 3.0 - 1.2, // Flotando ligeramente hacia arriba
                  size: Math.random() * 3.0 + 1.2,
                  alpha: 1.0,
                  decay: 0.018 + Math.random() * 0.02,
                  color: sparkleColor,
                  type: "head",
                });
              }
            }
          }

          // Dibujar y decaer las partículas de rastro y destellos
          const sparklesList = noseSparklesRef.current;
          for (let i = sparklesList.length - 1; i >= 0; i--) {
            const sp = sparklesList[i];
            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.alpha -= sp.decay;

            if (sp.alpha <= 0) {
              sparklesList.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.globalAlpha = sp.alpha;
            
            // Fusión aditiva en pantalla para brillo fluorescente
            ctx.globalCompositeOperation = "screen";

            if (sp.type === "trail") {
              // Dibujo optimizado sin radialGradients ni shadowBlur lentos
              ctx.fillStyle = sp.color;
              
              // Aura suave exterior fluida
              ctx.globalAlpha = sp.alpha * 0.28;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size * sp.alpha * 1.6, 0, Math.PI * 2);
              ctx.fill();

              // Núcleo brillante ultra visible
              ctx.fillStyle = "#ffffff";
              ctx.globalAlpha = sp.alpha;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size * sp.alpha * 0.65, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Destellos de la cabeza optimizados sin shadowBlur en bucle
              ctx.fillStyle = sp.color;
              
              // Aura de destello sutil
              ctx.globalAlpha = sp.alpha * 0.22;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size * (0.3 + sp.alpha * 0.7) * 1.5, 0, Math.PI * 2);
              ctx.fill();

              // Punto central nítido
              ctx.globalAlpha = sp.alpha;
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, sp.size * (0.3 + sp.alpha * 0.7), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          ctx.restore(); // Termina clipping derecho
        }

        // Puntero verde de la mano virtual para FILTERS
        if (hasPointer) {
          ctx.save();
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 10;
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pointerX, pointerY, 12, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(pointerX, pointerY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // MÓDULO 2: LECTOR DE EMOCIONES BIOMÉTRICO
      else if (activeModule === "EMOTIONS") {
        const face = faceLandmarksRef.current;
        if (face && face.length > 0) {
          const eyeLeftCorner = face[130];
          const eyeRightCorner = face[359];
          const faceScale = Math.sqrt(
            Math.pow(eyeLeftCorner.x - eyeRightCorner.x, 2) +
            Math.pow(eyeLeftCorner.y - eyeRightCorner.y, 2)
          );

          // 1. Apertura labios ($rawLipGap$)
          const lipT = face[13];
          const lipB = face[14];
          const rawGap = Math.abs(lipT.y - lipB.y) / faceScale;
          const pLip = Math.min((rawGap / 0.45) * 100, 100);

          // 2. Ancho comisuras e interpolación de aspecto (Redondez)
          const mouthL = face[61];
          const mouthR = face[291];
          const rawMouthW = Math.sqrt(
            Math.pow(mouthL.x - mouthR.x, 2) +
            Math.pow(mouthL.y - mouthR.y, 2)
          ) / faceScale;
          const aspect = rawGap > 0.005 ? rawMouthW / rawGap : 99.0;

          // 3. Curvatura de boca (Sonrisa vs Sad) con respecto al labio superior (punto 0)
          const mouthCenterRef = face[0];
          const cornersY = (mouthL.y + mouthR.y) / 2;
          const rawCurv = (cornersY - mouthCenterRef.y) / faceScale;
          let pCurv = 50 - rawCurv * 210;
          pCurv = Math.max(0, Math.min(100, pCurv));

          // 4. Elevación de cejas ($rawBrowHeight$)
          const leftB = face[70];
          const leftEyeL = face[159];
          const rightB = face[300];
          const rightEyeL = face[386];
          const rawBrowH = (Math.abs(leftB.y - leftEyeL.y) + Math.abs(rightB.y - rightEyeL.y)) / 2 / faceScale;

          // 5. Fruncido de cejas ($rawBrowFurrow$)
          const inBLeft = face[107];
          const inBRight = face[336];
          const rawBrowF = Math.sqrt(
            Math.pow(inBLeft.x - inBRight.x, 2) +
            Math.pow(inBLeft.y - inBRight.y, 2)
          ) / faceScale;
          let pBrowF = ((0.24 - rawBrowF) / 0.065) * 100;
          pBrowF = Math.max(0, Math.min(100, pBrowF));

          // 6. NUEVOS PUNTOS DE DETECCIÓN ADICIONALES PARA MÁXIMA PRECISIÓN (OJOS Y ÁNGULO DE CEJAS)
          // Altura de ojos (Apertura ocular)
          const rawEyeOpen = (Math.abs(face[159].y - face[145].y) + Math.abs(face[386].y - face[374].y)) / 2 / faceScale;
          // Inclinación interior de cejas (positivo = extremo interior más abajo, ej: molesto; negativo = triste)
          const leftBrowTilt = (face[107].y - face[70].y) / faceScale;
          const rightBrowTilt = (face[336].y - face[300].y) / faceScale;
          const rawBrowT = (leftBrowTilt + rightBrowTilt) / 2;
          // Arrugador de cejas / distancia a puente de la nariz
          const rawNoseScrunch = (Math.abs(face[107].y - face[168].y) + Math.abs(face[336].y - face[168].y)) / 2 / faceScale;

          // Actualizar métricas biométricas reactivas para el panel UI lateral (Optimizadas con EMA)
          const ema = emaMetricsRef.current;
          const alphaIdx = 0.22; // factor de suavizado para eliminar jitter de camara

          ema.lipGap = ema.lipGap === 0 ? pLip : ema.lipGap * (1 - alphaIdx) + pLip * alphaIdx;
          ema.curvature = ema.curvature === 50 ? pCurv : ema.curvature * (1 - alphaIdx) + pCurv * alphaIdx;
          ema.browFurrow = ema.browFurrow === 0 ? pBrowF : ema.browFurrow * (1 - alphaIdx) + pBrowF * alphaIdx;
          ema.browHeight = ema.browHeight === 0.22 ? rawBrowH : ema.browHeight * (1 - alphaIdx) + rawBrowH * alphaIdx;
          ema.mouthRatio = ema.mouthRatio === 1.0 ? aspect : ema.mouthRatio * (1 - alphaIdx) + aspect * alphaIdx;

          ema.rawLipGap = ema.rawLipGap === 0 ? rawGap : ema.rawLipGap * (1 - alphaIdx) + rawGap * alphaIdx;
          ema.rawCurvature = ema.rawCurvature === 0 ? rawCurv : ema.rawCurvature * (1 - alphaIdx) + rawCurv * alphaIdx;
          ema.rawBrowFurrow = ema.rawBrowFurrow === 0.24 ? rawBrowF : ema.rawBrowFurrow * (1 - alphaIdx) + rawBrowF * alphaIdx;
          ema.rawBrowHeight = ema.rawBrowHeight === 0.22 ? rawBrowH : ema.rawBrowHeight * (1 - alphaIdx) + rawBrowH * alphaIdx;

          ema.rawEyeOpenness = ema.rawEyeOpenness === 0.07 ? rawEyeOpen : ema.rawEyeOpenness * (1 - alphaIdx) + rawEyeOpen * alphaIdx;
          ema.rawBrowTilt = ema.rawBrowTilt === 0 ? rawBrowT : ema.rawBrowTilt * (1 - alphaIdx) + rawBrowT * alphaIdx;
          ema.rawNoseScrunchDist = ema.rawNoseScrunchDist === 0.15 ? rawNoseScrunch : ema.rawNoseScrunchDist * (1 - alphaIdx) + rawNoseScrunch * alphaIdx;

          const calculatedMetrics: EmotionMetrics = {
            lipGap: ema.lipGap,
            curvature: ema.curvature,
            browFurrow: ema.browFurrow,
            browHeight: ema.browHeight,
            mouthRatio: ema.mouthRatio,
            rawLipGap: ema.rawLipGap,
            rawCurvature: ema.rawCurvature,
            rawBrowFurrow: ema.rawBrowFurrow,
            rawBrowHeight: ema.rawBrowHeight,
            rawEyeOpenness: ema.rawEyeOpenness,
            rawBrowTilt: ema.rawBrowTilt,
            rawNoseScrunchDist: ema.rawNoseScrunchDist,
          };

          // --- CLASIFICADOR PREMIUM DE PLANTILLAS PROTOTIPO (K-NEAREST NEIGHBOR, K=1) ---
          // Prioridad Absoluta al Gesto del Usuario: si el usuario guardó un molde de su rostro para cualquier emoción,
          // calculamos la distancia euclidiana normalizada multidimensional entre sus facciones actuales y los moldes.
          let cat = "Neutro";
          let emj = "😐";
          let matchedFromTemplate = false;

          if (samplesRef.current && samplesRef.current.length > 0) {
            let bestMatch: SavedEmotion | null = null;
            let minDistance = Infinity;

            samplesRef.current.forEach((sample) => {
              // Valores biométricos crudos del molde histórico
              const sCurv = sample.metrics.rawCurvature;
              const sGap = sample.metrics.rawLipGap;
              const sFurrow = sample.metrics.rawBrowFurrow;
              const sHeight = sample.metrics.rawBrowHeight;

              // Valores adicionales con fallback
              const sEyeOpen = sample.metrics.rawEyeOpenness !== undefined ? sample.metrics.rawEyeOpenness : 0.07;
              const sTilt = sample.metrics.rawBrowTilt !== undefined ? sample.metrics.rawBrowTilt : 0.0;
              const sScrunch = sample.metrics.rawNoseScrunchDist !== undefined ? sample.metrics.rawNoseScrunchDist : 0.15;

              // Distancias relativas normalizadas con coeficientes de escala facial estándar:
              // 1. Curvatura comisuras (porcentaje de sonrisa: escala típica ~0.012)
              const dCurvature = (ema.rawCurvature - sCurv) / 0.012;
              // 2. Apertura de labios (escala típica ~0.035)
              const dLipGap = (ema.rawLipGap - sGap) / 0.035;
              // 3. Fruncido de cejas (distancia entre cejas: escala típica ~0.025)
              const dBrowFurrow = (ema.rawBrowFurrow - sFurrow) / 0.025;
              // 4. Elevación de cejas (escala típica ~0.035)
              const dBrowHeight = (ema.rawBrowHeight - sHeight) / 0.035;
              // 5. Apertura ocular (escala típica ~0.015)
              const dEyeOpen = (ema.rawEyeOpenness - sEyeOpen) / 0.015;
              // 6. Inclinación de cejas (escala típica ~0.03)
              const dTilt = (ema.rawBrowTilt - sTilt) / 0.03;
              // 7. Distancia al puente nasal / arrugado (escala típica ~0.025)
              const dScrunch = (ema.rawNoseScrunchDist - sScrunch) / 0.025;

              // Distancia Euclidiana Ponderada de todos estos puntos
              const distance = Math.sqrt(
                dCurvature * dCurvature +
                dLipGap * dLipGap +
                dBrowFurrow * dBrowFurrow +
                dBrowHeight * dBrowHeight +
                dEyeOpen * dEyeOpen +
                dTilt * dTilt +
                dScrunch * dScrunch
              );

              if (distance < minDistance) {
                minDistance = distance;
                bestMatch = sample;
              }
            });

            // Si hay un molde guardado y la distancia es menor al umbral (3.5), lo adoptamos
            if (bestMatch && minDistance < 3.5) {
              cat = (bestMatch as SavedEmotion).emotion;
              emj = (bestMatch as SavedEmotion).emoji;
              matchedFromTemplate = true;
            }
          }

          // Si el usuario no ha guardado plantillas para guiarse o está fuera de rango,
          // recurrimos al Evaluador Algorítmico tradicional basado en tolerancias de sliders
          if (!matchedFromTemplate) {
            const thSmile = sliderSmileRef.current;
            const thSurp = sliderSurpriseRef.current;
            const thSad = sliderSadRef.current;
            const thAngry = sliderAngryRef.current;
            const thSurpBrows = sliderSurpriseBrowsRef.current;
            const thSurpRatio = sliderSurpriseRatioRef.current;

            // Feliz: Curvatura baja o comisura estirada
            if (ema.rawCurvature < thSmile || ema.curvature > 52.8 || (ema.rawLipGap > 0.08 && ema.mouthRatio > thSurpRatio)) {
              cat = "Feliz";
              emj = "😊";
            }
            // Sorpresa: Boca abierta, aspecto redondeado vertical y cejas levantadas
            else if (ema.rawLipGap > thSurp * 0.9 && ema.mouthRatio < thSurpRatio && ema.rawBrowHeight > thSurpBrows * 0.90) {
              cat = "Sorpresa";
              emj = "😲";
            }
            // Tristeza: Comisura arqueada hacia abajo
            else if ((ema.rawCurvature > thSad || ema.curvature < 47.8) && ema.rawLipGap < 0.08) {
              cat = "Triste";
              emj = "😢";
            }
            // Molesto: Ceño fruncido arriba de la tolerancia y cejas no levantadas rígidamente o baja curvatura
            else if (ema.browFurrow > thAngry && ema.rawBrowHeight < Math.max(0.255, thSurpBrows) && ema.rawCurvature > -0.012) {
              cat = "Molesto";
              emj = "😠";
            }
          }

          // Establecer estados reactivos de forma controlada paso a paso
          setLiveMetrics(calculatedMetrics);
          setLiveEmotion(cat);
          setLiveEmoji(emj);
          setIsTemplateMatched(matchedFromTemplate);

          // Lógica de Desafío de Gesto de Emoción
          const challengeTarget = targetChallengeEmotionRef.current;
          if (challengeTarget) {
            if (challengeCompletedRef.current) {
              // Ya completó el desafío, mantener en 100%
            } else {
              if (cat === challengeTarget) {
                // Cumple con la gesticulación! Sube progreso
                const nextProg = Math.min(100, challengeProgressRef.current + 2.0);
                if (nextProg !== challengeProgressRef.current) {
                  challengeProgressRef.current = nextProg;
                  setChallengeProgress(nextProg);
                  if (nextProg >= 100) {
                    challengeCompletedRef.current = true;
                    setChallengeCompleted(true);
                    playSuccessSound(); // Fanfarria de victoria retro
                  }
                }
              } else {
                // No cumple, desciende lentamente
                const nextProg = Math.max(0, challengeProgressRef.current - 1.0);
                if (nextProg !== challengeProgressRef.current) {
                  challengeProgressRef.current = nextProg;
                  setChallengeProgress(nextProg);
                }
              }
            }
          }

          // DIBUJAR MALLA FACIAL SUTIL + DIAGRAMAS VECTORIALES DE AUDITORÍA
          ctx.save();
          ctx.strokeStyle = "rgba(236, 72, 153, 0.15)";
          ctx.lineWidth = 0.5;

          // Líneas de contorno espacial simplificadas
          for (let i = 0; i < face.length; i += 4) {
            const pt1 = face[i];
            const pt2 = face[(i + 4) % face.length];
            ctx.beginPath();
            ctx.moveTo((1 - pt1.x) * width, pt1.y * height);
            ctx.lineTo((1 - pt2.x) * width, pt2.y * height);
            ctx.stroke();
          }

          // Vectores visuales sobre la cara
          const mLx = (1 - mouthL.x) * width;
          const mLy = mouthL.y * height;
          const mRx = (1 - mouthR.x) * width;
          const mRy = mouthR.y * height;

          const lTx = (1 - lipT.x) * width;
          const lTy = lipT.y * height;
          const lBx = (1 - lipB.x) * width;
          const lBy = lipB.y * height;

          // A. Vector Ancho Labial (Azul neón)
          ctx.strokeStyle = "rgba(129, 140, 248, 0.9)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(mLx, mLy);
          ctx.lineTo(mRx, mRy);
          ctx.stroke();

          // B. Vector Apertura Labial (Rosa neón)
          ctx.strokeStyle = "rgba(244, 114, 182, 0.9)";
          ctx.beginPath();
          ctx.moveTo(lTx, lTy);
          ctx.lineTo(lBx, lBy);
          ctx.stroke();

          // C. Vector Fruncido Cejas (Verde neón)
          const bLx = (1 - inBLeft.x) * width;
          const bLy = inBLeft.y * height;
          const bRx = (1 - inBRight.x) * width;
          const bRy = inBRight.y * height;

          ctx.strokeStyle = "rgba(52, 211, 153, 0.9)";
          ctx.beginPath();
          ctx.moveTo(bLx, bLy);
          ctx.lineTo(bRx, bRy);
          ctx.stroke();

          // Puntos clave brillantes sobre la cara
          const eyeIndices = [33, 133, 159, 145, 263, 362, 386, 374, 70, 107, 300, 336, 61, 291, 13, 14];
          eyeIndices.forEach((idx) => {
            const pt = face[idx];
            ctx.shadowColor = "#ec4899";
            ctx.shadowBlur = 8;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc((1 - pt.x) * width, pt.y * height, 3.2, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.shadowBlur = 0;

          // Dibujar caja HUD de escaneo gesticulante
          let minX = width;
          let maxX = 0;
          let minY = height;
          let maxY = 0;

          for (let i = 0; i < face.length; i += 4) {
            const cx = (1 - face[i].x) * width;
            const cy = face[i].y * height;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
          }

          ctx.strokeStyle = "rgba(236, 72, 153, 0.7)";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.roundRect(minX - 15, minY - 25, (maxX - minX) + 30, (maxY - minY) + 40, 16);
          ctx.stroke();
          ctx.setLineDash([]); // Resetear dashes

          // Badge HUD
          ctx.fillStyle = "rgba(236, 72, 153, 0.9)";
          ctx.fillRect(minX - 15, minY - 50, 135, 20);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8.5px Inter";
          ctx.textAlign = "left";
          ctx.fillText("MALLA BIOMÉTRICA ACTIVA", minX - 8, minY - 37);

          if (matchedFromTemplate) {
            ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
            ctx.fillRect(minX + 125, minY - 50, 115, 20);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 8.5px Inter";
            ctx.fillText(`✓ MOLDE: ${cat.toUpperCase()}`, minX + 132, minY - 37);
          }

          // >>> HUD Y HOLOGRAMA DEL ENTRENADOR GESTICULANTE SOBRE EL CANVAS <<<
          if (challengeTarget) {
            ctx.save();
            
            // Proyectar la máscara holográfica guía sobre el rostro del usuario
            drawChallengeHologram(ctx, face, width, height, challengeTarget, faceScale);

            const isDone = challengeCompletedRef.current;
            const progress = challengeProgressRef.current;

            // Panel superior de información del Desafío
            const hudW = 280;
            const hudH = 50;
            const hudX = (width - hudW) / 2;
            const hudY = 15;

            ctx.shadowBlur = 10;
            ctx.shadowColor = isDone ? "#10B981" : "#06B6D4";
            ctx.fillStyle = "rgba(10, 10, 12, 0.85)";
            ctx.strokeStyle = isDone ? "#10B981" : "rgba(6, 182, 212, 0.8)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(hudX, hudY, hudW, hudH, 8);
            ctx.fill();
            ctx.stroke();

            // Texto RETO
            ctx.shadowBlur = 0;
            ctx.fillStyle = isDone ? "#10B981" : "#06B6D4";
            ctx.font = "bold 8px var(--font-mono)";
            ctx.textAlign = "center";
            ctx.fillText(isDone ? "✓ RETO BIOMÉTRICO COMPLETADO" : "🎯 RETO: RECOMPONER EXPRESIÓN", width / 2, hudY + 12);

            ctx.fillStyle = "#ffffff";
            ctx.font = "italic bold 10px Inter";
            ctx.fillText(`Copia la posición de: ${challengeTarget.toUpperCase()}`, width / 2, hudY + 24);

            // Barra de progreso HUD
            const barW = 240;
            const barH = 5;
            const barX = (width - barW) / 2;
            const barY = hudY + 32;

            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.fill();

            ctx.fillStyle = isDone ? "#10B981" : "rgba(6, 182, 212, 0.95)";
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * (progress / 100), barH, 2);
            ctx.fill();

            // Texto porcentaje
            ctx.fillStyle = isDone ? "#10B981" : "#e2e8f0";
            ctx.font = "900 8px var(--font-mono)";
            ctx.fillText(`${Math.round(progress)}% COINCIDENCIA`, width / 2, hudY + 44);

            // Si ya terminó, dibujar victoria splash grande
            if (isDone) {
              const splW = 320;
              const splH = 80;
              const splX = (width - splW) / 2;
              const splY = (height - splH) / 2;

              ctx.shadowBlur = 20;
              ctx.shadowColor = "#10B981";
              ctx.fillStyle = "rgba(6, 78, 59, 0.95)";
              ctx.strokeStyle = "#10B981";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.roundRect(splX, splY, splW, splH, 12);
              ctx.fill();
              ctx.stroke();

              ctx.shadowBlur = 0;
              ctx.fillStyle = "#ffffff";
              ctx.font = "900 16px Inter";
              ctx.textAlign = "center";
              ctx.fillText("⭐ ¡DESAFÍO SUPERADO! ⭐", width / 2, splY + 28);

              ctx.font = "bold 9.5px Inter";
              ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
              ctx.fillText(`Has logrado imitar la expresión de [${challengeTarget.toUpperCase()}]`, width / 2, splY + 45);

              ctx.font = "italic 8.5px var(--font-mono)";
              ctx.fillStyle = "#a7f3d0";
              ctx.fillText("Selecciona otra emoción en el panel para continuar entrenando", width / 2, splY + 62);
            }

            ctx.restore();
          }

          ctx.restore();
        } else {
          // Si no hay cara enfrente, limpiar lecturas del live state
          setLiveMetrics(null);
          setLiveEmotion("Neutro");
          setLiveEmoji("😐");
          setIsTemplateMatched(false);
        }
      }

      // MÓDULO 3: JUEGO DE BURBUJAS INTERACTIVO
      else if (activeModule === "BUBBLES") {
        const active = gameActiveRef.current;
        const currentMode = gameModeRef.current;

        // Extraer múltiples coordenadas de manos para soporte mono y dual
        const rawHands = handLandmarksRef.current;
        let hand1 = null;
        let hand2 = null;

        if (Array.isArray(rawHands)) {
          hand1 = rawHands[0] || null;
          hand2 = rawHands[1] || null;
        } else if (rawHands) {
          hand1 = rawHands;
        }

        let p1X = -100, p1Y = -100, hasP1 = false;
        let p2X = -100, p2Y = -100, hasP2 = false;

        if (hand1 && hand1.length > 8) {
          p1X = (1 - hand1[8].x) * width;
          p1Y = hand1[8].y * height;
          hasP1 = true;
        }
        if (hand2 && hand2.length > 8) {
          p2X = (1 - hand2[8].x) * width;
          p2Y = hand2[8].y * height;
          hasP2 = true;
        }

        // CONTROL EXTRA: SI ESTAMOS EN EL LOBBY DE JUEGOS
        if (inGameLobbyRef.current) {
          ctx.save();
          // No oscurecer ni desvanecer el fondo de la pantalla (mantiene el video de la cámara brillante)

          // Diseño moderno de fondo rejilla cyberpunk
          ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
          ctx.lineWidth = 1;
          for (let i = 40; i < width; i += 80) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
          }
          for (let j = 40; j < height; j += 80) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
          }

          // Header
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 20px Inter";
          ctx.textAlign = "center";
          ctx.fillText("VIDEOJUEGOS SENSORIALES INTEGRADOS", width / 2, 55);

          ctx.fillStyle = "#10B981";
          ctx.font = "bold 9px font-mono";
          ctx.fillText("[ POSICIONA EL DEDO ÍNDICE EN UN MÓDULO PARA SELECCIONAR ]", width / 2, 75);

          // Opciones de juegos
          const cardW = Math.min(145, width / 4.4);
          const cardH = 175;
          const startX = (width - (cardW * 4 + 60)) / 2;
          const cardY = 105;

          const options = [
            { id: "bubbles", title: "Burbujas Clásicas", emoji: "🫧", desc: "Clásico. Explota esferas que ascienden velozmente en la pantalla con el dedo índice.", color: "#10B981" },
            { id: "plasma", title: "Tormenta Plasma", emoji: "⚡", desc: "Dual. Crea un canal superconductor entre ambas manos para pulverizar núcleos.", color: "#06B6D4" },
            { id: "lightning", title: "Pilas y Rayos", emoji: "🔋", desc: "¡NUEVO! Carga celdas de energía para desbloquear la cyberMÁscara y ganar.", color: "#EAB308" },
            { id: "emotions", title: "Emociones", emoji: "🎭", desc: "Imita las emociones requeridas antes de que acabe el tiempo.", color: "#EC4899" }
          ];

          options.forEach((opt, idx) => {
            const x = startX + idx * (cardW + 20);
            const y = cardY;

            let isHovered = false;
            if (hasP1) {
              if (p1X >= x && p1X <= x + cardW && p1Y >= y && p1Y <= y + cardH) {
                isHovered = true;
              }
            }

            const hoverId = `game_select_${opt.id}`;
            const hoverMap = hoverTimersRef.current;
            if (!hoverMap[hoverId]) hoverMap[hoverId] = 0;

            if (isHovered) {
              hoverMap[hoverId] = Math.min(hoverMap[hoverId] + 1, 35);
              if (hoverMap[hoverId] === 35) {
                hoverMap[hoverId] = 0;
                setGameMode(opt.id as any);
                setInGameLobby(false);
                resetGame();
                playSuccessSound();
              }
            } else {
              hoverMap[hoverId] = Math.max(hoverMap[hoverId] - 1.5, 0);
            }

            // Dibujar tarjeta estética estilo glassmorphism
            ctx.save();
            ctx.lineWidth = isHovered ? 2.5 : 1.5;
            ctx.shadowBlur = isHovered ? 16 : 4;
            ctx.shadowColor = isHovered ? opt.color : "rgba(0,0,0,0.4)";
            ctx.fillStyle = isHovered ? "rgba(20, 20, 22, 0.95)" : "rgba(18, 18, 20, 0.75)";
            ctx.strokeStyle = isHovered ? opt.color : "rgba(255, 255, 255, 0.1)";

            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 12);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Elementos internos de la carta
            ctx.fillStyle = isHovered ? opt.color : "#ffffff";
            ctx.font = "28px Arial";
            ctx.fillText(opt.emoji, x + cardW / 2, y + 38);

            ctx.font = "bold 11px Inter";
            ctx.fillText(opt.title, x + cardW / 2, y + 66);

            // Descripción wrappada
            ctx.fillStyle = "#A1A1AA";
            ctx.font = "9px Inter";
            
            const wrapText = (text: string, maxWidth: number) => {
              const words = text.split(" ");
              const lines = [];
              let currentLine = words[0];
              for (let w = 1; w < words.length; w++) {
                const testLine = currentLine + " " + words[w];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth) {
                  lines.push(currentLine);
                  currentLine = words[w];
                } else {
                  currentLine = testLine;
                }
              }
              lines.push(currentLine);
              return lines;
            };

            const descLines = wrapText(opt.desc, cardW - 20);
            descLines.forEach((line, lineIdx) => {
              ctx.fillText(line, x + cardW / 2, y + 88 + lineIdx * 11);
            });

            // Círculo de selección
            if (hoverMap[hoverId] > 0) {
              const progress = hoverMap[hoverId] / 35;
              ctx.strokeStyle = opt.color;
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.arc(x + cardW / 2, y + cardH - 24, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
              ctx.stroke();

              ctx.fillStyle = opt.color;
              ctx.font = "extrabold 8px Inter";
              ctx.fillText(`${Math.round(progress * 100)}%`, x + cardW / 2, y + cardH - 21);
            } else {
              ctx.fillStyle = isHovered ? opt.color : "rgba(255, 255, 255, 0.2)";
              ctx.font = "bold 8px font-mono";
              ctx.fillText("APUNTA AQUÍ", x + cardW / 2, y + cardH - 18);
            }

            ctx.restore();
          });

          // Puntero en lobby
          if (hasP1) {
            ctx.save();
            ctx.shadowColor = "#10b981";
            ctx.shadowBlur = 12;
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(p1X, p1Y, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p1X, p1Y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.restore();
          animationFrameId = requestAnimationFrame(render);
          return;
        }

        // A. Dibujar y decaer partículas flotadoras o eléctricas (Optimizado para 60 FPS fijos)
        const list = particlesListRef.current;
        if (list.length > 120) {
          list.splice(0, list.length - 120); // Límite estricto para evitar saturación de arrays
        }

        ctx.save();
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            list.splice(i, 1);
            continue;
          }

          if (currentMode === "plasma" && p.radius > 3.0) {
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            
            // Aura suave fluorescente sin shadowBlur costoso
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha * 0.35;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 2.0, 0, Math.PI * 2);
            ctx.fill();

            // Núcleo brillante
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Renderizado hiper-rápido directo sin recrear estados de canvas
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // B. Modo de Juego 1: BURBUJAS CLÁSICAS (Mano Única)
        if (currentMode === "bubbles") {
          if (active) {
            const listBubbles = bubblesListRef.current;
            while (listBubbles.length < 6) {
              spawnBubble(width, height);
            }

            for (let i = listBubbles.length - 1; i >= 0; i--) {
              const b = listBubbles[i];
              b.pulse += 0.04;
              b.y -= b.speedY * 4.5; // Aumentado significativamente el multiplicador de velocidad para que sea ágil y dinámico

              const waveX = b.x + Math.sin(b.pulse) * 1.5;

              // Choque físico con puntero primario (Mano 1)
              if (hasP1) {
                const dist = Math.sqrt(Math.pow(p1X - waveX, 2) + Math.pow(p1Y - b.y, 2));
                if (dist < b.radius + 15) {
                  playPopSound();
                  createPopParticles(waveX, b.y, b.color);
                  listBubbles.splice(i, 1);
                  setScore((prev) => prev + 1);
                  continue;
                }
              }

              if (b.y < -b.radius) {
                listBubbles.splice(i, 1);
                continue;
              }

              ctx.save();
              const grad = ctx.createRadialGradient(
                waveX - b.radius * 0.3,
                b.y - b.radius * 0.3,
                b.radius * 0.1,
                waveX,
                b.y,
                b.radius
              );
              grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
              grad.addColorStop(0.2, b.color);
              grad.addColorStop(1, "rgba(15, 23, 42, 0.4)");

              ctx.fillStyle = grad;
              ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
              ctx.lineWidth = 1.5;

              ctx.beginPath();
              ctx.arc(waveX, b.y, b.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
              ctx.beginPath();
              ctx.arc(waveX - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.18, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }

          // C. Mirilla clásica para burbujas
          if (hasP1 && active) {
            ctx.save();
            ctx.shadowColor = "#10b981";
            ctx.shadowBlur = 15;
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p1X, p1Y, 20, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p1X, p1Y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#10b981";
            ctx.font = "bold 9px Inter";
            ctx.textAlign = "left";
            ctx.fillText("PUNTERO (ÍNDICE)", p1X + 26, p1Y + 3.5);
            ctx.restore();
          }
        }

        // B2. Modo de Juego 2: TORMENTA DE PLASMA DUAL (Doble Mano y Rayos Conectores)
        else if (currentMode === "plasma") {
          // Rayo conector principal de plasma si ambas manos están detectadas
          if (hasP1 && hasP2 && active) {
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.shadowColor = "#06b6d4";
            ctx.shadowBlur = 16;
            ctx.strokeStyle = "#ffffff"; // núcleo incandescente
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(p1X, p1Y);

            const distance = Math.sqrt(Math.pow(p2X - p1X, 2) + Math.pow(p2Y - p1Y, 2));
            const segments = Math.max(5, Math.floor(distance / 25)); // Un segmento en zigzag cada 25px
            
            for (let s = 1; s < segments; s++) {
              const ratio = s / segments;
              const targetX = p1X + (p2X - p1X) * ratio;
              const targetY = p1Y + (p2Y - p1Y) * ratio;

              // Desviación en ángulo ortogonal para emular rayos fractales
              const perpX = -(p2Y - p1Y) / distance;
              const perpY = (p2X - p1X) / distance;
              const jitterAmount = (Math.random() - 0.5) * 32;

              ctx.lineTo(targetX + perpX * jitterAmount, targetY + perpY * jitterAmount);
            }

            ctx.lineTo(p2X, p2Y);
            ctx.stroke();

            // Halo cian plasma envolvente
            ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
            ctx.lineWidth = 6.5;
            ctx.stroke();
            ctx.restore();

            // Partículas de descarte cargadas de plasma
            if (Math.random() < 0.45) {
              const lerpFactor = Math.random();
              const pX = p1X + (p2X - p1X) * lerpFactor;
              const pY = p1Y + (p2Y - p1Y) * lerpFactor;
              particlesListRef.current.push({
                x: pX + (Math.random() - 0.5) * 16,
                y: pY + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 4.0,
                vy: (Math.random() - 0.5) * 4.0,
                radius: Math.random() * 2.8 + 1.2,
                alpha: 1.0,
                decay: 0.04 + Math.random() * 0.03,
                color: Math.random() < 0.5 ? "#06b6d4" : "#f472b6",
              });
            }
          }

          if (active) {
            const listBubbles = bubblesListRef.current;
            while (listBubbles.length < 6) {
              spawnBubble(width, height);
            }

            for (let i = listBubbles.length - 1; i >= 0; i--) {
              const b = listBubbles[i];
              b.pulse += 0.055;
              b.y -= b.speedY * 5.5; // Elevado de 1.3 a 3.5 de multiplicador para máxima aceleración y dinamismo fluidos

              // Ondulación inestable de plasma
              const waveX = b.x + Math.sin(b.pulse) * 2.5;

              let hit = false;
              let hitSource = ""; // p1, p2 o rayo

              // 1. Choque físico con Puntero Izquierdo
              if (hasP1) {
                const dist1 = Math.sqrt(Math.pow(p1X - waveX, 2) + Math.pow(p1Y - b.y, 2));
                if (dist1 < b.radius + 15) {
                  hit = true;
                  hitSource = "p1";
                }
              }

              // 2. Choque físico con Puntero Derecho
              if (hasP2 && !hit) {
                const dist2 = Math.sqrt(Math.pow(p2X - waveX, 2) + Math.pow(p2Y - b.y, 2));
                if (dist2 < b.radius + 15) {
                  hit = true;
                  hitSource = "p2";
                }
              }

              // 3. Choque físico con el Rayo Conector Dual central (Proyección ortogonal de punto a segmento)
              if (hasP1 && hasP2 && !hit) {
                const A = waveX - p1X;
                const B = b.y - p1Y;
                const C = p2X - p1X;
                const D = p2Y - p1Y;
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                if (lenSq !== 0) {
                  param = Math.max(0, Math.min(1, dot / lenSq));
                }
                const projX = p1X + param * C;
                const projY = p1Y + param * D;

                const distLine = Math.sqrt(Math.pow(waveX - projX, 2) + Math.pow(b.y - projY, 2));
                if (distLine < b.radius + 18) {
                  hit = true;
                  hitSource = "rayo";
                }
              }

              // Procesar colisión exitosa de energía
              if (hit) {
                playPopSound();
                // Splash de electrones radiales
                const sparkCount = hitSource === "rayo" ? 24 : 14;
                for (let k = 0; k < sparkCount; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 8.5 + 3.0;
                  particlesListRef.current.push({
                    x: waveX,
                    y: b.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 4.5 + 1.5,
                    alpha: 1.0,
                    decay: 0.02 + Math.random() * 0.035,
                    color: b.color,
                  });
                }
                listBubbles.splice(i, 1);
                // Puntos dobles si se conectó mediante el rayo cruzado dual
                setScore((prev) => prev + (hitSource === "rayo" ? 2 : 1));
                continue;
              }

              if (b.y < -b.radius) {
                listBubbles.splice(i, 1);
                continue;
              }

              // Dibujar núcleo inestable de plasma flotador
              ctx.save();
              ctx.globalCompositeOperation = "screen";

              // Aura fluorescente del núcleo
              ctx.strokeStyle = b.color;
              ctx.lineWidth = 2.2;
              ctx.shadowColor = b.color;
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.arc(waveX, b.y, b.radius, 0, Math.PI * 2);
              ctx.stroke();

              // Micro descargas circulares internas
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              let prevPtX = waveX + Math.cos(b.pulse) * (b.radius * 0.35);
              let prevPtY = b.y + Math.sin(b.pulse) * (b.radius * 0.35);
              ctx.moveTo(prevPtX, prevPtY);
              for (let r = 1; r <= 4; r++) {
                const subAngle = b.pulse + (r * Math.PI) / 2;
                const targetPtX = waveX + Math.cos(subAngle) * (b.radius * 0.8);
                const targetPtY = b.y + Math.sin(subAngle) * (b.radius * 0.8);

                // Refracción caótica del rayito
                const midX = (prevPtX + targetPtX) / 2 + (Math.random() - 0.5) * 8;
                const midY = (prevPtY + targetPtY) / 2 + (Math.random() - 0.5) * 8;
                ctx.lineTo(midX, midY);
                ctx.lineTo(targetPtX, targetPtY);
                prevPtX = targetPtX;
                prevPtY = targetPtY;
              }
              ctx.stroke();

              // Centro de energía térmica de cristal
              const grad = ctx.createRadialGradient(
                waveX,
                b.y,
                b.radius * 0.08,
                waveX,
                b.y,
                b.radius * 0.45
              );
              grad.addColorStop(0, "#ffffff");
              grad.addColorStop(0.35, b.color);
              grad.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(waveX, b.y, b.radius * 0.45, 0, Math.PI * 2);
              ctx.fill();

              ctx.restore();
            }
          }

          // D. Cursores interactivos duales (Mano izquierda y derecha)
          if (active) {
            if (hasP1) {
              ctx.save();
              ctx.shadowColor = "#06b6d4";
              ctx.shadowBlur = 12;
              ctx.strokeStyle = "#06b6d4";
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.arc(p1X, p1Y, 18, 0, Math.PI * 2);
              ctx.stroke();

              // Ondulación estética radial
              ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(p1X, p1Y, 25 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(p1X, p1Y, 5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = "#06b6d4";
              ctx.font = "bold 9px Inter";
              ctx.textAlign = "left";
              ctx.fillText("PLASMA IZQ", p1X + 26, p1Y + 3.5);
              ctx.restore();
            }

            if (hasP2) {
              ctx.save();
              ctx.shadowColor = "#f472b6";
              ctx.shadowBlur = 12;
              ctx.strokeStyle = "#f472b6";
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.arc(p2X, p2Y, 18, 0, Math.PI * 2);
              ctx.stroke();

              // Ondulación estética radial invertida
              ctx.strokeStyle = "rgba(244, 114, 182, 0.4)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(p2X, p2Y, 25 + Math.sin(Date.now() / 150 + Math.PI) * 4, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(p2X, p2Y, 5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = "#f472b6";
              ctx.font = "bold 9px Inter";
              ctx.textAlign = "left";
              ctx.fillText("PLASMA DER", p2X + 26, p2Y + 3.5);
              ctx.restore();
            }
          }
        }

        // B3. Modo de Juego 3: PODER ELÉCTRICO Y PILAS CAYENDO (NUEVO!)
        else if (currentMode === "lightning") {
          // Si estamos en juego de relámpago, pero YA ganamos (y estamos en el menú de victoria o animando)
          if (electricWinStateRef.current === "victory_menu") {
            ctx.save();
            // Mantener fondo de cámara brillante sin oscurecer ni filtrar negro

            // Rejilla de fondo dorada
            ctx.strokeStyle = "rgba(234, 179, 8, 0.04)";
            ctx.lineWidth = 1;
            for (let i = 40; i < width; i += 80) {
              ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
            }
            for (let j = 40; j < height; j += 80) {
              ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
            }

            // Título de la cyberMáscara Completada
            ctx.fillStyle = "#EAB308";
            ctx.font = "900 23px Inter";
            ctx.textAlign = "center";
            ctx.fillText("⚡ ENERGÍA SÚPER COMPLETA ⚡", width / 2, 55);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px Inter";
            ctx.fillText("¡¡MÁSCARA ELÉCTRICA DE LA TORMENTA COMPLETADA CON ÉXITO!!", width / 2, 78);

            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.font = "italic 9px Inter";
            ctx.fillText("[ POSICIONA EL DEDO ÍNDICE EN UN PODER PARA ACTIVAR LA DESCARGA EN PANTALLA ]", width / 2, 95);

            // 3 opciones de descargas de poderes eléctricos
            const cardW = Math.min(185, width / 3.4);
            const cardH = 175;
            const startX = (width - (cardW * 3 + 40)) / 2;
            const cardY = 120;

            const powers = [
              { id: "tesla", title: "Arco Tesla", icon: "🔮", desc: "Genera un concentrador electroestático central con descargas masivas en tus dedos indices.", color: "#06B6D4" },
              { id: "storm", title: "Lluvia de Rayos", icon: "🌩️", desc: "Invoca descargas verticales de alta frecuencia que impactan sobre toda la pantalla.", color: "#EC4899" },
              { id: "supernova", title: "Onda Supernova", icon: "🌋", desc: "Dispara un pulso electromagnético expansivo dorado continuo desde los ojos cibernéticos.", color: "#EAB308" }
            ];

            powers.forEach((p, idx) => {
              const x = startX + idx * (cardW + 20);
              const y = cardY;

              let isHovered = false;
              if (hasP1) {
                if (p1X >= x && p1X <= x + cardW && p1Y >= y && p1Y <= y + cardH) {
                  isHovered = true;
                }
              }

              const hoverId = `power_select_${p.id}`;
              const hoverMap = hoverTimersRef.current;
              if (!hoverMap[hoverId]) hoverMap[hoverId] = 0;

              if (isHovered) {
                hoverMap[hoverId] = Math.min(hoverMap[hoverId] + 1, 35);
                if (hoverMap[hoverId] === 35) {
                  hoverMap[hoverId] = 0;
                  setElectricWinState(`animating_${p.id}` as any);
                  setElectricAnimDuration(0);
                  playSuccessSound();
                }
              } else {
                hoverMap[hoverId] = Math.max(hoverMap[hoverId] - 1.5, 0);
              }

              // Dibujo de tarjetas de poder
              ctx.save();
              ctx.lineWidth = isHovered ? 2.5 : 1.5;
              ctx.shadowBlur = isHovered ? 16 : 4;
              ctx.shadowColor = isHovered ? p.color : "rgba(0,0,0,0.4)";
              ctx.fillStyle = isHovered ? "rgba(22, 22, 25, 0.95)" : "rgba(18, 18, 20, 0.75)";
              ctx.strokeStyle = isHovered ? p.color : "rgba(234, 179, 8, 0.15)";

              ctx.beginPath();
              ctx.roundRect(x, y, cardW, cardH, 12);
              ctx.fill();
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Elementos internos
              ctx.fillStyle = isHovered ? p.color : "#ffffff";
              ctx.font = "30px Arial";
              ctx.fillText(p.icon, x + cardW / 2, y + 42);

              ctx.font = "bold 12px Inter";
              ctx.fillText(p.title, x + cardW / 2, y + 70);

              // Descripción
              ctx.fillStyle = "#A1A1AA";
              ctx.font = "9px Inter";

              const wrapText = (text: string, maxWidth: number) => {
                const words = text.split(" ");
                const lines = [];
                let currentLine = words[0];
                for (let w = 1; w < words.length; w++) {
                  const testLine = currentLine + " " + words[w];
                  const metrics = ctx.measureText(testLine);
                  if (metrics.width > maxWidth) {
                    lines.push(currentLine);
                    currentLine = words[w];
                  } else {
                    currentLine = testLine;
                  }
                }
                lines.push(currentLine);
                return lines;
              };

              const descLines = wrapText(p.desc, cardW - 20);
              descLines.forEach((line, lineIdx) => {
                ctx.fillText(line, x + cardW / 2, y + 92 + lineIdx * 11);
              });

              // Progreso de carga
              if (hoverMap[hoverId] > 0) {
                const progress = hoverMap[hoverId] / 35;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(x + cardW / 2, y + cardH - 24, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
                ctx.stroke();

                ctx.fillStyle = p.color;
                ctx.font = "extrabold 8px Inter";
                ctx.fillText(`${Math.round(progress * 100)}%`, x + cardW / 2, y + cardH - 21);
              } else {
                ctx.fillStyle = isHovered ? p.color : "rgba(255, 255, 255, 0.2)";
                ctx.font = "bold 8px font-mono";
                ctx.fillText("SELECCIONAR", x + cardW / 2, y + cardH - 18);
              }

              ctx.restore();
            });

            // Ojos de máscara y cursores de manos interactivos en menú de victoria
            const face = faceLandmarksRef.current;
            if (face && face.length > 0) {
              const leftOuter = face[33];
              const rightOuter = face[263];
              const eyeDistance = Math.sqrt(
                Math.pow((rightOuter.x - leftOuter.x) * width, 2) +
                Math.pow((rightOuter.y - leftOuter.y) * height, 2)
              );
              drawElectricCyberMask(ctx, face, width, height, eyeDistance, 1.0);
            }

            // Puntero
            if (hasP1) {
              ctx.save();
              ctx.shadowColor = "#EAB308";
              ctx.shadowBlur = 12;
              ctx.strokeStyle = "#EAB308";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(p1X, p1Y, 14, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(p1X, p1Y, 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            ctx.restore();
          }

          // SI ESTAMOS ANIMANDO ALGÚN PODER ELÉCTRICO DE VICTORIA
          else if (electricWinStateRef.current.startsWith("animating_")) {
            const currentAnim = electricWinStateRef.current;
            
            // Incrementar duración de la animación en cada frame (total: 240 frames ~ 4 segundos)
            let currentDur = electricAnimDurationRef.current;
            currentDur += 0.45; // Incremento controlado
            
            if (currentDur >= 100) {
              // Finalizó la animación: REINICIAR JUEGO AUTOMÁTICAMENTE
              resetGame();
              playSuccessSound();
            } else {
              setElectricAnimDuration(currentDur);
            }

            // 1. Efecto sonoro de vibración eléctrica intermitente
            if (soundCooldownRef.current > 0) {
              soundCooldownRef.current--;
            }
            if (soundCooldownRef.current <= 0 && Math.random() < 0.4) {
              playElectricSound();
              soundCooldownRef.current = 10;
            }

            // Fondo de cámara brillante sin filtros negros
            ctx.save();

            // Agregar chispas flotando desbocadas de fondo
            if (Math.random() < 0.8) {
              particlesListRef.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 8.0,
                vy: (Math.random() - 0.5) * 8.0,
                radius: Math.random() * 5 + 1.5,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                color: currentAnim === "animating_tesla" ? "#06B6D4" : (currentAnim === "animating_storm" ? "#EC4899" : "#EAB308")
              });
            }

            // --- ANIMACIÓN A: ARCO TESLA EXTRAORDINARIO ---
            if (currentAnim === "animating_tesla") {
              const centerX = width / 2;
              const centerY = height / 2;
              const orbRadius = 65 + Math.sin(Date.now() / 90) * 8;

              // Dibujar orbe central neón
              ctx.save();
              ctx.shadowColor = "#06B6D4";
              ctx.shadowBlur = 45;
              const radialGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, orbRadius);
              radialGrad.addColorStop(0, "#ffffff");
              radialGrad.addColorStop(0.3, "rgba(6, 182, 212, 0.9)");
              radialGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");

              ctx.fillStyle = radialGrad;
              ctx.beginPath();
              ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              // Conectar arcos eléctricos salvajes hacia manos, cara o puntos aleatorios
              ctx.save();
              ctx.shadowBlur = 18;
              ctx.shadowColor = "#06B6D4";
              ctx.lineWidth = 2.0;

              const targets = [];
              if (hasP1) targets.push({ x: p1X, y: p1Y });
              if (hasP2) targets.push({ x: p2X, y: p2Y });

              // Si no hay manos, fijar puntos orbitales caóticos alrededor
              while (targets.length < 3) {
                const angle = Math.random() * Math.PI * 2;
                const r = orbRadius * 1.8 + Math.random() * 200;
                targets.push({
                  x: centerX + Math.cos(angle) * r,
                  y: centerY + Math.sin(angle) * r
                });
              }

              targets.forEach((tar) => {
                ctx.strokeStyle = targets.indexOf(tar) === 0 ? "#ffffff" : "#22D3EE";
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);

                let curX = centerX;
                let curY = centerY;
                const segments = 9;
                for (let s = 1; s <= segments; s++) {
                  const t = s / segments;
                  // Mezcla lineal con perturbación aleatoria perpendicular
                  const targetPosX = centerX + (tar.x - centerX) * t;
                  const targetPosY = centerY + (tar.y - centerY) * t;

                  const normalX = -(tar.y - centerY);
                  const normalY = tar.x - centerX;
                  const normalLen = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
                  const offsetSize = 25 * (1 - Math.abs(t - 0.5) * 2) * (Math.random() - 0.5);

                  const midX = targetPosX + (normalX / normalLen) * offsetSize;
                  const midY = targetPosY + (normalY / normalLen) * offsetSize;

                  ctx.lineTo(midX, midY);
                  curX = midX; curY = midY;
                }
                ctx.stroke();

                // Destellito en el target
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(tar.x, tar.y, 6, 0, Math.PI * 2);
                ctx.fill();
              });

              ctx.restore();
            }

            // --- ANIMACIÓN B: LLUVIA DE RAYOS PROCEDIMENTALES CAÓTICOS ---
            else if (currentAnim === "animating_storm") {
              ctx.save();
              ctx.shadowBlur = 24;
              ctx.shadowColor = "#EC4899";

              // Instanciación probabilística de relámpago masivo vertical
              if (Math.random() < 0.22) {
                const startX = Math.random() * width;
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(startX, 0);

                let curX = startX;
                let curY = 0;
                while (curY < height) {
                  const segY = curY + 28 + Math.random() * 25;
                  const segX = curX + (Math.random() - 0.5) * 48;
                  ctx.lineTo(segX, segY);
                  curX = segX;
                  curY = segY;

                  // Posibilidad de chispas secundarias
                  if (Math.random() < 0.3) {
                    ctx.save();
                    ctx.lineWidth = 1.0;
                    ctx.strokeStyle = "#F472B6";
                    ctx.beginPath();
                    ctx.moveTo(curX, curY);
                    ctx.lineTo(curX + (Math.random() - 0.5) * 90, curY + 30);
                    ctx.stroke();
                    ctx.restore();
                  }
                }
                ctx.stroke();

                // Explosión luminosa en el suelo al impactar el rayo
                ctx.fillStyle = "rgba(236, 72, 153, 0.7)";
                ctx.beginPath();
                ctx.arc(curX, height, 45, 0, Math.PI * 2);
                ctx.fill();

                // Onda expansiva en impacto en la base
                for (let k = 0; k < 12; k++) {
                  const angle = Math.random() * Math.PI;
                  const sp = Math.random() * 6.0 + 4.0;
                  particlesListRef.current.push({
                    x: curX,
                    y: height - 5,
                    vx: Math.cos(angle) * sp,
                    vy: -Math.sin(angle) * sp,
                    radius: Math.random() * 5 + 1.5,
                    alpha: 1.0,
                    decay: 0.02 + Math.random() * 0.035,
                    color: "#F472B6"
                  });
                }
              }
              ctx.restore();
            }

            // --- ANIMACIÓN C: ONDA SUPERNOVA ELECTRIZANTE DORADA CONCÉNTRICA ---
            else if (currentAnim === "animating_supernova") {
              const face = faceLandmarksRef.current;
              let originX = width / 2;
              let originY = height / 2;

              if (face && face.length > 0) {
                const nose = face[1];
                originX = nose.x * width;
                originY = nose.y * height;
              }

              // Dibujar ondas circulares neon que se expanden del rostro hacia afuera
              ctx.save();
              ctx.shadowColor = "#EAB308";
              ctx.shadowBlur = 20;
              ctx.lineWidth = 3.5;

              const wavePulse = (Date.now() / 350) % 3; // 3 niveles de ondas concéntricas fluyendo en paralelo
              for (let w = 0; w < 3; w++) {
                const fraction = (wavePulse + w) / 3;
                const r = fraction * (width * 0.7);

                ctx.strokeStyle = `rgba(254, 240, 138, ${1 - fraction})`;
                ctx.beginPath();
                ctx.arc(originX, originY, r, 0, Math.PI * 2);
                ctx.stroke();
              }

              // Detonación de mini anillos giratorios
              ctx.lineWidth = 1.2;
              ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
              ctx.beginPath();
              ctx.arc(originX, originY, 30 + Math.sin(Date.now() / 60) * 10, 0, Math.PI * 2);
              ctx.stroke();

              ctx.restore();
            }

            // 2. Pintar la cyberMÁscara con máxima potencia y opacidad
            const face = faceLandmarksRef.current;
            if (face && face.length > 0) {
              const leftOuter = face[33];
              const rightOuter = face[263];
              const eyeDistance = Math.sqrt(
                Math.pow((rightOuter.x - leftOuter.x) * width, 2) +
                Math.pow((rightOuter.y - leftOuter.y) * height, 2)
              );
              // Dibujamos la cyberMáscara coloreada con el color del poder actual
              drawElectricCyberMask(ctx, face, width, height, eyeDistance, 1.0);
            }

            // 3. Pintar cursores de manos interactivos durante la descarga
            if (hasP1) {
              ctx.save();
              ctx.shadowBlur = 12;
              ctx.fillStyle = "#ffffff";
              ctx.beginPath(); ctx.arc(p1X, p1Y, 5, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }

            // 4. Panel estético de medidor de carga "DESCARGANDO PODER PODEROSO"
            ctx.save();
            const panelW = width * 0.7;
            const panelH = 45;
            const panelX = (width - panelW) / 2;
            const panelY = height - 60;

            ctx.fillStyle = "rgba(10, 10, 14, 0.9)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(panelX, panelY, panelW, panelH, 12);
            ctx.fill();
            ctx.stroke();

            // Texto descriptivo en el panel
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9.5px Inter";
            ctx.textAlign = "center";
            const currentName = currentAnim === "animating_tesla" ? "ARCO TESLA CIBERNÉTICO" : (currentAnim === "animating_storm" ? "FÚRIA LLUVIA DE RAYOS" : "IMPULSO SUPERNOVA VOLTIO");
            ctx.fillText(`DESCARGANDO: ${currentName}`, width / 2, panelY + 18);

            // Barra de progreso de descarga interna
            const progBarW = panelW - 40;
            const progBarH = 6;
            const progBarX = panelX + 20;
            const progBarY = panelY + 26;

            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            ctx.beginPath();
            ctx.roundRect(progBarX, progBarY, progBarW, progBarH, 3);
            ctx.fill();

            const barFillW = progBarW * (currentDur / 100);
            if (barFillW > 0) {
              ctx.save();
              ctx.shadowBlur = 8;
              ctx.shadowColor = currentAnim === "animating_tesla" ? "#06B6D4" : (currentAnim === "animating_storm" ? "#EC4899" : "#EAB308");
              ctx.fillStyle = currentAnim === "animating_tesla" ? "#06B6D4" : (currentAnim === "animating_storm" ? "#EC4899" : "#EAB308");
              ctx.beginPath();
              ctx.roundRect(progBarX, progBarY, barFillW, progBarH, 3);
              ctx.fill();
              ctx.restore();
            }

            // Porcentaje
            ctx.fillStyle = "#A1A1AA";
            ctx.font = "bold 8px font-mono";
            ctx.fillText(`${Math.round(currentDur)}% COMPLETADO (¡VOLVIENDO AL JUEGO!)`, width / 2, panelY + 41);

            ctx.restore();
            ctx.restore();
          }

          // RANGO 3: JUEGO ACTIVO COMÚN (DIFERENTES PILAS)
          else {
            // 1. Manejo del sonido eléctrico cuando se mueven las manos rápido
            if (active) {
              if (soundCooldownRef.current > 0) {
                soundCooldownRef.current--;
              }

              // Calcular velocidades y dibujar estelas eléctricas para Mano 1 (Izquierda)
              if (hasP1) {
                const dx1 = p1X - prevP1Ref.current.x;
                const dy1 = p1Y - prevP1Ref.current.y;
                const speed1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

                // Actualizar referencia de posición anterior
                prevP1Ref.current = { x: p1X, y: p1Y };

                if (speed1 > 16) {
                  // Rápido movimiento! Generar destellitos y sonido de trueno
                  if (soundCooldownRef.current <= 0) {
                    playElectricSound();
                    soundCooldownRef.current = 7; // debounce
                  }

                  // Spawnear partículas de chispas de plasma relámpago
                  for (let k = 0; k < 5; k++) {
                    particlesListRef.current.push({
                      x: p1X + (Math.random() - 0.5) * 15,
                      y: p1Y + (Math.random() - 0.5) * 15,
                      vx: (Math.random() - 0.5) * 4.5,
                      vy: (Math.random() - 0.5) * 4.5,
                      radius: Math.random() * 4.5 + 1.5,
                      alpha: 1.0,
                      decay: 0.02 + Math.random() * 0.035,
                      color: Math.random() < 0.65 ? "#EAB308" : "#ffffff", // Oro y blanco de relámpago
                    });
                  }

                  // Descarga de trueno estética aleatoria destellante
                  if (Math.random() < 0.55) {
                    ctx.save();
                    ctx.strokeStyle = "rgba(254, 240, 138, 0.9)";
                    ctx.lineWidth = 1.8;
                    ctx.shadowColor = "#eab308";
                    ctx.shadowBlur = 14;
                    ctx.beginPath();
                    ctx.moveTo(p1X, p1Y);
                    let curX = p1X;
                    let curY = p1Y;
                    for (let s = 0; s < 4; s++) {
                      const nextX = curX + (Math.random() - 0.5) * 50;
                      const nextY = curY + 40 + (Math.random() - 0.5) * 15;
                      ctx.lineTo(nextX, nextY);
                      curX = nextX;
                      curY = nextY;
                    }
                    ctx.stroke();
                    ctx.restore();
                  }
                }
              }

              // Calcular velocidades y dibujar estelas eléctricas para Mano 2 (Derecha)
              if (hasP2) {
                const dx2 = p2X - prevP2Ref.current.x;
                const dy2 = p2Y - prevP2Ref.current.y;
                const speed2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                prevP2Ref.current = { x: p2X, y: p2Y };

                if (speed2 > 16) {
                  if (soundCooldownRef.current <= 0) {
                    playElectricSound();
                    soundCooldownRef.current = 7;
                  }

                  for (let k = 0; k < 5; k++) {
                    particlesListRef.current.push({
                      x: p2X + (Math.random() - 0.5) * 15,
                      y: p2Y + (Math.random() - 0.5) * 15,
                      vx: (Math.random() - 0.5) * 4.5,
                      vy: (Math.random() - 0.5) * 4.5,
                      radius: Math.random() * 4.5 + 1.5,
                      alpha: 1.0,
                      decay: 0.02 + Math.random() * 0.035,
                      color: Math.random() < 0.65 ? "#EAB308" : "#ffffff",
                    });
                  }
                }
              }
            }

            // 2. Spawnear y animar pilas/baterías cayendo (solo si se está jugando activamente)
            if (active && electricWinStateRef.current === "playing") {
              const listBat = batteriesListRef.current;
              // Rellenar pilas normales y negativas inmediatamente en el borde
              while (listBat.length < 10) {
                const isNeg = Math.random() < 0.35; // 35% de probabilidad de pila que resta
                listBat.push({
                  x: Math.random() * (width - 120) + 60,
                  y: -40 - Math.random() * 40, // offset corto para que caiga inmediatamente tras desaparecer otra
                  vy: Math.random() * (isNeg ? 4.5 : 4.0) + 12.5, // Las pilas ahora caen muchísimo más rápido para mejorar la velocidad
                  angle: Math.random() * Math.PI * 2,
                  spin: (Math.random() - 0.5) * (isNeg ? 0.12 : 0.06),
                  size: 24,
                  charge: isNeg ? -15 : 10,
                  isNegative: isNeg,
                });
              }

              for (let i = listBat.length - 1; i >= 0; i--) {
                const b = listBat[i];
                b.y += b.vy;
                b.angle += b.spin;

                let caught = false;

                // Detección de colisión con mano 1 (Índice)
                if (hasP1) {
                  const dist1 = Math.sqrt(Math.pow(p1X - b.x, 2) + Math.pow(p1Y - b.y, 2));
                  if (dist1 < b.size + 18) {
                    caught = true;
                  }
                }

                // Detección de colisión con mano 2 (Índice)
                if (hasP2 && !caught) {
                  const dist2 = Math.sqrt(Math.pow(p2X - b.x, 2) + Math.pow(p2Y - b.y, 2));
                  if (dist2 < b.size + 18) {
                    caught = true;
                  }
                }

                if (caught) {
                  playPopSound();
                  
                  // Si era una PIla que resta (isNegative)
                  if (b.isNegative) {
                    for (let k = 0; k < 18; k++) {
                      const angle = Math.random() * Math.PI * 2;
                      const sp = Math.random() * 5.0 + 3.0;
                      particlesListRef.current.push({
                        x: b.x,
                        y: b.y,
                        vx: Math.cos(angle) * sp,
                        vy: Math.sin(angle) * sp,
                        radius: Math.random() * 4.5 + 1.5,
                        alpha: 1.0,
                        decay: 0.02 + Math.random() * 0.03,
                        color: "#EF4444", // Chispas rojas agresivas de cortocircuito
                      });
                    }

                    listBat.splice(i, 1);
                    setScore((prev) => Math.max(prev - 2, 0)); // Penalti de puntuación

                    // Restar barra de energía
                    setElectricEnergy((prev) => Math.max(prev - 16, 0));
                  } else {
                    // Pila normal de carga eléctrica
                    for (let k = 0; k < 18; k++) {
                      const angle = Math.random() * Math.PI * 2;
                      const sp = Math.random() * 6.5 + 3.0;
                      particlesListRef.current.push({
                        x: b.x,
                        y: b.y,
                        vx: Math.cos(angle) * sp,
                        vy: Math.sin(angle) * sp,
                        radius: Math.random() * 4 + 1.5,
                        alpha: 1.0,
                        decay: 0.02 + Math.random() * 0.03,
                        color: "#EAB308", // Chispas doradas
                      });
                    }

                    listBat.splice(i, 1);
                    setScore((prev) => prev + 1);

                    // Aumentar barra de energía
                    setElectricEnergy((prev) => {
                      const nextVal = Math.min(prev + 12, 100);
                      if (nextVal === 100) {
                        playSuccessSound();
                        setElectricWinState("victory_menu");
                        electricWinStateRef.current = "victory_menu"; // Actualización instantánea del ref para bloquear cualquier countdown
                        // Pausamos/limpiamos el timer inmediatamente al ganar para congelar el reloj de juego
                        if (gameIntervalRef.current) {
                          clearInterval(gameIntervalRef.current);
                          gameIntervalRef.current = null;
                        }
                      }
                      return nextVal;
                    });
                  }
                  continue;
                }

                // Si cae fuera de la pantalla
                if (b.y > height + 40) {
                  listBat.splice(i, 1);
                  continue;
                }

                // Dibujar la pila/batería retrofuturista neon integrada (Super-optimizado, sin shadowBlur CPU lento)
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle);

                ctx.lineWidth = 2.5;

                if (b.isNegative) {
                  // Apariencia de PILA DAÑADA / DESCARGADA que resta
                  // Glow de fondo ligero muy rápido
                  ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
                  ctx.beginPath();
                  ctx.roundRect(-16, -24, 32, 48, 6);
                  ctx.fill();

                  ctx.strokeStyle = "#FCA5A5";
                  ctx.fillStyle = "#1E1818"; // Tono fúnebre fucsia

                  ctx.beginPath();
                  ctx.roundRect(-12, -20, 24, 40, 4);
                  ctx.fill();
                  ctx.stroke();

                  // Polo negativo fucsia
                  ctx.fillStyle = "#EF4444";
                  ctx.beginPath();
                  ctx.roundRect(-5, -24, 10, 4, 1);
                  ctx.fill();

                  // Relleno interno
                  ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
                  ctx.fillRect(-8, -16, 16, 32);

                  // Símbolo MENOS "-" fucsia agresivo
                  ctx.strokeStyle = "#FFFFFF";
                  ctx.lineWidth = 2.5;
                  ctx.beginPath();
                  ctx.moveTo(-6, 0);
                  ctx.lineTo(6, 0);
                  ctx.stroke();
                } else {
                  // Apariencia de PILA BUENA normal
                  // Glow de fondo ligero muy rápido
                  ctx.fillStyle = "rgba(234, 179, 8, 0.12)";
                  ctx.beginPath();
                  ctx.roundRect(-16, -24, 32, 48, 6);
                  ctx.fill();

                  ctx.strokeStyle = "#FEF08A";
                  ctx.fillStyle = "#1E1E24";

                  ctx.beginPath();
                  ctx.roundRect(-12, -20, 24, 40, 4);
                  ctx.fill();
                  ctx.stroke();

                  // Polo positivo
                  ctx.fillStyle = "#EAB308";
                  ctx.beginPath();
                  ctx.roundRect(-5, -24, 10, 4, 1);
                  ctx.fill();

                  // Detalle de nivel de carga dorado
                  ctx.fillStyle = "rgba(234, 179, 8, 0.4)";
                  ctx.fillRect(-8, -16, 16, 32);

                  // Simbolito de rayo
                  ctx.strokeStyle = "#FFFFFF";
                  ctx.lineWidth = 1.8;
                  ctx.beginPath();
                  ctx.moveTo(0, -10);
                  ctx.lineTo(-5, 1);
                  ctx.lineTo(1, 1);
                  ctx.lineTo(-2, 11);
                  ctx.lineTo(5, -1);
                  ctx.lineTo(-1, -1);
                  ctx.closePath();
                  ctx.stroke();
                  ctx.fillStyle = "#FFFFFF";
                  ctx.fill();
                }

                ctx.restore();
              }
            }

            // 3. Dibujar barra de energía estética en la parte inferior del canvas
            ctx.save();
            const barW = width * 0.65;
            const barH = 14;
            const barX = (width - barW) / 2;
            const barY = height - 42;

            ctx.fillStyle = "rgba(20, 20, 22, 0.85)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 6);
            ctx.fill();
            ctx.stroke();

            // Barra cargada
            const fillW = barW * (electricEnergyRef.current / 100);
            if (fillW > 0) {
              ctx.save();
              ctx.shadowColor = "#EAB308";
              ctx.shadowBlur = 15;
              const energyGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
              energyGrad.addColorStop(0, "#CA8A04");
              energyGrad.addColorStop(0.5, "#EAB308");
              energyGrad.addColorStop(1, "#FEF08A");

              ctx.fillStyle = energyGrad;
              ctx.beginPath();
              ctx.roundRect(barX, barY, fillW, barH, 6);
              ctx.fill();
              ctx.restore();
            }

            // Texto indicador de la barra
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 8px Inter";
            ctx.textAlign = "center";
            ctx.fillText(`CELDAS FILTRADAS: ${electricEnergyRef.current}% DE CARGA ELÉCTRICA`, width / 2, barY - 8);

            ctx.fillStyle = "#A1A1AA";
            ctx.font = "8px Inter";
            ctx.fillText("AGARRA PILAS AMARILLAS (+12) Y EVITA LAS ROJAS DEL CORTOCIRCUITO (-15)", width / 2, barY + 25);
            ctx.restore();

            // 4. USAR COPIA DE CYBERMASK CUANDO ENERGÍA ESTÁ LLENÁNDOSE (Hasta 100%)
            const face = faceLandmarksRef.current;
            if (face && face.length > 0) {
              const leftOuter = face[33];
              const rightOuter = face[263];
              const eyeDistance = Math.sqrt(
                Math.pow((rightOuter.x - leftOuter.x) * width, 2) +
                Math.pow((rightOuter.y - leftOuter.y) * height, 2)
              );

              // Se dibuja la máscara con opacidad proporcional a la energía cargada
              const maskAlpha = electricEnergyRef.current / 100;
              if (maskAlpha > 0.1) {
                drawElectricCyberMask(ctx, face, width, height, eyeDistance, maskAlpha);
              }
            }

            // 5. Dibujar cursores interactivos eléctricos para las manos
            if (active) {
              if (hasP1) {
                ctx.save();
                ctx.shadowColor = "#EAB308";
                ctx.shadowBlur = 12;
                ctx.strokeStyle = "#EAB308";
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(p1X, p1Y, 16, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p1X, p1Y, 22 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.arc(p1X, p1Y, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#EAB308";
                ctx.font = "bold 9px Inter";
                ctx.textAlign = "left";
                ctx.fillText("INDICE IZQ", p1X + 22, p1Y + 3.5);
                ctx.restore();
              }

              if (hasP2) {
                ctx.save();
                ctx.shadowColor = "#FEF08A";
                ctx.shadowBlur = 12;
                ctx.strokeStyle = "#FEF08A";
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(p2X, p2Y, 16, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = "rgba(254, 240, 138, 0.4)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p2X, p2Y, 22 + Math.sin(Date.now() / 150 + Math.PI) * 4, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.arc(p2X, p2Y, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#FEF08A";
                ctx.font = "bold 9px Inter";
                ctx.textAlign = "left";
                ctx.fillText("INDICE DER", p2X + 22, p2Y + 3.5);
                ctx.restore();
              }
            }
          }
        }

        // B4. Modo de Juego 4: EMOCIONES
        else if (currentMode === "emotions" && active) {
          const face = faceLandmarksRef.current;
          let cat = "Neutro";

          if (face && face.length > 0) {
            const eyeLeftCorner = face[130];
            const eyeRightCorner = face[359];
            const faceScale = Math.sqrt(
              Math.pow(eyeLeftCorner.x - eyeRightCorner.x, 2) +
              Math.pow(eyeLeftCorner.y - eyeRightCorner.y, 2)
            );

            // 1. Apertura labios
            const lipT = face[13];
            const lipB = face[14];
            const rawGap = Math.abs(lipT.y - lipB.y) / faceScale;

            // 2. Ancho comisuras
            const mouthL = face[61];
            const mouthR = face[291];
            const rawMouthW = Math.sqrt(
              Math.pow(mouthL.x - mouthR.x, 2) +
              Math.pow(mouthL.y - mouthR.y, 2)
            ) / faceScale;
            const aspect = rawGap > 0.005 ? rawMouthW / rawGap : 99.0;

            // 3. Curvatura de boca
            const mouthCenterRef = face[0];
            const cornersY = (mouthL.y + mouthR.y) / 2;
            const rawCurv = (cornersY - mouthCenterRef.y) / faceScale;
            let pCurv = 50 - rawCurv * 210;

            // 4. Elevación de cejas
            const leftB = face[70];
            const leftEyeL = face[159];
            const rightB = face[300];
            const rightEyeL = face[386];
            const rawBrowH = (Math.abs(leftB.y - leftEyeL.y) + Math.abs(rightB.y - rightEyeL.y)) / 2 / faceScale;

            // 5. Fruncido de cejas
            const inBLeft = face[107];
            const inBRight = face[336];
            const rawBrowF = Math.sqrt(
              Math.pow(inBLeft.x - inBRight.x, 2) +
              Math.pow(inBLeft.y - inBRight.y, 2)
            ) / faceScale;

            // 6. NUEVOS PUNTOS DE DETECCIÓN ADICIONALES PARA MÁXIMA PRECISIÓN (OJOS Y ÁNGULO DE CEJAS)
            const rawEyeOpen = (Math.abs(face[159].y - face[145].y) + Math.abs(face[386].y - face[374].y)) / 2 / faceScale;
            const leftBrowTilt = (face[107].y - face[70].y) / faceScale;
            const rightBrowTilt = (face[336].y - face[300].y) / faceScale;
            const rawBrowT = (leftBrowTilt + rightBrowTilt) / 2;
            const rawNoseScrunch = (Math.abs(face[107].y - face[168].y) + Math.abs(face[336].y - face[168].y)) / 2 / faceScale;

            // --- CLASIFICADOR PREMIUM DE PLANTILLAS PROTOTIPO (K-NEAREST NEIGHBOR, K=1) ---
            let matchedFromTemplate = false;

            if (samplesRef.current && samplesRef.current.length > 0) {
              let bestMatch = null;
              let minDistance = Infinity;

              samplesRef.current.forEach((sample) => {
                const sCurv = sample.metrics.rawCurvature;
                const sGap = sample.metrics.rawLipGap;
                const sFurrow = sample.metrics.rawBrowFurrow;
                const sHeight = sample.metrics.rawBrowHeight;
                const sEyeOpen = sample.metrics.rawEyeOpenness !== undefined ? sample.metrics.rawEyeOpenness : 0.07;
                const sTilt = sample.metrics.rawBrowTilt !== undefined ? sample.metrics.rawBrowTilt : 0.0;
                const sScrunch = sample.metrics.rawNoseScrunchDist !== undefined ? sample.metrics.rawNoseScrunchDist : 0.15;

                const dCurvature = (rawCurv - sCurv) / 0.012;
                const dLipGap = (rawGap - sGap) / 0.035;
                const dBrowFurrow = (rawBrowF - sFurrow) / 0.025;
                const dBrowHeight = (rawBrowH - sHeight) / 0.035;
                const dEyeOpen = (rawEyeOpen - sEyeOpen) / 0.015;
                const dTilt = (rawBrowT - sTilt) / 0.03;
                const dScrunch = (rawNoseScrunch - sScrunch) / 0.025;

                const distance = Math.sqrt(
                  dCurvature * dCurvature +
                  dLipGap * dLipGap +
                  dBrowFurrow * dBrowFurrow +
                  dBrowHeight * dBrowHeight +
                  dEyeOpen * dEyeOpen +
                  dTilt * dTilt +
                  dScrunch * dScrunch
                );

                if (distance < minDistance) {
                  minDistance = distance;
                  bestMatch = sample;
                }
              });

              // Solo usamos el molde si la distancia es razonablemente cercana (umbral de 3.5)
              // Si es mayor, significa que está haciendo una cara muy distinta a sus moldes guardados.
              if (bestMatch && minDistance < 3.5) {
                cat = (bestMatch as any).emotion;
                matchedFromTemplate = true;
              }
            }

            // Fallback: Clasificador Algorítmico tradicional
            if (!matchedFromTemplate) {
              const thSmile = sliderSmileRef.current;
              const thSurp = sliderSurpriseRef.current;
              const thSad = sliderSadRef.current;
              const thAngry = sliderAngryRef.current;
              const thSurpBrows = sliderSurpriseBrowsRef.current;
              const thSurpRatio = sliderSurpriseRatioRef.current;

              if (rawCurv < thSmile || pCurv > 52.8 || (rawGap > 0.08 && aspect > thSurpRatio)) {
                cat = "Feliz";
              } else if (rawGap > thSurp * 0.9 && aspect < thSurpRatio && rawBrowH > thSurpBrows * 0.90) {
                cat = "Sorpresa";
              } else if ((rawCurv > thSad || pCurv < 47.8) && rawGap < 0.08) {
                cat = "Triste";
              } else if (rawBrowF > thAngry && rawBrowH < Math.max(0.255, thSurpBrows) && rawCurv > -0.012) {
                cat = "Molesto";
              }
            }

            // Check if matches target (Case insensitive y sin espacios)
            const currentCatNorm = cat.trim().toLowerCase();
            const targetCatNorm = emotionsGameTargetRef.current.trim().toLowerCase();

            if (currentCatNorm === targetCatNorm) {
              setScore((prev) => prev + 10);
              playSuccessSound();
              const emotionsList = ["Feliz", "Sorpresa", "Triste", "Molesto"];
              let nextEmotion = emotionsList[Math.floor(Math.random() * emotionsList.length)];
              while (nextEmotion === emotionsGameTargetRef.current) {
                nextEmotion = emotionsList[Math.floor(Math.random() * emotionsList.length)];
              }
              emotionsGameTargetRef.current = nextEmotion as any;
            }

            // Draw HUD for emotions game
            ctx.save();
            const hudW = 340;
            const hudH = 100;
            const hudX = (width - hudW) / 2;
            const hudY = 30;
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#EC4899";
            ctx.fillStyle = "rgba(20, 20, 22, 0.85)";
            ctx.strokeStyle = "#EC4899";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(hudX, hudY, hudW, hudH, 12);
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = "#EC4899";
            ctx.font = "bold 12px Inter";
            ctx.textAlign = "center";
            ctx.fillText("¡HAZ ESTA EXPRESIÓN RÁPIDO!", width / 2, hudY + 25);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "900 32px Inter";
            ctx.fillText(emotionsGameTargetRef.current.toUpperCase(), width / 2, hudY + 60);

            // Draw current face detection
            ctx.fillStyle = "#A1A1AA";
            ctx.font = "bold 10px Inter";
            ctx.fillText(`Tu expresión actual: ${cat.toUpperCase()}`, width / 2, hudY + 85);
            ctx.restore();
          } else {
            ctx.save();
            ctx.fillStyle = "#A1A1AA";
            ctx.font = "bold 14px Inter";
            ctx.textAlign = "center";
            ctx.fillText("Buscando rostro...", width / 2, 50);
            ctx.restore();
          }
        }



        // --- BOTÓN VIRTUAL DE "ATRÁS LOBBY" INTERACTIVO POR DEDO ÍNDICE ---
        if (active || showGameOver) {
          const backX = 30;
          const backY = 30;
          const backW = 100;
          const backH = 32;

          let isBackHovered = false;
          if (hasP1) {
            if (p1X >= backX && p1X <= backX + backW && p1Y >= backY && p1Y <= backY + backH) {
              isBackHovered = true;
            }
          }

          const backHoverId = "back_btn_games_lobby";
          const hoverMap = hoverTimersRef.current;
          if (!hoverMap[backHoverId]) hoverMap[backHoverId] = 0;

          if (isBackHovered) {
            hoverMap[backHoverId] = Math.min(hoverMap[backHoverId] + 1, 35);
            if (hoverMap[backHoverId] === 35) {
              hoverMap[backHoverId] = 0;
              setGameActive(false);
              setShowGameOver(false);
              setInGameLobby(true);
              playSuccessSound();
            }
          } else {
            hoverMap[backHoverId] = Math.max(hoverMap[backHoverId] - 1.5, 0);
          }

          ctx.save();
          ctx.shadowColor = isBackHovered ? "#EF4444" : "rgba(0,0,0,0.4)";
          ctx.shadowBlur = isBackHovered ? 15 : 6;
          ctx.fillStyle = isBackHovered ? "rgba(220, 38, 38, 0.9)" : "rgba(30, 41, 59, 0.8)";
          ctx.strokeStyle = isBackHovered ? "#ffffff" : "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.roundRect(backX, backY, backW, backH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9.5px Inter";
          ctx.textAlign = "center";
          ctx.fillText("← MENÚ JUEGOS", backX + backW / 2, backY + 19.5);

          if (hoverMap[backHoverId] > 0) {
            const progress = hoverMap[backHoverId] / 35;
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(backX + backW - 14, backY + backH / 2, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeModule]);

  // Manejar redimensionamiento dinámico seguro del canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentNode?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div id="view-workspace" className="w-full h-full flex flex-col md:flex-row relative overflow-hidden">
      
      {/* PANEL LATERAL FLOTANTE DE CONTROL */}
      <div className="w-full md:w-80 lg:w-96 order-2 md:order-1 bg-[#0A0A0B] border-t md:border-t-0 md:border-r border-[#2A2A2C] p-4 md:p-5 flex flex-col gap-4 shrink-0 z-10 overflow-y-auto h-[45%] md:h-full max-h-[45vh] md:max-h-screen">
        
        {/* Botón de retorno rápido */}
        <button
          onClick={onExitToMenu}
          type="button"
          id="btn-back-lobby"
          className="w-full bg-[#1C1C1E] hover:bg-[#323235] border border-[#2A2A2C] text-[#E0E0E0] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          VOLVER AL MENÚ DE INICIO
        </button>

        {/* Carga condicional del panel lateral seleccionado */}
        {activeModule === "FILTERS" && (
          <FiltersModule
            selectedMesh={selectedMesh}
            onChangeMesh={(m) => { setSelectedMesh(m); playSuccessSound(); }}
            selectedFilter={selectedFilter}
            onChangeFilter={(f) => { setSelectedFilter(f); playSuccessSound(); }}
          />
        )}

        {activeModule === "EMOTIONS" && (
          <EmotionsModule
            currentEmotion={liveEmotion}
            currentEmoji={liveEmoji}
            metrics={liveMetrics}
            savedEmotions={samples}
            onSaveCurrentSample={handleSaveCurrentEmotion}
            onDeleteSample={onDeleteSample}
            onToggleSampleCoordsValue={handleToggleSampleCoords}
            onTriggerAutoCalibrate={handleTriggerAutoCalibrate}
            sliderSmile={sliderSmile}
            setSliderSmile={setSliderSmile}
            sliderSurprise={sliderSurprise}
            setSliderSurprise={setSliderSurprise}
            sliderSad={sliderSad}
            setSliderSad={setSliderSad}
            sliderAngry={sliderAngry}
            setSliderAngry={setSliderAngry}
            sliderSurpriseBrows={sliderSurpriseBrows}
            setSliderSurpriseBrows={setSliderSurpriseBrows}
            sliderSurpriseRatio={sliderSurpriseRatio}
            setSliderSurpriseRatio={setSliderSurpriseRatio}
            
            // Reto de Replicar Emociones
            targetChallengeEmotion={targetChallengeEmotion}
            challengeProgress={challengeProgress}
            challengeCompleted={challengeCompleted}
            onChangeChallenge={handleSelectChallengeEmotion}
            detectionConfidence={detectionConfidence}
            isTemplateMatched={isTemplateMatched}
          />
        )}

        {activeModule === "BUBBLES" && (
          <BubblesModule
            score={score}
            timeLeft={timeLeft}
            highScore={highScore}
            onResetGame={resetGame}
            gameMode={gameMode}
            onSelectGameMode={setGameMode}
          />
        )}
      </div>

      {/* ÁREA DE VISUALIZACIÓN DIGITAL / CANVAS */}
      <div className="flex-1 order-1 md:order-2 bg-[#0A0A0B] flex items-center justify-center p-2 sm:p-4 md:p-6 relative overflow-hidden h-[55%] md:h-full">
        
        {/* En caso de error o carga de webcam */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0A0A0B]/80 backdrop-blur-md flex flex-col items-center justify-center z-20 text-center px-4">
            <div className="loader-spinner mb-4" />
            <h5 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Sincronizando Módulos de IA...</h5>
            <p className="text-[11px] text-[#A1A1AA] max-w-xs mt-1">
              Espera un momento mientras descargamos y compilamos las redes neuronales de MediaPipe directamente en tu GPU.
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 max-w-md mx-auto top-1/3 bg-[#1C1C1E] border border-red-500/20 p-5 rounded-lg flex flex-col items-center text-center">
            <ShieldAlert className="w-10 h-10 text-red-400 mb-3" />
            <h5 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Error de Enlace Biométrico</h5>
            <p className="text-xs text-red-300/80 leading-normal mt-1.5 font-sans">
              La cámara no está disponible o requiere permisos. Asegúrate de otorgar acceso e inténtalo de nuevo.
            </p>
            <button
              onClick={onExitToMenu}
              type="button"
              className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition cursor-pointer"
            >
              Volver Atrás
            </button>
          </div>
        )}

        {/* Tarjeta del Visor Canvas */}
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-[#2A2A2C] shadow-2xl bg-[#0A0A0B]">
          
          <canvas ref={canvasRef} className="w-full h-full object-cover" id="sensor-viewport" />

          {/* Overlay de Game Over en tiempos del Módulo 03 */}
          {showGameOver && activeModule === "BUBBLES" && electricWinState === "playing" && (
            <div className="absolute inset-0 bg-[#0A0A0B]/95 backdrop-blur-md flex flex-col items-center justify-center z-10 animate-fade-in p-6">
              <span className="text-5xl animate-bounce">🏆</span>
              <h3 className="text-2xl font-black text-white mt-3">¡Tiempo Agotado!</h3>
              <p className="text-[#A1A1AA] text-xs mt-1.5">
                Rendimiento registrado con un total de{" "}
                <span className="text-[#10B981] font-extrabold text-sm">{score}</span> burbujas reventadas.
              </p>

              <button
                onClick={resetGame}
                type="button"
                className="mt-6 bg-[#10B981] hover:bg-[#059669] text-black font-extrabold px-8 py-2 rounded-lg text-xs tracking-wider uppercase transition cursor-pointer shadow-md"
              >
                JUGAR DE NUEVO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
