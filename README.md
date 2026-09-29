# 🎙️ Estación de Escape Room - Control Maestro y Transmisión

Sistema integral de cronometraje, transmisión de radio, atenuación automática (ducking) y sincronización de eventos de audio para Escape Rooms.

---

## ⚡ Novedades y Correcciones Implementadas

1. **Salto de Intro Instantáneo y Conteo Preciso:**
   - Se corrigió el fallo donde el audio de la intro continuaba sonando o la síntesis de voz se disparaba al pulsar saltar.
   - Ahora al saltar la intro, se cancela inmediatamente cualquier locución en curso (`Audio` o `SpeechSynthesis`), se inicia el bucle de sonido ambiental continuo y el cronómetro comienza a descontar a partir de 15:00 sin retrasos.
   - Dos modos de inicio disponibles:
     - **▶ Iniciar con Explicación (Intro):** reproduce las reglas y al terminar arranca la cuenta regresiva.
     - **⚡ Iniciar Directo (Sin Intro):** arranca el cronómetro de 15:00 de inmediato.
     - **⏩ Botón "Saltar Intro e Iniciar Cuenta Ya":** disponible en panel y en pantalla de jugador (o presionando [Enter] / [Espacio]).

2. **Efecto de Códigos de Error Cayendo (Matrix / Terminal Glitch):**
   - En la vista del jugador (`Modo Jugador / Proyector`), se visualizan flujos de códigos de error del sistema cayendo de arriba hacia abajo (memoria corrupta, `0xDEADBEEF`, `LOCKDOWN_ACTIVE`, `KERNEL_PANIC`, `CIPHER_FAIL`, etc.) con cabezales brillantes y líneas de escaneo CRT inmersivas.
   - Responde dinámicamente al estado del juego:
     - Normal / Intro: flujos carmesí de terminal de seguridad.
     - Modo Crítico (< 3 minutos): lluvia hiper-rápida con ráfagas rojas y destellos blancos.
     - Victoria: cascada verde esmeralda con `ACCESS_GRANTED`, `SYSTEM_RESTORED` y `ESCAPE_CONFIRMED`.

3. **Panel de Vinculación con API Externa & Hardware:**
   - Panel interactivo para enlazar con cualquier backend (Node.js, Python Flask/FastAPI, Arduino, ESP32, Raspberry Pi) mediante:
     - **HTTP REST Polling:** la emisora consulta periódicamente tu endpoint.
     - **WebSockets:** sincronización bidireccional en tiempo real sin latencia.
     - **Webhooks:** la emisora notifica a tu servidor cada segundo y ante cambios de estado.
     - **Probador de Conexión (Ping):** mide latencia en milisegundos y muestra la respuesta en vivo.
     - **Simulador de eventos:** prueba la resolución de desafíos desde la interfaz.

4. **Preparado para GitHub y GitHub Pages:**
   - `vite.config.ts` configurado con `base: './'` para funcionar en cualquier subdirectorio de GitHub Pages.
   - Flujo de GitHub Actions en `.github/workflows/deploy.yml` para despliegue automatizado.
   - Archivo `public/.nojekyll` incluido.

---

## 🚀 Despliegue en GitHub y GitHub Pages

### Pasos para subirlo a tu cuenta de GitHub:
1. Crea un nuevo repositorio en tu cuenta de [GitHub](https://github.com/new).
2. En tu terminal local, sube el proyecto:
```bash
git init
git add .
git commit -m "Initial commit - Escape Room Station"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```
3. En GitHub, ve a **Settings > Pages** y en **Source** selecciona **GitHub Actions**.
4. ¡Listo! En 1 minuto tu aplicación estará disponible públicamente en `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.

---

## 💻 Ejecución Local

1. Instalar dependencias:
```bash
npm install
```
2. Iniciar servidor de desarrollo:
```bash
npm run dev
```
3. Abre tu navegador en `http://localhost:3000`.

---

## 🔑 Credenciales de Administrador

- **Usuario:** `ISP20`
- **Contraseña:** `sanjusto`

---

## 🔊 Organización de Audios

La emisora buscará automáticamente los archivos MP3 con los siguientes nombres (o puedes cargarlos directamente desde el panel de administrador usando el botón **"Elegir archivo"** o **"Arrastrar y soltar"**):

1. `Audio-de-ambiente.mp3` - Ambiente envolvente continuo en bucle.
2. `Inicio-de-juegos-explicacion-de-desafios.mp3` - Reglas y bienvenida inicial.
3. `Desafio-1-completado.mp3` - Audio al superar el Desafío 1 (superpone y reanuda el audio previo).
4. `Desafio-2-completado.mp3` - Audio al superar el Desafío 2 (superpone y reanuda el audio previo).
5. `Desafio-3-completado.mp3` - Audio al superar el Desafío 3 (superpone y reanuda el audio previo).
6. `Desafio-4-completado.mp3` - Audio al superar el Desafío 4 (desencadena la victoria inmediata).
7. `Minuto-5-con-desafio-completado.mp3` - Evaluación minuto 5 (si llevan $\ge 1$ desafío superado).
8. `Minuto-5-sin-desafios-completados.mp3` - Evaluación minuto 5 (si llevan 0 desafíos superados).
9. `Mitad-de-tiempo-consumido-etapa-media.mp3` - Alerta al minuto 07:30.
10. `Tres-minutos-restantes-presion.mp3` - Alerta de presión al minuto 12:00 (últimos 3 minutos).
11. `Tiempo-agotado-Fin-del-juego.mp3` - Derrota al expirar los 15 minutos.
12. `Tiempo-terminado-Desafio-completo_1 (1).mp3` - Victoria total al completar los 4 desafíos.

---

## 📜 Registro de Eventos en Tiempo Real (Event Log)

El panel de administración cuenta con una sección visual auditada de **Event Log** que registra con marcas de tiempo precisas todos los acontecimientos de la partida:
- **Hora real (Wall clock)**: e.g. `21:05:42` (hora del sistema).
- **Tiempo de juego**: Cuenta regresiva restante (e.g. `⏱️ 14:15`) y segundos transcurridos (`+00:45`).
- **Categorías con códigos de color e iconos:**
  - 🎯 **Desafíos (CHALLENGE):** Registro instantáneo cuando se resuelve o desmarca cada desafío (1 a 4).
  - ⏯️ **Estado (STATE):** Inicio con intro, salto de intro, cuenta regresiva, pausas, reanudaciones, reinicios, victoria y derrota.
  - 🔊 **Audios (AUDIO):** Activación de ambiente, pistas narradas, superposiciones prioritarias de desafío con interrupción y reanudación automática, o pruebas manuales.
  - ⏱️ **Hitos (TIMELINE):** Evaluación del minuto 5 (con avance / sin avance), alerta de mitad de tiempo (07:30) y últimos 3 minutos (12:00).
  - 🌐 **API / Red (API):** Comandos y señales entrantes desde backend, hardware ESP32/Arduino o webhooks.
- **Herramientas del Event Log:**
  - Filtros instantáneos por categoría (`Todos`, `Desafíos`, `Estado`, `Audios`, `Hitos`, `API`).
  - Buscador por texto en tiempo real.
  - Modo auto-scroll para seguir en vivo los nuevos eventos.
  - Botón **Descargar JSON:** Descarga el historial estructurado en formato `.json`.
  - Botón **Descargar CSV:** Descarga el archivo `.csv` (con BOM UTF-8) listo para abrir directamente en Microsoft Excel o Google Sheets.
  - Botón **Copiar Historial** al portapapeles.
  - Visualización integrada en el panel principal (plegable) y pestaña expandida a pantalla completa.

---

## 🌐 Conexión con otra API Externa

Puedes vincular cualquier backend, juego secundario o hardware (Arduino/Raspberry Pi/ESP32) con esta emisora de **3 formas**:

### Método 1: Polling a una API REST (Configurable desde el Panel)
Configura en el panel de administrador tu endpoint (por ejemplo `http://localhost:5000/api/status`). La emisora consultará periódicamente la URL y reaccionará a respuestas JSON como:

```json
{
  "challenges": {
    "1": true,
    "2": false,
    "3": false,
    "4": false
  }
}
```
O con acciones de control:
```json
{
  "action": "SOLVE_CHALLENGE",
  "challengeNumber": 2
}
```

Acciones reconocidas:
- `START`: Inicia la transmisión.
- `SKIP_INTRO`: Salta la intro y comienza el cronómetro inmediatamente.
- `PAUSE`: Pausa el juego y el audio ambiental.
- `RESET`: Reinicia el cronómetro a 15:00.
- `WIN`: Dispara la victoria total.
- `SOLVE_CHALLENGE` con `challengeNumber: 1 | 2 | 3 | 4`: Marca el desafío y reproduce su audio exclusivo.

#### Ejemplo de Backend en Node.js / Express:
```javascript
import express from 'express';
import cors from 'cors';
const app = express();
app.use(cors());

let state = {
  challenge1: false,
  challenge2: false,
  challenge3: false,
  challenge4: false,
};

// Endpoint que consulta la emisora
app.get('/api/status', (req, res) => {
  res.json({ challenges: state });
});

// Endpoint que llama tu juego cuando alguien resuelve un acertijo
app.post('/api/solve/:num', (req, res) => {
  state[`challenge${req.params.num}`] = true;
  res.json({ success: true, state });
});

app.listen(5000, () => console.log('API escuchando en puerto 5000'));
```

### Método 2: BroadcastChannel (Mismo navegador / diferentes pestañas o ventanas)
```javascript
const syncChannel = new BroadcastChannel('escape_room_sync');

// Marcar desafío 1 completado:
syncChannel.postMessage({ action: 'SOLVE_CHALLENGE', challengeNumber: 1 });

// Saltar intro:
syncChannel.postMessage({ action: 'SKIP_INTRO' });

// Disparar victoria total:
syncChannel.postMessage({ action: 'WIN' });
```

### Método 3: LocalStorage (Pestañas en el mismo dominio)
```javascript
localStorage.setItem(
  'escape_room_trigger',
  JSON.stringify({ action: 'SOLVE_CHALLENGE', challengeNumber: 1 })
);
```

---

## 🚀 Despliegue en GitHub Pages y Solución de Errores

### ¿Por qué ocurrió el error `Dependencies lock file is not found`?
GitHub Actions (`actions/setup-node`) buscaba de forma estricta un archivo de bloqueo (`package-lock.json`, `npm-shrinkwrap.json` o `yarn.lock`) debido a la bandera de caché de npm. Si dicho archivo no estaba en el repositorio o había conflictos entre versiones de dependencias (`vite` vs `esbuild`), la acción fallaba antes de instalar.

### Correcciones Aplicadas:
1. **`package-lock.json` generado:** Se sincronizó la versión de `esbuild` (`^0.28.0`) con la requerida por `vite` y se generó un `package-lock.json` limpio y validado.
2. **Workflow resiliente (`.github/workflows/deploy.yml`):** Se eliminó la dependencia estricta de caché que rompía la ejecución y se agregó un paso de instalación tolerante: si existe `package-lock.json` usa `npm ci || npm install --legacy-peer-deps`, y si no existe realiza `npm install --legacy-peer-deps`.
3. **Compatibilidad GitHub Pages:** Se mantiene `base: './'` en `vite.config.ts` y `public/.nojekyll`.

### Para subir los cambios a tu GitHub:
```bash
git add .
git commit -m "Fix GitHub Actions lockfile and deploy workflow"
git push origin main
```
En tu repositorio en GitHub:
1. Ve a **Settings** > **Pages**.
2. En **Build and deployment > Source**, asegúrate de tener seleccionado **GitHub Actions**.
3. El despliegue se ejecutará automáticamente en la pestaña **Actions** con éxito.

