import { Role } from '../enums/role';

export type RoundSummarySubmit =
  | {
  actualLane: Role;
  outcome: 'WIN';
  kp50: boolean;
  gainedChamp?: string; // nur relevant wenn kp50 === true
}
  | {
  actualLane: Role;
  outcome: 'LOSS';
  playedChamp: string;
  kp50: boolean;
  gainedChamp?: string;
};
