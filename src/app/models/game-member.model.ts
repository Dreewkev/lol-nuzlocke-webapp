import {MemberRole} from '../enums/memberRole';
import {Role} from '../enums/role';

export interface GameMember {
  uid: string;
  role: MemberRole;
  username: string | null;
  joinedAt: any;

  round: number;
  mainRole?: Role;
  secondaryRole?: Role;
  aliveChampions?: string[];
  graveChampions?: string[];
}
