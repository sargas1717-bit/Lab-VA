/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Motor de sonido procedimental basado en Web Audio API.
 * Permite reproducir efectos sonoros personalizados sin depender de archivos de audio externos,
 * lo que facilita su auditoría y evita problemas de carga de archivos (404).
 */

const getAudioContext = (): AudioContext | null => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
};

/**
 * Sonido estallante "Pop!" de burbujas flotantes al ser reventadas.
 * Utiliza un oscilador sinusoidal que incrementa exponencialmente su frecuencia en milisegundos.
 */
export function playPopSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.warn("La reproducción del sonido Pop falló, puede requerir interacción de usuario:", err);
  }
}

/**
 * Sonido armónico de éxito o selección interactiva de botones/calibración.
 * Combina dos tonos agradables ascendentes (C5 -> E5) para brindar un feedback inmersivo.
 */
export function playSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // Nota Do (C5)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // Nota Mi (E5)

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("La reproducción del sonido de éxito falló, puede requerir interacción del usuario:", err);
  }
}

/**
 * Sonido crepitante de descarga eléctrica o plasma.
 * Genera un pulso corto de sierra a alta frecuencia modulada caóticamente con un filtro paso alto.
 */
export function playElectricSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800 + Math.random() * 1200, ctx.currentTime);
    osc.frequency.setValueAtTime(200 + Math.random() * 400, ctx.currentTime + 0.04);

    filter.type = "highpass";
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (err) {
    // Falla silenciosa si el audio está bloqueado
  }
}

