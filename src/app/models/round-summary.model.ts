import {RoundOutcome} from '../enums/roundOutcome';
import {Role} from '../enums/role';

export interface RoundSummary {
  round: number;
  outcome: RoundOutcome;

  actualLane: Role;

  // WIN path
  kp50?: boolean;
  gainedChamp?: string;

  // LOSS path
  playedChamp?: string;

  submittedAt?: any;
}
