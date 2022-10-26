import { countries } from "country-data";
import cloneDeep from "lodash.clonedeep";
import { DateTime } from "luxon";
import { RowDataPacket } from "mysql2/promise";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Players, PlayerStats, RaceStats, SPlayersLastScraped } from "wpt-scraper-types";

import mysqlConnection, { sql } from "./index.js";
import { FLAG_BASE_URL, isDev } from "../constants";

export async function getPlayersLastScrapedFromDB() {
  const db = await mysqlConnection();
  const [playersArrDB] = (await db.execute(
    sql`
    SELECT p.id, p.last_scraped

    FROM players AS p
    GROUP BY p.id;
    `,
    [new Date().getFullYear()],
  )) as [RowDataPacket[], any];
  await db.end();

  let players: SPlayersLastScraped = {};

  if (playersArrDB && Array.isArray(playersArrDB)) {
    for (const player of playersArrDB) {
      players[player.id] = player.last_scraped;
    }
  }

  return players;
}

export async function insertPlayersInDb(players: Players) {
  let countriesParams: [string, string, string][] = [];
  let playerParams: any[][] = [];
  let playerImagesParams: any[][] = [];
  let playerYearlyStatsParams: any[][] = [];
  let playerYearlyRaceStatsParams: any[][] = [];

  await new Promise<void>(async (r1) => {
    let playersTemp = cloneDeep(players);
    while (true) {
      if (!Object.values(playersTemp).length) return r1();
      const [id, player] = Object.entries(playersTemp)[0];
      delete playersTemp[id];

      let category = player.category;
      if (!category) {
        const db = await mysqlConnection();
        const [catArrDB] = await db.query(sql`
            SELECT m.category
            FROM matches AS m
            INNER JOIN player_teams as pt1 ON pt1.team = m.first_team
            INNER JOIN player_teams as pt2 ON pt2.team = m.second_team
            WHERE pt1.player = ${db.escape(id)}
            OR pt2.player = ${db.escape(id)}
            ORDER BY pt1.player
            LIMIT 1;
          `);
        await db.end();

        if (catArrDB && Array.isArray(catArrDB) && catArrDB.length) {
          category = (catArrDB[0] as RowDataPacket).category;
        }
      }

      const birthdate = (
        typeof player.birthdate === "string"
          ? DateTime.fromISO(player.birthdate)
          : DateTime.fromJSDate(player.birthdate)
      ).toSQLDate();

      playerParams = [
        ...playerParams,
        [
          player.id,
          player.firstName,
          player.middleName,
          player.lastName,
          player.currentScore,
          player.ranking,
          player.profileImgUrl,
          player.country in countries ? player.country : null,
          player.birthplace,
          birthdate,
          player.height,
          player.hometown,
          player.consecutiveWins,
          player.totalMatchesPlayed,
          player.totalMatchesWon,
          player.courtPosition,
          category,
        ],
      ];

      for (const image of player.imageUrls) {
        playerImagesParams = [...playerImagesParams, [player.id, image]];
      }

      if (player.country in countries) {
        const countryInfo = countries[player.country];
        countriesParams = [
          ...countriesParams,
          [player.country, countryInfo.name, `${FLAG_BASE_URL}/${player.country}.png`],
        ];
      }

      // YEARLY STATS
      await new Promise<void>(async (r2) => {
        if (!player.yearlyStats) return r2();
        let yearlyStatsTemp = cloneDeep(Object.values(player.yearlyStats)) as PlayerStats[];

        while (true) {
          if (!yearlyStatsTemp.length || !yearlyStatsTemp[0]) return r2();
          const stats = yearlyStatsTemp.shift()!;

          playerYearlyStatsParams = [
            ...playerYearlyStatsParams,
            [
              player.id,
              stats.year,
              stats.matchesPlayed,
              stats.matchesWon,
              stats.tournamentPositions.winner,
              stats.tournamentPositions.final,
              stats.tournamentPositions.semi,
              stats.tournamentPositions.quarter,
              stats.tournamentPositions.roundOfEight,
              stats.tournamentPositions.roundOfSixteen,
            ],
          ];
        }
      });

      // RACE STATS
      await new Promise<void>(async (r3) => {
        if (!player.raceStats) return r3();
        let raceStatsTemp = cloneDeep(Object.values(player.raceStats)) as RaceStats[];

        while (true) {
          if (!raceStatsTemp.length || !raceStatsTemp[0]) return r3();
          const stats = raceStatsTemp.shift()!;

          playerYearlyRaceStatsParams = [
            ...playerYearlyRaceStatsParams,
            [player.id, new Date().getFullYear(), stats.points, stats.ranking],
          ];
        }
      });
    }
  });

  const playerColumns = [
    "id",
    "first_name",
    "middle_name",
    "last_name",
    "points",
    "rank",
    "profile_image_url",
    "country",
    "birthplace",
    "birthdate",
    "height",
    "hometown",
    "consecutive_wins",
    "total_matches_played",
    "total_matches_won",
    "preferred_court_position",
    "category",
  ];
  const playerImagesColumns = ["player", "image_url"];
  const countriesColumns = ["country_code", "name", "image_url"];
  const playerYearlyStatsColumns = [
    "player",
    "year",
    "matches_played",
    "matches_won",
    "tournament_wins",
    "tournament_finals",
    "tournament_semis",
    "tournament_quarters",
    "tournament_round_of_eight",
    "tournament_round_of_sixteen",
  ];
  const playerYearlyRaceStatsColumns = ["player", "year", "points", "rank"];

  const map = new Map(countriesParams.map((c) => [c[0], c]));
  countriesParams = [...map.values()];

  const db = await mysqlConnection();

  let query = sql`
    INSERT IGNORE INTO countries
    (${db.escapeId(countriesColumns)})
    VALUES
    ${db.escape(countriesParams)};
  `;
  await db.query(query);
  let totQuery = query;

  query = sql`
    INSERT INTO players
    (${db.escapeId(playerColumns)})
    VALUES
    ${db.escape(playerParams)}
    ON DUPLICATE KEY UPDATE
    ${playerColumns.map((c) => sql`${db.escapeId(c)}=VALUES(${db.escapeId(c)})`).join(",")};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    INSERT IGNORE INTO player_images
    (${db.escapeId(playerImagesColumns)})
    VALUES
    ${db.escape(playerImagesParams)};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    INSERT IGNORE INTO player_yearly_stats
    (${db.escapeId(playerYearlyStatsColumns)})
    VALUES
    ${db.escape(playerYearlyStatsParams)};
  `;
  await db.query(query);
  totQuery += query;

  query = sql`
    INSERT IGNORE INTO player_race_stats
    (${db.escapeId(playerYearlyRaceStatsColumns)})
    VALUES
    ${db.escape(playerYearlyRaceStatsParams)};
    `;
  await db.query(query);
  totQuery += query;

  if (isDev) {
    if (!existsSync("temp")) {
      mkdirSync("temp");
    }
    writeFileSync("temp/playersQuery.sql", totQuery);
  }

  await db.end();
}

// export async function getPlayersFromDB(db: Connection) {
//   const [playersArr] = (await db.execute(
//     sql`
//     SELECT p.id, p.first_name, p.middle_name, p.last_name, p.points,
//     p.rank, p.profile_image_url, p.country, p.birthplace,
//     p.birthdate, p.height, p.hometown, p.consecutive_wins, p.total_matches_played,
//     p.total_matches_won, p.preferred_court_position, p.category, p.last_scraped,
//     GROUP_CONCAT(DISTINCT pt.player SEPARATOR '--.--') AS current_partner,
//     GROUP_CONCAT(DISTINCT pim.image_url SEPARATOR '--.--') as image_urls,
//     GROUP_CONCAT(DISTINCT CONCAT(prs.year, '--.--', prs.points, '--.--', prs.rank) ORDER BY prs.year DESC SEPARATOR '--..--') as race_stats,
//     GROUP_CONCAT(
//       DISTINCT CONCAT(
//         pys.year, '--.--', pys.matches_played, '--.--', pys.matches_won, '--.--', pys.tournament_wins, '--.--',
//         pys.tournament_finals, '--.--', pys.tournament_semis, '--.--', pys.tournament_quarters, '--.--',
//         pys.tournament_round_of_eight, '--.--', pys.tournament_round_of_sixteen
//       ) SEPARATOR '--..--'
//     ) as yearly_stats

//     FROM players AS p
//     LEFT JOIN player_teams AS pt ON p.current_team = pt.team AND pt.player != p.id
//     LEFT JOIN player_images AS pim ON p.id = pim.player
//     LEFT JOIN player_race_stats AS prs ON p.id = prs.player AND prs.year = ?
//     LEFT JOIN player_yearly_stats AS pys ON p.id = pys.player
//     GROUP BY p.id;
//     `,
//     [new Date().getFullYear()],
//   )) as [RowDataPacket[], any];

//   let players: ScraperPlayersDb = {};

//   if (playersArr && Array.isArray(playersArr)) {
//     for (const player of playersArr) {
//       let raceStats = {} as RaceStats;
//       await new Promise<void>((resolve) => {
//         (player.race_stats as string)
//           .split("--..--")[0]
//           .split("--.--")
//           .forEach((s, i, arr) => {
//             if (i === 0) {
//             } else if (i === 1) {
//               raceStats.points = Number.parseInt(s);
//             } else if (i === 2) {
//               raceStats.ranking = Number.parseInt(s);
//             }

//             if (i === arr.length - 1) {
//               resolve();
//             }
//           });
//       });

//       let yearlyStats = {} as PlayerYearlyStats;
//       await Promise.all(
//         (player.yearly_stats as string).split("--..--").map((_s) => {
//           let year: YearString;
//           new Promise<void>((resolve) => {
//             _s.split("--.--").forEach((s, i, arr) => {
//               if (i === 0) {
//                 year = s as YearString;
//                 yearlyStats[year] = {
//                   year,
//                   matchesPlayed: -1,
//                   matchesWon: -1,
//                   tournamentPositions: {
//                     winner: -1,
//                     final: -1,
//                     semi: -1,
//                     quarter: -1,
//                     roundOfEight: -1,
//                     roundOfSixteen: -1,
//                   },
//                 };
//               } else if (i === 1) {
//                 yearlyStats[year]!.matchesPlayed = Number.parseInt(s);
//               } else if (i === 2) {
//                 yearlyStats[year]!.matchesWon = Number.parseInt(s);
//               } else if (i === 3) {
//                 yearlyStats[year]!.tournamentPositions!.winner = Number.parseInt(s);
//               } else if (i === 4) {
//                 yearlyStats[year]!.tournamentPositions!.final = Number.parseInt(s);
//               } else if (i === 5) {
//                 yearlyStats[year]!.tournamentPositions!.semi = Number.parseInt(s);
//               } else if (i === 6) {
//                 yearlyStats[year]!.tournamentPositions!.quarter = Number.parseInt(s);
//               } else if (i === 7) {
//                 yearlyStats[year]!.tournamentPositions!.roundOfEight = Number.parseInt(s);
//               } else if (i === 8) {
//                 yearlyStats[year]!.tournamentPositions!.roundOfSixteen = Number.parseInt(s);
//               }

//               if (i === arr.length - 1) {
//                 resolve();
//               }
//             });
//           });
//         }),
//       );

//       players[player.id] = {
//         id: player.id,
//         firstName: player.first_name,
//         middleName: player.middle_name,
//         lastName: player.last_name,
//         currentScore: player.points,
//         ranking: player.rank,
//         profileImgUrl: player.profile_image_url,
//         country: player.country,
//         birthplace: player.birthplace,
//         birthdate: player.birthdate,
//         height: player.height,
//         hometown: player.hometown,
//         consecutiveWins: player.consecutive_wins,
//         totalMatchesPlayed: player.total_matches_played,
//         totalMatchesWon: player.total_matches_won,
//         courtPosition: player.preferred_court_position,
//         category: player.category,
//         currentPartner: player.current_partner,
//         imageUrls: player.image_urls.split("--.--"),
//         raceStats,
//         yearlyStats,
//         lastScraped: player.last_scraped,
//       };
//     }
//   }

//   return players;
// }
