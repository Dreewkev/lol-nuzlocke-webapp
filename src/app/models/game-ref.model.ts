import {MemberRole} from '../enums/memberRole';

export interface GameRef {
  gameId: string;
  gameName: string;
  role: MemberRole;
  joinedAt: any;
}
