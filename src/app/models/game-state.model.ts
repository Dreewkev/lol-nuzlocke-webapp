import {Phase} from '../enums/phase';
import {PlayerRoles} from './player-roles.model';

export interface GameState {
  phase: Phase;
  round: number;
  rollsByUid?: Record<string, PlayerRoles>;
  lockedByUid?: Record<string, boolean>;
  lastActionAt?: any;
}
