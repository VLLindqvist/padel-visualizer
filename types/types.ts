import { MonthAndDaysString, YearString } from "./utilityTypes.js";

export type SQLDate = `${YearString}-${MonthAndDaysString}`;

/* ==================== Response Types =========================*/
export interface PlayerRankingsResponse {
  res: boolean;
  data: [string, string];
}

export interface AllTournamentsPerYearResponse {
  res: boolean;
  data: string;
  total: number;
  total_results: number;
}

export interface WptResponse {
  res: boolean;
  data: string;
}
/* =============================================================*/

export interface PlayerTournamentPositions {
  winner: number;
  final: number;
  semi: number;
  quarter: number;
  roundOfEight: number;
  roundOfSixteen: number;
}

export interface PlayerStats {
  year: YearString;
  matchesPlayed: number;
  matchesWon: number;
  tournamentPositions: PlayerTournamentPositions;
}

export type PlayerYearlyStats = {
  [year in YearString]?: PlayerStats;
};

export type PlayerCategory = "female" | "male";

export interface RaceStats {
  ranking: number;
  points: number;
}

export interface PlayersRaceStats {
  [playerId: PlayerId]: RaceStats;
}

export interface PlayerData {
  ranking: number;
  firstName: string;
  middleName: string;
  lastName: string;
  profileUrl: string;
  profileImgUrl: string;
  country: string;
  currentScore: number;
  consecutiveWins: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  yearlyStats: PlayerYearlyStats;
  courtPosition: "left" | "right";
  currentPartner: string;
  birthplace: string;
  birthdate: SQLDate;
  height: number;
  hometown: string;
  category: PlayerCategory;
  imageUrls: string[];
  raceStats: RaceStats;
}

export type PlayerId = PlayerData["profileUrl"];

export interface Players {
  [url: PlayerId]: PlayerData;
}

export type PlayerRankingData = Pick<PlayerData, "profileUrl" | "firstName" | "middleName" | "lastName" | "category">;

export type TournamentPreRound = "1" | "2" | "3" | "4";
export type TournamentMainRound = "final" | "semi" | "quarter" | "roundOfEight" | "roundOfSixteen";
export type TournamentRound = TournamentMainRound | TournamentPreRound;
export type TournamentPrePhase = "pre_qualy" | "qualy" | "local_qualy" | "final_qualy";
export type TournamentPhase = "main_draw" | TournamentPrePhase;
export type TournamentRoundInfo =
  | {
      round: TournamentPreRound;
      phase: TournamentPrePhase;
    }
  | {
      round: TournamentMainRound;
      phase: "main_draw";
    };

/**
 * [firstTeamScore, secondTeamScore, tieBreak]
 */
export type SetResults = [number, number, number?];

export type MatchResults = [SetResults, SetResults, SetResults?];

export type Match = TournamentRoundInfo & {
  firstTeam: [PlayerId | string, PlayerId | string];
  secondTeam: [PlayerId | string, PlayerId | string];
  category: PlayerCategory;
  results: MatchResults;
};

export type MatchId = `${
  | `${TournamentPrePhase}-${"1" | "2" | "3"}`
  | `main draw-${"final" | "semi" | "quarter" | "roundOfEight" | "roundOfSixteen"}`}-${number}`;

export interface Matches {
  [id: MatchId]: Match;
}

export type TournamentCategory = "male" | "female" | "both";
export type TournamentType = "open" | "master" | "masterfinal" | "challenger" | "exhibition" | "unknown";

export interface TournamentGeneral {
  referees?: string[];
}

export interface TournamentRegisteredTeam {
  players: [PlayerId | string, PlayerId | string];
  category: PlayerCategory;
}

export interface Tournament extends TournamentGeneral {
  url: string;
  pageUrl: string;
  name: string;
  year: YearString;
  place: string;
  dateFrom: SQLDate;
  dateTo: SQLDate;
  category: TournamentCategory;
  type: TournamentType;
  matches: Matches;
  posterUrl: string;
  images: string[];
  registeredTeams?: TournamentRegisteredTeam[];
}

export type TournamentId = Tournament["url"];

export interface Tournaments {
  [url: TournamentId]: Tournament;
}

export type TournamentsPartialData = Pick<
  Tournament,
  "url" | "pageUrl" | "name" | "year" | "dateFrom" | "dateTo" | "category" | "place" | "type" | "posterUrl" | "images"
>;

export * as UtilityTypes from "./utilityTypes";
