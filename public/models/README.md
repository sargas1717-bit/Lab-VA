# Carpeta de Modelos Locales para MediaPipe

Para ejecutar la aplicación completamente fuera de línea (offline) en entornos industriales seguros o sin acceso a internet, coloca los siguientes archivos en esta carpeta o sus subcarpetas de la siguiente manera:

## 1. Malla Facial (Face Mesh)
Copia los archivos desde la versión usada por la aplicación (https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/) a:
- `/public/models/face_mesh/face_mesh_solution_packed_assets_loader.js`
- `/public/models/face_mesh/face_mesh_solution_simd_wasm_bin.js`
- `/public/models/face_mesh/face_mesh.binarypb`
- `/public/models/face_mesh/face_mesh_solution_packed_assets.data`
- `/public/models/face_mesh/face_mesh_solution_simd_wasm_bin.wasm`

## 2. Detección de Manos (Hands)
Copia los archivos desde la versión usada por la aplicación (https://cdn.jsdelivr.net/npm/@mediapipe/hands/) a:
- `/public/models/hands/hands_solution_packed_assets_loader.js`
- `/public/models/hands/hands_solution_simd_wasm_bin.js`
- `/public/models/hands/hands.binarypb`
- `/public/models/hands/hands_solution_packed_assets.data`
- `/public/models/hands/hands_solution_simd_wasm_bin.wasm`

---
La aplicación detectará automáticamente si estás fuera de línea o si estos archivos están disponibles de forma local en tu máquina o servidor, priorizando siempre la carga desde esta carpeta `/models/` antes de recurrir a la red de distribución de contenidos CDN (jsDelivr).
