import { CheerioAPI, load as cheerioLoad } from "cheerio";
import FormData from "form-data";
import fetch, { Headers, RequestInit, Response } from "node-fetch";
import { countries } from "country-data";
import {
  PlayerTournamentPositions,
  PlayersRankingData,
  PlayerCategory,
  PlayerRankingsResponse,
  Players,
  PlayerYearlyStats,
  PlayersRaceStats,
  RaceStats,
  PlayerId,
  YearString,
  CountryCode,
  PlayerRankingData,
} from "wpt-scraper-types";
import { DateTime } from "luxon";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import cloneDeep from "lodash.clonedeep";

import languageHelper, { CourtPosition } from "./languageHelper";
import { RACE_LINK, YEAR_REGEX, PLAYER_BASE_URL, isDev, RETRY_TIMEOUT, NUMBER_OF_RETRIES } from "./constants";
import { getPlayersLastScrapedFromDB, insertPlayersInDb } from "./db/players.js";
import Cache from "./cache";
import mysqlConnection, { sql } from "./db/index.js";

async function getPlayerRankings(ids?: string[]): Promise<PlayersRankingData> {
  async function fetchFunction(section: number) {
    const headers = new Headers();
    headers.append("x-requested-with", "XMLHttpRequest");
    headers.append("Cookie", "language=en");

    const formData = new FormData();
    formData.append("lang", "en");
    formData.append("section_data[]", "filtro");
    formData.append("section_data[]", "todos");
    formData.append("section_data[]", section.toString());

    const options: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      redirect: "follow",
    };

    const fetchUrl = "https://www.worldpadeltour.com/info-ranking";
    const cacheKey = `${fetchUrl}----page${section}`;

    let data = Cache.nc.get(cacheKey) as PlayerRankingsResponse | undefined;

    if (!data) {
      let retries = 0;
      while (true) {
        const res = await fetch(fetchUrl, options);

        if (!res.ok) {
          if (retries <= NUMBER_OF_RETRIES) {
            ++retries;
            await new Promise<void>((r) =>
              setTimeout(() => {
                r();
              }, RETRY_TIMEOUT),
            );
            continue;
          }
          throw { code: 1 };
        }

        data = await res.json();
        break;
      }
    }
    data = data!;

    Cache.nc.set(cacheKey, data);
    if (!data.res || (data.data[0] === "" && data.data[1] === "")) {
      throw { code: 2 };
    }

    return data;
  }

  function parseHTML($: CheerioAPI, category: PlayerCategory, rankings: PlayersRankingData): PlayersRankingData {
    for (const card of $(".c-trigger")) {
      try {
        let id: PlayerId = card.attribs.href.trim();
        if (id.endsWith("/")) {
          const arr = id.split("/");
          id = arr[arr.length - 2];
        } else {
          const arr = id.split("/");
          id = arr[arr.length - 1];
        }
        if (ids && !ids.includes(id)) continue;

        const fullName = $(".c-player-card__name", card).html()?.split("<br>").slice(0, 3)!;
        const firstName = fullName[0];
        const middleName = fullName[1];
        const lastName = fullName[2];

        const scoreStr = $(".c-player-card__score", card).text().trim();
        const score = Number.parseInt(scoreStr);
        if (Number.isNaN(score)) {
          console.log("NaN-value found for player score in ranking", score, fullName);
        }
        if (!ids && score <= 10) throw new Error();

        const data = {
          id,
          firstName,
          middleName,
          lastName,
          category,
        };

        rankings[id] = data;

        if (ids && Object.keys(ids).every((_id) => Object.keys(rankings).includes(_id))) {
          break;
        }
      } catch (err) {
        console.error(
          `Error when parsing data for ${$(".c-player-card__name", card).text()} (${card.attribs.href.replace(
            "jugadores",
            "en/players",
          )}): ${err}`,
        );
      }
    }

    return rankings;
  }

  let rankings: PlayersRankingData = {};

  for (let i = 0; isDev && !ids ? i < 1 : i < Infinity; ++i) {
    let data: PlayerRankingsResponse;
    try {
      data = await fetchFunction(i);
    } catch (_err) {
      const err = _err as any;
      if (err.code === 1) {
        throw new Error(`[getPlayerRankingList]: Response ${i} not ok`);
      } else if (err.code === 2) {
        console.log(`[getPlayerRankingList] Response for ${i} no good`);
        break;
      }
    }

    const {
      data: [menRankingsHTML, womenRankingsHTML],
    } = data!;

    try {
      if (menRankingsHTML !== "") {
        rankings = parseHTML(cheerioLoad(menRankingsHTML), "male", rankings);
      }
      if (womenRankingsHTML !== "" && ids && ids.length > Object.keys(rankings).length) {
        rankings = parseHTML(cheerioLoad(womenRankingsHTML), "female", rankings);
      }
    } catch (err) {
      console.log("[getPlayerRankings] Stopped scraping ranking. Reached players under point limit.");
    }

    if (womenRankingsHTML === "" && menRankingsHTML === "") {
      break;
    }
  }

  return rankings;
}

async function getPlayerRaceStats(ids?: string[]): Promise<PlayersRaceStats> {
  async function fetchFunction() {
    const headers = new Headers();
    headers.append("Cookie", "language=en");

    const options: RequestInit = {
      method: "GET",
      headers,
      redirect: "follow",
    };

    let data = Cache.nc.get(RACE_LINK) as string | undefined;

    if (!data) {
      let retries = 0;
      while (true) {
        const res = await fetch(RACE_LINK, options);

        if (!res.ok) {
          if (retries <= NUMBER_OF_RETRIES) {
            ++retries;
            await new Promise<void>((r) =>
              setTimeout(() => {
                r();
              }, RETRY_TIMEOUT),
            );
            continue;
          }
          throw { code: 1 };
        }

        data = await res.text();
        break;
      }
    }
    data = data!;

    Cache.nc.set(RACE_LINK, data);

    return data;
  }

  function parseHTML($: CheerioAPI): PlayersRaceStats {
    let stats: PlayersRaceStats = {};
    const container = $(".c-ranking");

    for (const playerCard of $(".c-race", container)) {
      const playerInfo = $(".c-race__player", playerCard);

      try {
        let id = $("a", playerInfo)[0].attribs.href.trim();
        if (id.endsWith("/")) {
          const arr = id.split("/");
          id = arr[arr.length - 2];
        } else {
          const arr = id.split("/");
          id = arr[arr.length - 1];
        }
        if (ids && !ids.includes(id)) continue;

        const pointsContainer = $(".c-race__content:nth-of-type(2)", playerInfo);
        const points = Number.parseInt($("p", pointsContainer).text().replace("pts", "").trim());
        if (Number.isNaN(points)) {
          console.log("NaN-value found for player points in race", points);
        }

        const rankingContainer = $(".c-race__position-content", playerInfo);
        const ranking = Number.parseInt($("p", rankingContainer).text().trim());
        if (Number.isNaN(ranking)) {
          console.log("NaN-value found for player ranking in race", ranking);
        }

        const data: RaceStats = {
          points,
          ranking,
        };

        stats = { ...stats, [id]: data };

        if (ids && Object.keys(ids).every((_id) => Object.keys(stats).includes(_id))) {
          break;
        }
      } catch (err) {
        console.error(`Error when parsing data for ${$("a", playerInfo).text()}: ${err}`);
      }
    }

    return stats;
  }

  let raceHtml: string;
  try {
    raceHtml = await fetchFunction();
  } catch (_err) {
    const err = _err as any;
    if (err.code === 1) {
      throw new Error(`[getPlayerRaceStats]: Response not ok`);
    }
  }

  return parseHTML(cheerioLoad(raceHtml!)) ?? {};
}

/**
 *
 * @param ids the ids of specific players to scrape. If undefined => scrape all players
 */
export async function scrapePlayers(ids?: string[]): Promise<Players> {
  if (ids && (!Array.isArray(ids) || (Array.isArray(ids) && !ids.length))) {
    throw Error('[scrapePlayers] Can\'t give empty array as "ids"');
  }

  async function fetchFunction(_id: string) {
    const headers = new Headers();
    headers.append("Cookie", "language=en");

    const options: RequestInit = {
      method: "GET",
      headers,
      redirect: "follow",
    };

    const url = `${PLAYER_BASE_URL}/${_id}`;

    let data = Cache.nc.get(url) as string | undefined;

    if (!data) {
      let retries = 0;
      while (true) {
        const res = await fetch(url, options);

        if (!res.ok) {
          if (retries <= NUMBER_OF_RETRIES) {
            ++retries;
            await new Promise<void>((r) =>
              setTimeout(() => {
                r();
              }, RETRY_TIMEOUT),
            );
            continue;
          }
          throw { code: 1 };
        }

        data = await res.text();
        break;
      }
    }
    data = data!;

    Cache.nc.set(url, data);

    return data;
  }

  function parseHTML($: CheerioAPI, currentPlayerId: PlayerId, playerRankingData?: PlayerRankingData) {
    const container = $("#site-container");
    try {
      const initialPlayerInfoContainer = $(".c-player", container);

      const playerBannerImg = $(".c-player__img", initialPlayerInfoContainer)![0]!.attribs.src;
      const imageUrls = [playerBannerImg];

      /**
       * Contains name, ranking, points and flag
       */
      const headerContainer = $(".c-ranking-header", initialPlayerInfoContainer);

      const name = playerRankingData ? undefined : $(".c-ranking-header__title", headerContainer).text().trim();
      let firstName: string = "";
      let middleName: string = "";
      let lastName: string = "";
      if (name) {
        const nameArr = name
          .replace(/  +/g, " ") // Replace multiple spaces with one space
          .split(" ");
        nameArr.map((n) => `${n[0].toUpperCase()}${n.slice(1).toLowerCase()}`);
        if (nameArr.length === 3) {
          firstName = nameArr[0];
          middleName = nameArr[1];
          lastName = nameArr[2];
        } else if (nameArr.length === 2) {
          firstName = nameArr[0];
          lastName = nameArr[1];
        } else {
          firstName = nameArr[0];
        }
      }

      const [rankingNode, scoreNode] = $(".c-ranking-header__data-box", headerContainer);
      const ranking = Number.parseInt($(".c-ranking-header__data", rankingNode).text());
      const currentScore = Number.parseInt($(".c-ranking-header__data", scoreNode).text());
      if (Number.isNaN(ranking)) {
        console.log("NaN-value found for player ranking", ranking);
      }
      if (Number.isNaN(currentScore)) {
        console.log("NaN-value found for player score", currentScore);
      }

      const flagName = $("img", headerContainer)![0].attribs.src.split("/").pop()!.slice(0, 2).toUpperCase();
      const country = (flagName in countries ? countries[flagName].alpha2 : "zz") as CountryCode;

      /**
       * Contains profileImg, partner, courtPosition, birthplace, birthdate, height, hometown
       */
      const playerFooter = $(".c-player__footer", initialPlayerInfoContainer);

      const profileImgUrl = $(".c-player__img-container", playerFooter)
        .children(".u-img-cropped")!
        .css("background-image")!
        .match(/\((.*)\)/)!
        .pop()!
        .trim();

      const [currentPartnerNode, courtPositionNode, birthplaceNode, birthdateNode, heightNode, hometownNode] = $(
        ".c-player__data-item",
        playerFooter,
      );

      let currentPartner: PlayerId = $("p", currentPartnerNode).children()[0].attribs.href.trim();
      if (currentPartner.endsWith("/")) {
        const arr = currentPartner.split("/");
        currentPartner = arr[arr.length - 2];
      } else {
        const arr = currentPartner.split("/");
        currentPartner = arr[arr.length - 1];
      }

      const courtPositionRaw = $("p", courtPositionNode).text().toLowerCase() as CourtPosition;
      const courtPosition = languageHelper.court.position[courtPositionRaw];
      const birthplace = $("p", birthplaceNode).text();
      const birthdate = new Date($("p", birthdateNode).text()!.split("/").reverse().join("-"));
      const heighStr = $("p", heightNode).text().trim().split(",").join("");
      let height: number | null = Number.parseInt(heighStr);
      if (Number.isNaN(height)) {
        height = null;
      }
      const hometown = $("p", hometownNode).text().trim();

      const statsContainer = $(".c-ranking-header--table", container);
      const [totalMatchesPlayedNode, totalMatchesWonNode, __uu1, __uu2, consecutiveWinsNode] = $(
        ".c-ranking-header__data-box",
        statsContainer,
      );

      const totalMatchesPlayed = Number.parseInt($(".c-ranking-header__data", totalMatchesPlayedNode).text());
      const totalMatchesWon = Number.parseInt($(".c-ranking-header__data", totalMatchesWonNode).text());
      const consecutiveWins = Number.parseInt($(".c-ranking-header__data", consecutiveWinsNode).text());
      if (Number.isNaN(totalMatchesPlayed)) {
        console.log("NaN-value found for player's matches played", totalMatchesPlayed);
      }
      if (Number.isNaN(totalMatchesWon)) {
        console.log("NaN-value found for player's matches won", totalMatchesWon);
      }
      if (Number.isNaN(consecutiveWins)) {
        console.log("NaN-value found for player's consecutive wins", consecutiveWins);
      }

      let yearlyStats: PlayerYearlyStats = {};
      /**
       * contains yearlyStats and tournamentPointsBreakdown
       */
      const rankingHeadings = $(".c-ranking__heading");
      for (const rankingHeading of rankingHeadings) {
        const rankingHeadingText = $(rankingHeading).text().toLowerCase();
        if (rankingHeadingText !== "yearly stats") continue;

        const yearlyStatsWrapper = $(rankingHeading).parent().next();
        const yearlyStatsContainers = $(".c-flex-table--ranking", yearlyStatsWrapper);
        for (const yearlyStatsContainer of yearlyStatsContainers) {
          let year!: YearString;
          let matchesPlayed!: number;
          let matchesWon!: number;
          let tournamentPositions!: PlayerTournamentPositions;

          const tableHeadingContainers = $(".c-flex-table__heading", yearlyStatsContainer);
          for (const tableHeadingContainer of tableHeadingContainers) {
            const tableContainer = $(tableHeadingContainer).next();
            const headingText = $("h3", tableHeadingContainer).text().trim().toLowerCase();

            if (headingText.includes("stats")) {
              year = headingText.match(YEAR_REGEX)!.pop()! as YearString;

              const tableItemContainers = $(".c-flex-table__item", tableContainer);
              for (const tableItemContainer of tableItemContainers) {
                const titleText = $(".c-flex-table__item-title", tableItemContainer).text().toLowerCase();
                const data = Number.parseInt($(".c-flex-table__item-data", tableItemContainer).text().trim());
                if (Number.isNaN(data)) {
                  console.log("NaN-value found for player's yearly stats", data);
                }
                if (titleText.includes("played")) {
                  matchesPlayed = data;
                } else if (titleText.includes("won")) {
                  matchesWon = data;
                }
              }
            } else {
              let winner!: number;
              let final!: number;
              let semi!: number;
              let quarter!: number;
              let roundOfEight!: number;
              let roundOfSixteen!: number;

              const tableItemContainers = $(".c-flex-table__item", tableContainer);
              for (const tableItemContainer of tableItemContainers) {
                const titleText = $(".c-flex-table__item-title", tableItemContainer).text().toLowerCase();
                const data = Number.parseInt($(".c-flex-table__item-data", tableItemContainer).text().trim());
                if (Number.isNaN(data)) {
                  console.log("NaN-value found for player's tournament stats per year", data);
                }
                if (titleText === "winner") {
                  winner = data;
                } else if (titleText === "final") {
                  final = data;
                } else if (titleText === "semifinals") {
                  semi = data;
                } else if (titleText === "quarter finals") {
                  quarter = data;
                } else if (titleText === "1/8 round") {
                  roundOfEight = data;
                } else if (titleText === "1/16 round") {
                  roundOfSixteen = data;
                }
              }

              tournamentPositions = {
                winner,
                final,
                semi,
                quarter,
                roundOfEight,
                roundOfSixteen,
              };
            }
          }
          yearlyStats = {
            ...yearlyStats,
            [year]: {
              year,
              matchesPlayed,
              matchesWon,
              tournamentPositions,
            },
          };
        }
      }

      return Object.assign(
        {},
        {
          ranking,
          profileImgUrl,
          country,
          currentScore,
          currentPartner,
          courtPosition,
          birthplace,
          birthdate,
          height,
          hometown,
          imageUrls,
          totalMatchesPlayed,
          totalMatchesWon,
          consecutiveWins,
          yearlyStats,
        },
        name ? { id: currentPlayerId, firstName, middleName, lastName } : {},
      );
    } catch (err) {
      console.error(`Error when parsing data for player: ${err}`);
    }
  }

  const playersLastScraped = await getPlayersLastScrapedFromDB();

  let players: Players = {};
  let playersTemp: Players = {};

  if (isDev && existsSync(`.dev/players.json`)) {
    const file = readFileSync(`.dev/players.json`, { encoding: "utf8" });
    players = JSON.parse(file);

    if (ids) {
      playersTemp = cloneDeep(players);
      players = Object.fromEntries(Object.entries(players).filter(([_id]) => ids.includes(_id)));
    }
  }

  if (!isDev || (isDev && ids && ids.some((_id) => !(_id in players)))) {
    const playersRankingData = await getPlayerRankings(ids);
    const playersRaceStats = await getPlayerRaceStats(ids);

    for (const playerOrId of ids ?? Object.values(playersRankingData)) {
      const currentPlayerId = typeof playerOrId == "string" ? playerOrId : playerOrId.id;

      if (currentPlayerId in playersLastScraped) {
        const lastScraped = DateTime.fromJSDate(playersLastScraped[currentPlayerId]);
        if (lastScraped.diffNow().days > 30) {
          console.log("Trying to re-scrape player too soon");
          continue;
        }
      }

      let html: string;

      try {
        html = await fetchFunction(currentPlayerId);
      } catch (_err) {
        const err = _err as any;
        if (err.code === 1) {
          throw new Error(`[scrapePlayers]: Response ${currentPlayerId} not ok`);
        } else if (err.code === 2) {
          console.log(`[scrapePlayers] Response for ${currentPlayerId} no good`);
          break;
        }
      }

      const data = parseHTML(cheerioLoad(html!), currentPlayerId, playersRankingData[currentPlayerId]);

      if (data) {
        players[currentPlayerId] = {
          ...playersRankingData[currentPlayerId],
          ...data,
          raceStats: playersRaceStats[currentPlayerId],
        };
      }
    }

    if (isDev) {
      if (!existsSync(".dev")) {
        mkdirSync(".dev");
      }
      writeFileSync(`.dev/players.json`, JSON.stringify({ ...playersTemp, ...players }));
    }
  }

  insertPlayersInDb(players);

  return players;
}
