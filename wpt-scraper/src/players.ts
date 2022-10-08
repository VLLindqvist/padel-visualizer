import { CheerioAPI, load as cheerioLoad } from "cheerio";
import FormData from "form-data";
import fetch, { Headers, RequestInit } from "node-fetch";
import { countries } from "country-data";

import languageHelper, { CourtPosition } from "./languageHelper";
import {
  PlayerTournamentPositions,
  PlayerRankingData,
  PlayerCategory,
  PlayerRankingsResponse,
  Players,
  PlayerData,
  SQLDate,
  PlayerYearlyStats,
  PlayersRaceStats,
  RaceStats,
  PlayerId,
  YearString,
} from "wpt-scraper-types";
import { isDev, RACE_LINK, YEAR_REGEX } from "./constants";

async function getPlayerRankings(url?: string): Promise<PlayerRankingData[]> {
  function fetchFunction(section: number) {
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

    return fetch("https://www.worldpadeltour.com/info-ranking", options);
  }

  function parseHTML($: CheerioAPI, category: PlayerCategory): PlayerRankingData[] {
    let urls: PlayerRankingData[] = [];

    for (const card of $(".c-trigger")) {
      try {
        let profileUrl: PlayerId = card.attribs.href.trim();
        if (profileUrl.includes("en/")) {
          profileUrl = profileUrl.replace("en/", "");
        }
        profileUrl = profileUrl.replace("jugadores", "en/players");

        if (!!url && profileUrl !== url) continue;

        const fullName = $(".c-player-card__name", card).html()?.split("<br>").slice(0, 3)!;
        const firstName = fullName[0];
        const middleName = fullName[1];
        const lastName = fullName[2];

        const data = {
          profileUrl,
          firstName,
          middleName,
          lastName,
          category,
        };

        if (!!url && profileUrl === url) {
          urls = [data];
          break;
        } else {
          urls.push(data);
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

    return urls;
  }

  let rankingUrls: PlayerRankingData[] = [];

  for (let i = 0; isDev ? i < 1 : i < Infinity; ++i) {
    const res = await fetchFunction(i);

    if (!res.ok) {
      throw new Error(`[getPlayerRankingList]: Response ${i} not ok`);
    }
    const data = (await res.json()) as PlayerRankingsResponse;
    if (!data.res) throw new Error(`[getPlayerRankingList] Response ${i} no good`);

    const {
      data: [menRankingsHTML, womenRankingsHTML],
    } = data;

    if (menRankingsHTML !== "") {
      rankingUrls = [...rankingUrls, ...parseHTML(cheerioLoad(menRankingsHTML), "male")];
    }
    if (womenRankingsHTML !== "" && !!url && rankingUrls.length) {
      rankingUrls = [...rankingUrls, ...parseHTML(cheerioLoad(womenRankingsHTML), "female")];
    }

    if (womenRankingsHTML === "" && menRankingsHTML === "") {
      break;
    }
  }

  return rankingUrls;
}

async function getPlayerRaceStats(url?: string): Promise<PlayersRaceStats> {
  function fetchFunction() {
    const headers = new Headers();
    headers.append("Cookie", "language=en");

    const options: RequestInit = {
      method: "GET",
      headers,
      redirect: "follow",
    };

    return fetch(RACE_LINK, options);
  }

  function parseHTML($: CheerioAPI): [PlayerId, RaceStats][] {
    let stats: [PlayerId, RaceStats][] = [];
    const container = $(".c-ranking");

    for (const playerCard of $(".c-race", container)) {
      const playerInfo = $(".c-race__player", playerCard);

      try {
        let playerId: PlayerId = $("a", playerInfo)[0].attribs.href.trim();
        if (playerId.includes("en/")) {
          playerId = playerId.replace("en/", "");
        }
        playerId = playerId.replace("jugadores", "en/players");

        if (!!url && playerId !== url) continue;

        const pointsContainer = $(".c-race__content:nth-of-type(2)", playerInfo);
        const points = Number.parseInt($("p", pointsContainer).text().replace("pts", "").trim());

        const rankingContainer = $(".c-race__position-content", playerInfo);
        const ranking = Number.parseInt($("p", rankingContainer).text().trim());

        const data: [PlayerId, RaceStats] = [
          playerId,
          {
            points,
            ranking,
          },
        ];

        if (!!url && playerId === url) {
          stats = [data];
          break;
        } else {
          stats.push(data);
        }
      } catch (err) {
        console.error(`Error when parsing data for ${$("a", playerInfo).text()}: ${err}`);
      }
    }

    return stats;
  }

  let playersRaceStats: PlayersRaceStats = {};

  const res = await fetchFunction();

  if (!res.ok) {
    throw new Error(`[getPlayerRaceStats]: Response not ok`);
  }
  const raceHtml = await res.text();

  const idsAndStats = parseHTML(cheerioLoad(raceHtml));

  for (const [playerId, newStats] of idsAndStats) {
    playersRaceStats = { ...playersRaceStats, [playerId]: newStats };
  }

  return playersRaceStats;
}

export async function getPlayers(url?: string): Promise<Players> {
  function fetchFunction(url: string) {
    const headers = new Headers();
    headers.append("Cookie", "language=en");

    const options: RequestInit = {
      method: "GET",
      headers,
      redirect: "follow",
    };

    return fetch(url, options);
  }

  function parseHTML(
    $: CheerioAPI,
    playerRankingData: PlayerRankingData,
    raceStats: RaceStats,
  ): PlayerData | undefined {
    const container = $("#site-container");
    try {
      const initialPlayerInfoContainer = $(".c-player", container);

      const playerBannerImg = $(".c-player__img", initialPlayerInfoContainer)![0]!.attribs.src;
      const imageUrls = [playerBannerImg];

      /**
       * Contains name, ranking, points and flag
       */
      const headerContainer = $(".c-ranking-header", initialPlayerInfoContainer);

      const [rankingNode, scoreNode] = $(".c-ranking-header__data-box", headerContainer);
      const ranking = Number.parseInt($(".c-ranking-header__data", rankingNode).text());
      const currentScore = Number.parseInt($(".c-ranking-header__data", scoreNode).text());

      const flagName = $("img", headerContainer)![0].attribs.src.split("/").pop()!.slice(0, 2).toUpperCase();
      const country = flagName in countries ? countries[flagName].name : "unknown";

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
      if (currentPartner.includes("en/")) {
        currentPartner = currentPartner.replace("en/", "");
      }
      currentPartner = currentPartner.replace("jugadores", "en/players");

      const courtPositionRaw = $("p", courtPositionNode).text().toLowerCase() as CourtPosition;
      const courtPosition = languageHelper.court.position[courtPositionRaw];
      const birthplace = $("p", birthplaceNode).text();
      const birthdate = $("p", birthdateNode).text()!.split("/").reverse().join("-") as SQLDate;
      const height = Number.parseInt($("p", heightNode).text().split(",").join(""));
      const hometown = $("p", hometownNode).text();

      const statsContainer = $(".c-ranking-header--table", container);
      const [totalMatchesPlayedNode, totalMatchesWonNode, __uu1, __uu2, consecutiveWinsNode] = $(
        ".c-ranking-header__data-box",
        statsContainer,
      );

      const totalMatchesPlayed = Number.parseInt($(".c-ranking-header__data", totalMatchesPlayedNode).text());
      const totalMatchesWon = Number.parseInt($(".c-ranking-header__data", totalMatchesWonNode).text());
      const consecutiveWins = Number.parseInt($(".c-ranking-header__data", consecutiveWinsNode).text());

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

      return {
        ...playerRankingData,
        raceStats,
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
      };
    } catch (err) {
      console.error(`Error when parsing data for ${playerRankingData.profileUrl}: ${err}`);
    }
  }

  let players: Players = {};
  const playerRankingData = await getPlayerRankings(url);
  let playersRaceStats: PlayersRaceStats = {};
  if (!url) {
    playersRaceStats = await getPlayerRaceStats();
  }

  let isFirst = true;
  for (const player of playerRankingData) {
    if (isDev) {
      if (!isFirst) break;
      else isFirst = false;
    }

    const res = await fetchFunction(player.profileUrl);

    if (!res.ok) {
      throw new Error(`[getPlayers]: Response for ${player.profileUrl} not ok`);
    }

    if (isDev) {
      playersRaceStats = await getPlayerRaceStats(player.profileUrl);
    }
    if (!!url) {
      playersRaceStats = await getPlayerRaceStats(url);
    }

    const data = parseHTML(cheerioLoad(await res.text()), player, playersRaceStats[player.profileUrl]);
    if (data) {
      players[player.profileUrl] = data;
    }
  }

  return players;
}
