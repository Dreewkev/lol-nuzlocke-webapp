export type GameStatus = 'active' | 'archived';

export interface Game {
  name: string;
  ownerUid: string;
  status: GameStatus;
  inviteCode: string;
  inviteEnabled: boolean;
  createdAt: any;
  updatedAt: any;
}
