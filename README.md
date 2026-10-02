# Escapa de la IA · Tres pantallas

Juego para una muestra escolar: un coordinador, una pantalla de cronómetro y un puesto donde resolver cuatro desafíos. La partida dura 15 minutos y termina al abrir el candado final, al agotarse el tiempo o por una orden del coordinador.

## Cómo usar el sitio

1. En la PC 1, abrir `/control`, ingresar la clave del coordinador y activar el sonido.
2. Copiar el enlace **PC 2 · Cronómetro** del panel y abrirlo en la segunda computadora.
3. Abrir `/desafios/` en la tercera computadora o en los celulares. El enlace público permite entrar directamente, sin clave ni código adicional.
4. Registrar el equipo desde los desafíos. Desde el control, iniciar con explicación o iniciar directamente.
5. Mantener abierto el panel del coordinador, con sus parlantes conectados. Las otras pantallas no reproducen audio.

El sitio publicado requiere Internet en las tres computadoras. No necesitan iniciar sesión en ChatGPT. Hay una sola partida compartida por sitio: las pestañas adicionales también muestran esa partida.

El cronómetro pertenece al servidor. Recargar una pantalla conserva la partida. Pausar, reanudar y reiniciar se propaga a las tres pantallas. Para reiniciar, pulsar **Reiniciar a 15:00** y luego **Sí, reiniciar**: se borran el equipo y las respuestas, y se conservan los audios cargados. La confirmación permanece disponible sin límite de tres segundos. El cuarto desafío revela el último dígito, pero la cuenta sigue hasta abrir el candado.

Si se pierde conexión, las pantallas avisan y los desafíos no aceptan envíos hasta reconectarse. En el sitio web el reloj continúa: el coordinador puede pausar cuando conserve conexión. Los borradores de respuestas permanecen en el mismo navegador cuando el desafío sigue vigente.

### Audio y registros

### Inmersión y voz de NODO-20

La pantalla del cronómetro cambia de vigilancia a rastreo a mitad de la partida y a contención durante los últimos tres minutos. Los cuatro sectores se recuperan con los desafíos. El final muestra el equipo, tiempo utilizado, sectores, pistas y errores. La IA reacciona una vez a los tres primeros errores de una etapa y una vez a la primera pista; estas intervenciones no descuentan tiempo.

En el control, abrir **La voz de NODO-20** y pulsar **Descargar guion**. Cada evento tiene su texto sugerido y explica cuándo suena. Grabar las intervenciones por separado con la voz elegida y cargar cada MP3 o WAV en su casilla (hasta 20 MB por pista). Se puede probar, reemplazar o volver a la voz predeterminada estando en espera o pausa. Conviene que las intervenciones normales sean breves, de unos 5–12 segundos; la introducción puede ser más larga.

Las grabaciones se guardan en el navegador de la PC del coordinador y se recuperan al recargar. No se suben al sitio ni se copian a otras computadoras: conservar los originales y volver a cargarlos si se cambia de PC, perfil de navegador o se borran sus datos. Las pantallas de participantes siguen sin reproducir audio.

La narración se reproduce en una cola, respetando el final real de cada archivo. Si coinciden eventos, el siguiente espera. La introducción termina antes de iniciar el reloj. Victoria y tiempo agotado cancelan los avisos pendientes; en la victoria se escucha **Última resistencia** y después **Control humano restaurado**. Pausar, reiniciar o perder conexión vacía la cola para evitar mensajes atrasados al volver.

Se conserva el mezclador, la carga de MP3 del repositorio original y las descargas JSON/CSV. Cargar los audios en la PC del coordinador antes de iniciar. Sin archivos, se usan voz y ambiente sintetizados cuando el navegador los permite. El fin de la explicación inicia la cuenta; el coordinador también puede saltarla. Probar el sonido antes de la muestra.

Se integraron las mejoras de GitHub del 29 de septiembre: ambiente continuo, reducción gradual de volumen durante las voces y correcciones del cronómetro y del estado de los desafíos. En las tres pantallas, la API sigue siendo la autoridad para el tiempo y la victoria. Todos los botones de prueba permiten detener el sonido; la prueba del ambiente dura 3,5 segundos. Pausar o desconectarse impide que una carga tardía reactive el ambiente.

## Desarrollo

Usar Node.js 24 y las dependencias de `package-lock.json`.

```sh
npm ci
npm run test:site
npm run build:site
npm run preview:site
```

La vista previa usa una base de datos temporal que se borra al cerrar el proceso. La clave de prueba predeterminada está en `network/preview-site.mjs`; se puede reemplazar mediante la variable `CONTROL_KEY`. No usar la clave de prueba en producción.

### Publicación en Sites

`npm run build:site` genera `dist/server/index.js`, las páginas y las migraciones. El servidor es compatible con Cloudflare Workers y utiliza D1 para conservar la partida. `.openai/hosting.json` mantiene la identidad del sitio y la vinculación lógica `DB`. Las migraciones están en `drizzle/` y el esquema en `db/schema.ts`.

Configurar en Sites dos secretos: `CONTROL_KEY` (clave elegida por el coordinador) y `SESSION_KEY` (valor aleatorio de al menos 24 caracteres). Las claves nunca se incorporan a los archivos públicos. Las sesiones expiran a las 24 horas, el acceso tiene límite de intentos y las órdenes se validan en el servidor. Los enlaces de participantes no otorgan permiso de coordinación.

La publicación de Sites usa el código guardado en su propio repositorio de fuentes. La acción de GitHub Pages conserva la versión original para una sola computadora; no ejecuta el servidor de la partida compartida.

### Alternativa en la red del salón

```sh
npm run build
npm run start:lan
```

En la PC principal abrir `http://localhost:3210/control`. El programa muestra los enlaces con la dirección de esa PC para las otras dos computadoras de la misma red. En este modo solo la PC principal puede habilitar el control. La partida se guarda en `.local-data/session.json`; al reiniciar el programa, se recupera en pausa.

## Comprobaciones

Las pruebas cubren reloj y pausas, caducidad, cuatro desafíos y candado, pistas, reinicios, recuperación local, tres clientes HTTP, concurrencia en el servidor web, peticiones repetidas y permisos de coordinación/participantes. `network/preview-site.mjs` sirve el mismo resultado compilado usando SQLite temporal para probarlo localmente.
