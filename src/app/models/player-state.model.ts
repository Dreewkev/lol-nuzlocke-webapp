import {MemberRole} from '../enums/memberRole';


export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  roleCounts: Record<string, number>; // später typisieren
  champCounts: Record<string, number>;
  champWins: Record<string, number>;
}

export interface PlayerState {
  uid: string;
  username: string | null;
  role: MemberRole;
  joinedAt?: any;
  aliveChampionIds: string[];
  graveChampionIds: string[];
  stats: PlayerStats;
}
