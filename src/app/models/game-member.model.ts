import {MemberRole} from '../enums/memberRole';
import {Role} from '../enums/role';
import {RoundSummary} from './round-summary.model';

export interface GameMember {
  uid: string;
  role: MemberRole;
  username: string | null;
  joinedAt: any;

  mainRole?: Role;
  secondaryRole?: Role;
  aliveChampions?: string[];
  graveChampions?: string[];

  summarySubmittedRound?: number;
  summary?: RoundSummary;
}
