import {MemberRole} from '../enums/memberRole';

export interface GameRef {
  gameId: string;
  role: MemberRole;
  joinedAt: any;
}
