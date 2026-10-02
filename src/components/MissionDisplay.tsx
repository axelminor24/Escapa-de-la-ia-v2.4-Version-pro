import React from 'react';
import type { GameStatus } from '../types';

export type MissionState = {
  status: GameStatus; elapsedSec: number; remainingSec: number; serverNow?: number;
  board: { team: string; solved: number[]; hints?: number[]; failures?: Record<string, number> };
  events: Array<{ id: number; title: string; timestamp: number; trackId?: string }>;
};
const format = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
const sectors = ['Archivo', 'Servidor', 'Movimiento', 'Núcleo'];

export function MissionDisplay({ room, connected }: { room: MissionState; connected: boolean }) {
  const victory = room.status === 'VICTORY';
  const ended = victory || room.status === 'GAMEOVER';
  const phase = victory ? 'restored' : room.remainingSec <= 180 || room.status === 'GAMEOVER' ? 'critical' : room.elapsedSec >= 450 ? 'traced' : 'watching';
  const labels: Record<string, string> = { restored: 'Control humano restaurado', critical: 'Protocolo de contención', traced: 'Rastreo de intrusos activo', watching: 'Sistema bajo vigilancia' };
  const last = room.events.filter(event => event.trackId).at(-1);
  const recent = last && (room.serverNow ?? 0) - last.timestamp < 12000;
  const message = !connected ? 'Conexión interrumpida. Esperando la señal del coordinador.' : room.status === 'IDLE' ? 'Registren su equipo. La misión comienza cuando el coordinador dé la señal.' : room.status === 'INTRO' ? 'Escuchen el mensaje de NODO-20. La cuenta comienza al terminar la explicación.' : room.status === 'PAUSED' ? 'Misión en pausa. La cuenta y sus avances están protegidos.' : ended ? victory ? 'El candado fue abierto. Recuperaron la conexión con el exterior.' : 'La simulación terminó. Revisen su estrategia antes del próximo intento.' : recent ? last.title : room.board.solved.length === 4 ? 'Los cuatro sectores están recuperados. Falta abrir el candado final.' : ['Compartan lo que encuentren. Cada sector recuperado debilita el control de la IA.', 'NODO-20 está rastreando sus movimientos. Mantengan la comunicación.', 'Última ventana de acceso. Reúnan los códigos y alcancen el núcleo.'][phase === 'critical' ? 2 : phase === 'traced' ? 1 : 0];
  return <main className={`mission-screen mission-${phase}`}>
    <div className="mission-grid" aria-hidden="true" />
    <header className="mission-header"><div><span className="mission-kicker">INSTITUTO 20 / PROTOCOLO DE ESCAPE</span><h1>NODO<span>—</span>20</h1></div><div className="mission-link"><span className={connected ? 'signal-dot' : 'signal-off'} />{connected ? 'SEÑAL COMPARTIDA' : 'SIN CONEXIÓN'}</div></header>
    <section className="mission-center" aria-label="Estado de la misión">
      <p className="mission-phase">{room.status === 'PAUSED' ? 'MISIÓN EN PAUSA' : room.status === 'IDLE' ? 'ESPERANDO AL COORDINADOR' : room.status === 'INTRO' ? 'TRANSMISIÓN DE NODO-20' : labels[phase]}</p>
      {ended ? <><h2 className="mission-ending">{victory ? 'ESCAPARON.' : 'TIEMPO AGOTADO.'}</h2><p className="mission-team">{room.board.team || 'Equipo superviviente'}</p><div className="mission-results"><div><strong>{format(room.elapsedSec)}</strong><span>TIEMPO UTILIZADO</span></div><div><strong>{room.board.solved.length}/4</strong><span>SECTORES RECUPERADOS</span></div><div><strong>{room.board.hints?.length ?? 0}</strong><span>PISTAS UTILIZADAS</span></div><div><strong>{Object.values(room.board.failures ?? {}).reduce((sum, value) => sum + value, 0)}</strong><span>INTENTOS INCORRECTOS</span></div></div></> : <><div className="mission-clock" aria-label="Tiempo restante">{connected ? format(room.remainingSec) : '--:--'}</div><p className="mission-team">{room.board.team || 'UNA MISIÓN · UN EQUIPO'}</p></>}
      <p className="mission-message" role="status">{message}</p>
    </section>
    <section className="mission-sectors" aria-label="Sectores del refugio">{sectors.map((name, i) => <div key={name} className={`mission-sector ${room.board.solved.includes(i) ? 'recovered' : ''}`}><span>SECTOR 0{i + 1}</span><strong>{name}</strong><small>{room.board.solved.includes(i) ? 'RECUPERADO' : 'BAJO CONTROL DE LA IA'}</small></div>)}</section>
    <footer className="mission-footer"><span>{victory ? 'CONEXIÓN CON EL EXTERIOR RESTAURADA' : 'RECUPEREN LOS CUATRO SECTORES · ABRAN EL CANDADO FINAL'}</span><span>FERIA INSTITUCIONAL 2026</span></footer>
  </main>;
}
