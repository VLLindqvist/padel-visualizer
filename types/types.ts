import { AtoZ, YearString } from "./utilityTypes.js";

// export type SQLDate = `${YearString}-${MonthAndDaysString}`;
export type CountryCode = `${AtoZ}${AtoZ}`;

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
  id: string;
  profileImgUrl: string;
  country: CountryCode;
  currentScore: number;
  consecutiveWins: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  yearlyStats: PlayerYearlyStats;
  courtPosition: "left" | "right";
  currentPartner: string;
  birthplace: string;
  birthdate: Date;
  height: number | null;
  hometown: string;
  category: PlayerCategory;
  imageUrls: string[];
  raceStats: RaceStats;
}

export type PlayerId = PlayerData["id"];

export interface Players {
  [id: PlayerId]: PlayerData;
}

export type PlayerRankingData = Pick<PlayerData, "id" | "firstName" | "middleName" | "lastName" | "category">;
export interface PlayersRankingData {
  [id: PlayerId]: PlayerRankingData;
}

export type TournamentPreRound = "1" | "2" | "3" | "4" | "5" | "6";
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
  id: string;
  pageUrl: string;
  name: string;
  year: YearString;
  place: string;
  dateFrom: Date;
  dateTo: Date;
  category: TournamentCategory;
  type: TournamentType;
  matches: Match[];
  posterUrl: string;
  images: string[];
  registeredTeams?: TournamentRegisteredTeam[];
}

export type TournamentId = Tournament["id"];

export interface Tournaments {
  [id: TournamentId]: Tournament;
}

export type TournamentPartialData = Pick<
  Tournament,
  "id" | "pageUrl" | "name" | "year" | "dateFrom" | "dateTo" | "category" | "place" | "type" | "posterUrl" | "images"
>;

export interface TournamentsPartialData {
  [id: TournamentId]: TournamentPartialData;
}

export interface TournamentsPartialDataDb {
  [id: TournamentId]: Pick<TournamentPartialData, "id" | "pageUrl" | "dateFrom" | "dateTo"> & {
    lastScraped: Date;
  };
}

export * as UtilityTypes from "./utilityTypes";
