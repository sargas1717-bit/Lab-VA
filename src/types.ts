/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Módulos disponibles en el Laboratorio de Visión Artificial.
 */
export type ModuleType = "MENU" | "FILTERS" | "EMOTIONS" | "BUBBLES";

/**
 * Tipos de renderizado de la malla facial (Ingeniería).
 */
export type MeshType = "clasico" | "biolum" | "cyber" | "fuego" | "electrico";

/**
 * Tipos de filtros comerciales de producto (Comercial).
 */
export type FilterType = "lentes" | "orejas" | "sombrero" | "rastro" | "todo" | "limpiar";

/**
 * Estructuras de coordenadas en 3D para análisis biométrico.
 */
export interface Coord3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Puntos clave específicos del rostro para auditoría y guardado de datos.
 */
export interface KeyLandmarks {
  labioSup: Coord3D;
  labioInf: Coord3D;
  comisuraIzq: Coord3D;
  comisuraDer: Coord3D;
  cejaIzq: Coord3D;
  cejaDer: Coord3D;
}

/**
 * Métricas calculadas basadas en relaciones de distancia del rostro.
 */
export interface EmotionMetrics {
  lipGap: number;        // Porcentaje visual de apertura labial
  curvature: number;     // Porcentaje visual de curvatura comisuras
  browFurrow: number;    // Porcentaje visual de fruncido de cejas
  browHeight: number;    // Valor de elevación de cejas (relativo a escala facial)
  mouthRatio: number;    // Relación de aspecto Ancho / Apertura de boca
  rawLipGap: number;     // Distancia cruda entre labios dividida por escala
  rawCurvature: number;  // Distancia cruda de curvatura de comisuras dividida por escala
  rawBrowFurrow: number; // Distancia cruda entre cejas dividida por escala
  rawBrowHeight: number; // Distancia cruda vertical ceja-ojo dividida por escala
  rawEyeOpenness?: number;     // Altura promedio de apertura de ambos ojos
  rawBrowTilt?: number;        // Inclinación/ángulo interior de las cejas (negativo triste, positivo molesto)
  rawNoseScrunchDist?: number; // Distancia desde la ceja interna hasta el puente nasal
}

/**
 * Registro completo de auditoría para una calibración o muestra guardada.
 */
export interface SavedEmotion {
  id: number;
  emotion: string;
  emoji: string;
  time: string;
  metrics: EmotionMetrics;
  landmarks: KeyLandmarks;
  showCoords: boolean;   // Estado UI para ver el desglose en JSON de landmarks 3D
}

/**
 * Elementos de juego interactivo: Burbujas flotadoras.
 */
export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  color: string;
  pulse: number;
}

/**
 * Partículas de explosión para las burbujas reventadas.
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
}

/**
 * Esporas/Partículas especiales para renders de Bioluminiscente o Fuego.
 */
export interface Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color?: string;
  colorType?: "red" | "orange" | "yellow" | "electric";
}
