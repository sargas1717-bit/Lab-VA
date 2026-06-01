# Guía de Auditoría de Código y Expansión del Laboratorio de IA

Este documento detalla la arquitectura modular del **Laboratorio de Visión Artificial e Interacción (v3.5)** desarrollado en **React, Vite y MediaPipe (Computer Vision)**. Su propósito es guiar de manera simple a un auditor de código o desarrollador que desee expandir los módulos interactivos óseos y faciales del laboratorio.

---

## 1. Arquitectura de Flujo y Modularidad

El sistema descarta los acoplamientos innecesarios tradicionales y centraliza la captura analítica en capas independientes:

```
                  +--------------------------------+
                  |            index.html          | (Carga CDN de MediaPipe: FaceMesh, Hands, Camera)
                  +--------------------------------+
                                  |
                                  v
                  +--------------------------------+
                  |           src/App.tsx          | (Orquestador global de estado, menú e historial)
                  +--------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  src/components/      |                   |   src/hooks/          |
|  MainMenu.tsx         | (Lobby principal) |   useVision.ts        | (Ciclo de hardware de cámara,
+-----------------------+                   +-----------------------+  pipelines neuronales e hilos compartidos)
                                                        |
                                                        v
                                            +-----------------------+
                                            |   src/components/     |
                                            |   Workspace.tsx       | (Bucle de dibujo Canvas 60 FPS,
                                            +-----------------------+  hover virtual e interacción física)
                                                        |
                                +-----------------------+-----------------------+
                                |                       |                       |
                                v                       v                       v
                    +-----------------------+ +-----------------------+ +-----------------------+
                    | src/components/       | | src/components/       | | src/components/       |
                    | FiltersModule.tsx     | | EmotionsModule.tsx    | | BubblesModule.tsx     |
                    +-----------------------+ +-----------------------+ +-----------------------+
```

### Separación de Responsabilidad de Ficheros:
1. **`/src/types.ts`**: Declaración estricta de interfaces, modelos biométricos, estructuras tridimensionales de coordenadas y firmas del juego.
2. **`/src/utils/audio.ts`**: Motor procedimental de síntesis basado en la [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). Genera ondas sonoras analógicas al vuelo para evitar cargas estáticas externas o errores 404 durante auditorías.
3. **`/src/hooks/useVision.ts`**: Administra de forma perenne la transmision de webcam. Optimiza el procesador encendiendo o apagando clasificadores de forma inteligente en base al módulo activo para conservar recursos de CPU.
4. **`/src/components/Workspace.tsx`**: El visor central. Ejecuta un bucle unificado `requestAnimationFrame` que interactúa con la GPU para dibujar imágenes y trazar fórmulas espaciales.

---

## 2. Fórmulas de Interpretación y Filtros (Guía de Auditoría)

Las variables geométricas se obtienen normalizando los arrays coordenados de MediaPipe con una escala facial constante basada en la distancia interocular:

*   **Escala Facial Estándar ($faceScale$)**:
    $$\text{faceScale} = \sqrt{(x_{130} - x_{359})^2 + (y_{130} - y_{359})^2}$$
    *Define una constante de distancia inmune al acercamiento o alejamiento del usuario a la cámara.*

*   **Apertura de Labios ($rawLipGap$)**:
    $$\text{rawLipGap} = \frac{|y_{13} - y_{14}|}{\text{faceScale}}$$
    *Se mide de forma vertical entre el labio superior interno (Punto 13) e inferior interno (Punto 14).*

*   **Curvatura de Sonrisa ($rawCurvature$)**:
    $$\text{rawCurvature} = \frac{\left(\frac{y_{61} + y_{291}}{2}\right) - y_{0}}{\text{faceScale}}$$
    *Mide la diferencia de altura vertical entre el promedio de las comisuras izquierda (61) y derecha (291) con respecto al labio superior (0).*
    * Un valor negativo denota elevación (Sonrisa).
    * Un valor positivo denota descenso labial (Tristeza).

*   **Fruncido de Cejas ($rawBrowFurrow$)**:
    $$\text{rawBrowFurrow} = \frac{\sqrt{(x_{107} - x_{336})^2 + (y_{107} - y_{336})^2}}{\text{faceScale}}$$
    *Calcula el distanciamiento en línea recta entre las cejas internas izquierda (107) y derecha (336).*

---

## 3. Instrucciones Prácticas para Futura Expansión

### Caso A: ¿Cómo añadir un Filtro Comercial nuevo (Sombrero, Máscara, etc.)?
1. Abre `/src/types.ts` y añade el identificador en la firma:
   ```typescript
   export type FilterType = "lentes" | "orejas" | "sombrero" | "mifiltro" | "todo" | "limpiar";
   ```
2. Abre `/src/components/FiltersModule.tsx` e integra el nuevo botón en la constante `filters`:
   ```typescript
   { id: "mifiltro" as FilterType, emoji: "🦊", label: "Zorro Audaz", desc: "Aplica antifaz naranja y orejas peludas" }
   ```
3. Diseña el dibujo matemático dentro de `/src/components/Workspace.tsx` utilizando las coordenadas ya disponibles (`face[10]`, `face[4]`, etc.). Por ejemplo:
   ```typescript
   const drawFoxAntifaz = (ctx, leftEye, rightEye, distance, angle) => { ... }
   ```
4. Invoca la función en la sección de producto del bucle del Canvas guiado por el estado activo.

### Caso B: ¿Cómo conectar un nuevo Sensor Óseo de IA (ejemplo: Esqueleto de Cuerpo - Pose/Holistic)?
1. En `/index.html`, importa el paquete CDN homólogo de MediaPipe correspondientemente:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
   ```
2. Init e integra la tubería de devolución de resultados dentro de `/src/hooks/useVision.ts` de forma idéntica a `faceMesh` y `hands` usando constructores globales de `window`.
3. Ofrece los puntos clave al canvas mediante un hook de estado `poseLandmarks` y utilízalo para la interacción espacial de tu preferencia de forma limpia.

---

## 4. Auditoría de Seguridad e Integridad Local
*   **Permisión de iFrame**: El archivo `metadata.json` incluye `"requestFramePermissions": ["camera"]`, indispensable para que el iframe empotrado de Google AI Studio herede privilegios y no de errores de Sandbox.
*   **Aislamiento de Cuentas**: Ninguna clave de API secreta ni credenciales se transmiten. Todas las interacciones de computer vision y procesamiento neural suceden localmente en la máquina del cliente (Client-Side), garantizando cumplimiento impecable de normativas de privacidad de datos biométricos.
