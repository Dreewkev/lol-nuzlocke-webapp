export type GameStatus = 'active' | 'archived';

export interface Game {
  name: string;
  ownerUid: string;
  status: GameStatus;
  inviteCode: string;
  createdAt: any;
  updatedAt: any;
}
