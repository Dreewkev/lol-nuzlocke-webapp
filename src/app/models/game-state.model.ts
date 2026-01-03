export type Phase = 'idle' | 'rolling' | 'locked' | 'finished';
type Role = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

interface PlayerRoles {
  main: Role;
  secondary?: Role;
}

export interface GameState {
  phase: Phase;
  round: number;
  rollsByUid?: Record<string, PlayerRoles>;
  lockedByUid?: Record<string, boolean>;
  lastActionAt?: any;
}
