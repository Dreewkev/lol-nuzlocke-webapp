export type MemberRole = 'owner' | 'member';

export interface GameMember {
  uid: string;
  role: MemberRole;
  username: string | null;
  joinedAt: any;
}
