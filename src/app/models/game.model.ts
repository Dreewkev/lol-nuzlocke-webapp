import {GameStatus} from '../enums/gamestatus';

export interface Game {
  name: string;
  ownerUid: string;
  status: GameStatus;
  inviteCode: string;
  createdAt: any;
  updatedAt: any;
}
