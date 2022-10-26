import { PlayerId } from "../types";

/* ==================== Response Types =========================*/
export interface PlayerRankingsResponse {
  res: boolean;
  data: [string, string];
}

export interface WptResponse {
  res: boolean;
  data: string;
}
/* =============================================================*/

export interface SPlayersLastScraped {
  [id: PlayerId]: Date;
}
