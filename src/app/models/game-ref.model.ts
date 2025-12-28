import { MemberRole } from './game-member.model';

export interface GameRef {
  gameId: string;
  role: MemberRole;
  joinedAt: any;
}
