import {MemberRole} from '../enums/memberRole';

export interface GameMember {
  uid: string;
  role: MemberRole;
  username: string | null;
  joinedAt: any;
}
