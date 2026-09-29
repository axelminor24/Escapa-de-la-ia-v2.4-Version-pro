export type GameStatus = 'IDLE' | 'INTRO' | 'RUNNING' | 'PAUSED' | 'VICTORY' | 'GAMEOVER';

export interface AudioTrackConfig {
  id: string;
  defaultName: string;
  title: string;
  triggerTimeSec: number | null; // null for ambient / victory
  keywords: string[];
  fallbackText: string;
  fired: boolean;
  conditionType?: 'none' | 'solved_ge_1' | 'solved_eq_0';
  conditionLabel?: string;
}

export interface TrackAudioState {
  fileBlobUrl: string | null;
  fileName: string | null;
  isCustomLoaded: boolean;
  isPlaying: boolean;
}

export type ChallengeNumber = 1 | 2 | 3 | 4;

export interface ChallengesState {
  1: boolean;
  2: boolean;
  3: boolean;
  4: boolean;
}

export interface SyncMessage {
  type:
    | 'SYNC_STATE'
    | 'GAME_INTRO'
    | 'GAME_START'
    | 'PAUSE'
    | 'RESET'
    | 'VICTORY'
    | 'GAME_OVER'
    | 'CHALLENGE_UPDATE'
    | 'REQUEST_START_FROM_PLAYER'
    | 'TIME_TICK';
  gameState?: GameStatus;
  elapsed?: number;
  remainingStr?: string;
  isCritical?: boolean;
  challenges?: ChallengesState;
  ambientVolume?: number;
  voiceVolume?: number;
}
