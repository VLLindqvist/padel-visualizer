import { existsSync, mkdirSync, writeFileSync } from "fs";
import cloneDeep from "lodash.clonedeep";
import { DateTime } from "luxon";
import { escape, RowDataPacket } from "mysql2/promise";
import { Match, Tournaments, TournamentsPartialDataDb } from "wpt-scraper-types";

import mysqlConnection, { sql } from "./index.js";
import { isDev } from "../constants";

export async function getTournamentsPartialFromDB() {
  const db = await mysqlConnection();
  const [tournamentsArr] = (await db.execute(
    sql`
    SELECT t.id, t.page_url, t.date_from, t.date_to, t.last_scraped

    FROM tournaments AS t
    GROUP BY t.id;
    `,
    [new Date().getFullYear()],
  )) as [RowDataPacket[], any];
  await db.end();

  let tournaments: TournamentsPartialDataDb = {};

  if (tournamentsArr && Array.isArray(tournamentsArr)) {
    for (const tournament of tournamentsArr) {
      tournaments[tournament.id] = {
        id: tournament.id,
        pageUrl: tournament.pageUrl,
        dateFrom: tournament.dateFrom,
        dateTo: tournament.dateTo,
        lastScraped: tournament.last_scraped,
      };
    }
  }

  return tournaments;
}

export async function insertTournamentsInDb(tournaments: Tournaments) {
  let tournamentParams: any[][] = [];
  let tournamentImagesParams: any[][] = [];
  let tournamentRefereesParams: any[][] = [];
  let refereesParams: [string][] = [];
  let tournamentTypesParams: [string][] = [];
  let registeredTeamsSql: string[] = [];
  let setResultsSql: string[] = [];

  await new Promise<void>(async (r1) => {
    let tournamentsTemp = cloneDeep(tournaments);
    while (true) {
      if (!Object.values(tournamentsTemp).length) return r1();
      const [id, tournament] = Object.entries(tournamentsTemp)[0];
      delete tournamentsTemp[id];

      tournamentTypesParams = [...tournamentTypesParams, [tournament.type]];

      const dateFrom = (
        typeof tournament.dateFrom === "string"
          ? DateTime.fromISO(tournament.dateFrom)
          : DateTime.fromJSDate(tournament.dateFrom)
      ).toSQLDate();
      const dateTo = (
        typeof tournament.dateTo === "string"
          ? DateTime.fromISO(tournament.dateTo)
          : DateTime.fromJSDate(tournament.dateTo)
      ).toSQLDate();

      tournamentParams = [
        ...tournamentParams,
        [
          tournament.id,
          tournament.pageUrl,
          tournament.name,
          tournament.year,
          tournament.place,
          dateFrom,
          dateTo,
          tournament.category,
          tournament.type,
          tournament.posterUrl,
        ],
      ];

      for (const image of tournament.images) {
        tournamentImagesParams = [...tournamentImagesParams, [tournament.id, image]];
      }

      if (tournament.referees) {
        for (const referee of tournament.referees) {
          refereesParams = [...refereesParams, [referee]];
          tournamentRefereesParams = [...tournamentRefereesParams, [tournament.id, referee]];
        }
      }

      // REGISTERED TEAMS
      await new Promise<void>(async (r2) => {
        if (!tournament.registeredTeams) return r2();
        let teamsTemp = cloneDeep(tournament.registeredTeams);

        while (true) {
          if (!teamsTemp.length || !teamsTemp[0]) return r2();
          const team = teamsTemp.shift()!;

          const [p1, p2] = team.players;

          const tournamentTeamsColumns = ["`tournament`", "`team`"];

          registeredTeamsSql = [
            ...registeredTeamsSql,
            sql`
          CALL create_team(${escape(p1)}, ${escape(p2)}, @team_id);
          
          INSERT IGNORE INTO tournament_teams
            (${tournamentTeamsColumns.join(",")})
            VALUES
            (${escape(tournament.id)}, @team_id);
          `,
          ];
        }
      });

      // MATCHES
      await new Promise<void>(async (r3) => {
        if (!tournament.matches) return r3();
        let matchesTemp = cloneDeep(tournament.matches);

        while (true) {
          if (!matchesTemp.length || !matchesTemp[0]) return r3();
          const match = matchesTemp.shift()!;
          const [t1p1, t1p2] = match.firstTeam;
          const [t2p1, t2p2] = match.secondTeam;
          const [set1Res, set2Res, set3Res] = match.results;

          setResultsSql = [
            ...setResultsSql,
            sql`
          START TRANSACTION;
          CALL create_team(${escape(t1p1)}, ${escape(t1p2)}, @first_team_id);
          CALL create_team(${escape(t2p1)}, ${escape(t2p2)}, @second_team_id);

          CALL add_set_result(${escape(tournament.id)}, @first_team_id, @second_team_id, ${escape(
              match.phase,
            )}, ${escape(match.round)}, '1', ${escape(set1Res[0])}, ${escape(set1Res[1])});
          CALL add_set_result(${escape(tournament.id)}, @first_team_id, @second_team_id, ${escape(
              match.phase,
            )}, ${escape(match.round)}, '2', ${escape(set2Res[0])}, ${escape(set2Res[1])});
          ${
            set3Res && Array.isArray(set3Res) && set3Res.length >= 2
              ? sql`
          CALL add_set_result(${escape(tournament.id)}, @first_team_id, @second_team_id, ${escape(
                  match.phase,
                )}, ${escape(match.round)}, '3', ${escape(set3Res[0])}, ${escape(set3Res[1])});`
              : ""
          }
          COMMIT;
          `,
          ];
        }
      });
    }
  });

  const tournamentColumns = [
    "id",
    "page_url",
    "name",
    "year",
    "place",
    "date_from",
    "date_to",
    "category",
    "type",
    "poster_url",
  ];
  const tournamentImagesColumns = ["tournament", "image_url"];
  const refereesColumns = ["name"];
  const tournamentRefereesColumns = ["tournament", "referee"];
  const tournamentTypesColumns = ["name"];

  tournamentTypesParams = [...new Set(tournamentTypesParams)];
  refereesParams = [...new Set(refereesParams)];

  const db = await mysqlConnection();

  let query = sql`
    INSERT IGNORE INTO tournament_types
    (${db.escapeId(tournamentTypesColumns)})
    VALUES
    ${db.escape(tournamentTypesParams)}
  `;
  await db.query(query);
  let totQuery = query;

  query = sql`
    INSERT IGNORE INTO referees
    (${db.escapeId(refereesColumns)})
    VALUES
    ${db.escape(refereesParams)};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    INSERT INTO tournaments
    (${db.escapeId(tournamentColumns)})
    VALUES
    ${db.escape(tournamentParams)}
    ON DUPLICATE KEY UPDATE
    ${tournamentColumns.map((c) => sql`${db.escapeId(c)}=VALUES(${db.escapeId(c)})`).join(",")};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    INSERT IGNORE INTO tournament_referees
    (${db.escapeId(tournamentRefereesColumns)})
    VALUES
    ${db.escape(tournamentRefereesParams)};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    INSERT IGNORE INTO tournament_images
    (${db.escapeId(tournamentImagesColumns)})
    VALUES
    ${db.escape(tournamentImagesParams)};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    ${registeredTeamsSql.join("")}
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    ${setResultsSql.join("")}  
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    CALL update_team_first_last_tournament();
    CALL update_current_team();
  `;
  await db.query(query);
  totQuery += query;

  if (isDev) {
    if (!existsSync("temp")) {
      mkdirSync("temp");
    }
    writeFileSync("temp/tournamentsQuery.sql", totQuery);
  }

  await db.end();
}
