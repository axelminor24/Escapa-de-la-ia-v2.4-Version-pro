import { audioEngine, INITIAL_TRACKS } from './audioEngine';

export type Recording = { id: string; name: string; duration: number; blob: Blob };
let restoration: Promise<Recording[]> | undefined;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('escape-room-recordings', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('El navegador no permitió abrir los audios guardados.'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', mode);
    const request = operation(tx.objectStore('tracks'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('No se pudo guardar el audio. Revisá el espacio disponible del navegador.')); };
  });
}
export function restoreRecordings() {
  if (!restoration) restoration = transaction('readonly', store => store.getAll()).then((rows: Recording[]) => {
    const known = rows.filter(row => INITIAL_TRACKS.some(track => track.id === row.id));
    for (const row of known) audioEngine.setTrackBlobUrl(row.id, URL.createObjectURL(row.blob), row.name);
    return known;
  }).catch(error => { restoration = undefined; throw error; });
  return restoration;
}
export async function saveRecording(id: string, file: File) {
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Elegí un audio de hasta 20 MB.');
  const prior = await restoreRecordings();
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      const timer = setTimeout(() => finish(new Error('No se pudo leer el audio. Probá con MP3 o WAV.')), 10000);
      function finish(error?: Error) {
        clearTimeout(timer); audio.onloadedmetadata = null; audio.onerror = null;
        const duration = audio.duration; audio.removeAttribute('src'); audio.load();
        if (error) reject(error); else resolve(duration);
      }
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => finish(!Number.isFinite(audio.duration) || audio.duration <= 0 ? new Error('El audio no tiene una duración válida.') : undefined);
      audio.onerror = () => finish(new Error('No se pudo leer el audio. Probá con MP3 o WAV.'));
      audio.src = url;
    });
    const row: Recording = { id, name: file.name, duration, blob: file };
    await transaction('readwrite', store => store.put(row));
    audioEngine.setTrackBlobUrl(id, url, file.name);
    const updated = [...prior.filter(track => track.id !== id), row];
    restoration = Promise.resolve(updated);
    return updated;
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
export async function removeRecording(id: string) {
  await transaction('readwrite', store => store.delete(id));
  audioEngine.removeCustomAudio(id);
  const updated = (await restoreRecordings()).filter(row => row.id !== id);
  restoration = Promise.resolve(updated);
  return updated;
}

export function triggerDescription(id: string) {
  const descriptions: Record<string, string> = {
    ambient: 'Ambiente en bucle durante la explicación y la partida. Baja de volumen cuando habla la IA.',
    start: 'Al iniciar con explicación. Los 15 minutos empiezan cuando termina este archivo.',
    challenge_1: 'Al recuperar el archivo: se desbloquea el servidor.',
    challenge_2: 'Al reconstruir el servidor: se desbloquea el protocolo de movimiento.',
    challenge_3: 'Al programar al humano: se desbloquea el núcleo cifrado.',
    challenge_4: 'Al completar el binario. El reloj continúa hasta abrir el candado.',
    min5_progress: 'A los 5 minutos transcurridos, si ya hay algún desafío completado.',
    min5_no_progress: 'A los 5 minutos transcurridos, si todavía no hay desafíos completados.',
    halfway: 'A los 7 minutos y 30 segundos transcurridos.',
    '3min': 'Cuando faltan 3 minutos.',
    gameover: 'Al agotarse el tiempo. Interrumpe las intervenciones pendientes.',
    ai_errors: 'La primera vez que acumulan tres errores en una etapa. Una vez por partida.',
    ai_hint: 'Al pedir la primera pista. Una vez por partida.',
    final_resistance: 'Primera parte del final, al abrir el candado o confirmar victoria.',
    victory: 'Después de que termine Última resistencia, sin superponerse.',
  };
  return descriptions[id] ?? '';
}
