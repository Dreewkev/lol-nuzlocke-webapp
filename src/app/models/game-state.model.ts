import {Phase} from '../enums/phase';

export interface GameState {
  phase: Phase;
  round: number;
  outcome?: 'WIN' | 'LOSS',
  updatedAt: any;
}
