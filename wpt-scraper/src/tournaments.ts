import { CheerioAPI, load as cheerioLoad } from "cheerio";
import FormData from "form-data";
import { DateTime } from "luxon";
import fetch, { Headers, RequestInit } from "node-fetch";
import replaceSpecialCharacters from "replace-special-characters";
import {
  TournamentsPartialData,
  Tournament,
  TournamentGeneral,
  WptResponse,
  Match,
  TournamentRound,
  MatchResults,
  TournamentRoundInfo,
  PlayerCategory,
  TournamentRegisteredTeam,
  TournamentType,
  PlayerId,
  Tournaments,
  TournamentPhase,
  TournamentCategory,
  SetResults,
  YearString,
  TournamentPartialData,
} from "wpt-scraper-types";
import Cache from "./cache.js";
import {
  DATE_REGEX,
  isDev,
  NUMBER_OF_RETRIES,
  REAL_DATE_REGEX,
  RETRY_TIMEOUT,
  TOURNAMENT_BASE_URL,
  TOURNAMENT_PAGE_BASE_URL,
} from "./constants.js";
import { getTournamentsPartialFromDB, insertTournamentsInDb } from "./db/tournaments.js";
import { scrapePlayers } from "./players.js";
import { existsSync, mkdirSync, readFileSync, readSync, writeFileSync } from "fs";
import cloneDeep from "lodash.clonedeep";

async function scrapeTournamentRegisteredTeams(url: string): Promise<TournamentRegisteredTeam[]> {
  async function fetchFunction() {
    const headers = new Headers();
    headers.append("x-requested-with", "XMLHttpRequest");
    headers.append("Cookie", "language=en");

    const formData = new FormData();
    formData.append("lang", "en");
    formData.append("selected_tab", "registrations");

    const options: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      redirect: "follow",
    };

    const cacheKey = `${url}----registrations`;

    let data = Cache.nc.get(cacheKey) as WptResponse | undefined;

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

        data = await res.json();
        break;
      }

      if (!data!.res) {
        throw { code: 2 };
      }
    }
    data = data!;

    Cache.nc.set(cacheKey, data);

    return data;
  }

  function parseHTML($: CheerioAPI): TournamentRegisteredTeam[] | undefined {
    try {
      let registeredTeams: TournamentRegisteredTeam[] = [];

      const teamsColumns = $(".c-teams__column");
      for (const teamsColum of teamsColumns) {
        const categoryTitleContainer = $(".c-teams__iandt", teamsColum);
        const category: PlayerCategory = $("span:last-of-type", categoryTitleContainer)
          .text()
          .trim()
          .toLowerCase()
          .includes("women")
          ? "female"
          : "male";

        const containers = $(".c-teams__item");

        for (const container of containers) {
          try {
            const playerUrlContainers = $(".c-trigger", container);

            let i = 0;
            let players = [] as unknown as [PlayerId | string, PlayerId | string];
            for (const playerUrlContainer of playerUrlContainers) {
              let playerId: PlayerId = playerUrlContainer.attribs.href.trim();
              if (!playerId) {
                const playerNamesContainer = $(".c-teams__players", container)[i < 2 ? 0 : 1];
                playerId = $(`.c-teams__name:nth-of-type(${i === 0 ? 1 : 2})`, playerNamesContainer)
                  .text()
                  .trim()
                  .toLowerCase()
                  .replace(/  +/g, " ") // Replace multiple spaces with one space
                  .split(" ")
                  .join("-");
                playerId = replaceSpecialCharacters(playerId);
              }
              if (playerId.endsWith("/")) {
                const arr = playerId.split("/");
                playerId = arr[arr.length - 2];
              } else {
                const arr = playerId.split("/");
                playerId = arr[arr.length - 1];
              }

              players.push(playerId);
              ++i;
              if (i > 2) break;
            }

            registeredTeams.push({ players, category });
          } catch (err) {
            continue;
          }
        }
      }

      return registeredTeams;
    } catch (err) {
      console.error(`[scrapeTournamentRegisteredTeams]: Error when parsing data for ${url}: ${err}`);
    }
  }

  let data: WptResponse;
  try {
    data = await fetchFunction();
  } catch (_err) {
    const err = _err as any;
    if (err.code === 1) {
      throw new Error(`[scrapeTournamentRegisteredTeams]: Response ${url} not ok`);
    } else if (err.code === 2) {
      console.log(`[scrapeTournamentRegisteredTeams] Response for ${url} no good`);
      return [];
    }
  }

  const { data: registeredTeamsHTML } = data!;

  const tournamentRegisteredTeams = registeredTeamsHTML !== "" ? parseHTML(cheerioLoad(registeredTeamsHTML)) ?? [] : [];

  let playersToScrape: string[] = [];
  for (const registeredTeam of tournamentRegisteredTeams) {
    for (const playerId of registeredTeam.players) {
      playersToScrape = [...playersToScrape, playerId];
    }
  }
  await scrapePlayers(playersToScrape);

  return tournamentRegisteredTeams;
}

async function scrapeTournamentGeneral(url: string): Promise<TournamentGeneral> {
  async function fetchFunction() {
    const headers = new Headers();
    headers.append("x-requested-with", "XMLHttpRequest");
    headers.append("Cookie", "language=en");

    const formData = new FormData();
    formData.append("lang", "en");
    formData.append("selected_tab", "info");

    const options: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      redirect: "follow",
    };

    const cacheKey = `${url}----info`;

    let data = Cache.nc.get(cacheKey) as WptResponse | undefined;

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

        data = await res.json();
        break;
      }

      if (!data!.res) {
        throw { code: 2 };
      }
    }
    data = data!;

    Cache.nc.set(cacheKey, data);

    return data;
  }

  function parseHTML($: CheerioAPI): TournamentGeneral | undefined {
    try {
      const containers = $(".c-flex-table__row");

      for (const container of containers) {
        try {
          const heading = $(".c-flex-table__heading", container);
          if ($("img", heading).attr("src")?.toLowerCase().includes("referee")) {
            const content = $(".c-flex-table__content", container);
            const referees = $("span", content)
              .text()
              .split("|")
              .map((s) => s.trim());
            return {
              referees,
            };
          }
        } catch (err) {
          continue;
        }
      }
    } catch (err) {
      console.error(`[scrapeTournamentGeneral]: Error when parsing data for ${url}: ${err}`);
    }
  }

  let data: WptResponse;
  try {
    data = await fetchFunction();
  } catch (_err) {
    const err = _err as any;
    if (err.code === 1) {
      throw new Error(`[scrapeTournamentGeneral]: Response ${url} not ok`);
    } else if (err.code === 2) {
      throw new Error(`[scrapeTournamentGeneral] Response for ${url} no good`);
    }
  }

  const { data: tournamentGeneralHtml } = data!;

  return tournamentGeneralHtml !== "" ? parseHTML(cheerioLoad(tournamentGeneralHtml)) ?? {} : {};
}

async function scrapeTournamentPhases(url: string): Promise<TournamentPhase[]> {
  async function fetchFunction() {
    const headers = new Headers();
    headers.append("x-requested-with", "XMLHttpRequest");
    headers.append("Cookie", "language=en");

    const formData = new FormData();
    formData.append("lang", "en");
    formData.append("selected_tab", "results");

    const options: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      redirect: "follow",
    };

    const cacheKey = `${url}----results`;

    let data = Cache.nc.get(cacheKey) as WptResponse | undefined;

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

        data = await res.json();
        break;
      }

      if (!data!.res) {
        throw { code: 2 };
      }
    }
    data = data!;

    Cache.nc.set(cacheKey, data);

    return data;
  }

  function parseHTML($: CheerioAPI): TournamentPhase[] | undefined {
    try {
      const phaseContainer = $("#filter-results-phase");
      const options = $("option", phaseContainer)
        .filter(
          (i, el) =>
            $(el).text().trim().toLowerCase() !== "all" && $(el).text().trim().toLowerCase() !== "tournament phase",
        )
        .map((i, el) => $(el).text().toLowerCase().replace(" ", "_"))
        .toArray() as TournamentPhase[];
      return options;
    } catch (err) {
      console.error(`[scrapeTournamentGeneral]: Error when parsing data for ${url}: ${err}`);
    }
  }

  let data: WptResponse;
  try {
    data = await fetchFunction();
  } catch (_err) {
    const err = _err as any;
    if (err.code === 1) {
      throw new Error(`[scrapeTournamentPhases]: Response ${url} not ok`);
    } else if (err.code === 2) {
      console.log(`[scrapeTournamentPhases] Response for ${url} no good`);
      return [];
    }
  }

  const { data: tournamentResultsHtml } = data!;

  return tournamentResultsHtml !== "" ? parseHTML(cheerioLoad(tournamentResultsHtml)) ?? [] : [];
}

async function scrapeTournamentMatches(
  url: string,
  phase: TournamentPhase,
  category: TournamentCategory,
): Promise<Match[]> {
  async function fetchFunction(_category?: "Femenino" | "Masculino") {
    const headers = new Headers();
    headers.append("x-requested-with", "XMLHttpRequest");
    headers.append("Cookie", "language=en");

    const formData = new FormData();
    formData.append("lang", "en");
    formData.append("selected_tab", "results");
    formData.append("section_data[1][filter]", "phase");
    formData.append("section_data[1][data]", phase.replace("_", " "));
    if (!!_category) {
      formData.append("section_data[3][filter]", "category");
      formData.append("section_data[3][data]", _category);
    }

    const options: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      redirect: "follow",
    };

    const cacheKey = `${url}----results-phase${phase}-category${_category}`;

    let data = Cache.nc.get(cacheKey) as WptResponse | undefined;

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

        data = await res.json();
        break;
      }

      if (!data!.res) {
        throw { code: 2 };
      }
    }
    data = data!;

    Cache.nc.set(cacheKey, data);

    return data;
  }

  function parseHTML($: CheerioAPI, _category: PlayerCategory): Match[] | undefined {
    try {
      const resultsContainers = $(".c-results-wrapper");
      let matches: Match[] = [];

      let i = 0;
      for (const resultsContainer of resultsContainers) {
        try {
          const [phaseStr, roundStr] = $(".c-results-title", resultsContainer)
            .text()
            .split("-")
            .map((s) => s.trim().toLowerCase());
          let round: TournamentRound;
          if (phase === "main_draw") {
            if (roundStr.includes("semifinal")) {
              round = "semi";
            } else if (roundStr.includes("quarterfinal")) {
              round = "quarter";
            } else if (roundStr.includes("1/8")) {
              round = "roundOfEight";
            } else if (roundStr.includes("1/16")) {
              round = "roundOfSixteen";
            } else {
              round = "final";
            }
          } else {
            if (roundStr.includes("round") && roundStr.includes("1")) {
              round = "1";
            } else if (roundStr.includes("round") && roundStr.includes("2")) {
              round = "2";
            } else if (roundStr.includes("round") && roundStr.includes("3")) {
              round = "3";
            } else if (roundStr.includes("round") && roundStr.includes("4")) {
              round = "4";
            } else if (roundStr.includes("round") && roundStr.includes("5")) {
              round = "5";
            } else {
              round = "6";
            }
          }
          const roundInfo = {
            round,
            phase,
          } as TournamentRoundInfo;

          const matchContainers = $(resultsContainer).nextUntil(".c-results-wrapper");
          for (const matchContainer of matchContainers) {
            const resultContainer = $(".c-teams__iandt:nth-of-type(2)", matchContainer);
            let fullResStr = $("span", resultContainer).text();

            let resultArr: string[];
            if (fullResStr.includes("|")) {
              resultArr = fullResStr.split("|");
            } else {
              resultArr = fullResStr.split("/");
            }
            resultArr.map((s) => s.trim());

            let results = [] as unknown as MatchResults;
            for (const resultStr of resultArr) {
              let setResults: SetResults = [0, 0];
              const tieBreakStr = resultStr.match(/\((.*)\)/)?.pop();
              if (!!tieBreakStr) {
                resultStr.replace(`(${tieBreakStr})`, tieBreakStr);
                const tieBreak = Number.parseInt(tieBreakStr.trim());
                setResults.push(tieBreak);
                if (Number.isNaN(tieBreak)) {
                  console.log("NaN-value found for match tie break result", tieBreak);
                }
              }

              const resultsNum = resultStr.split("-").map((s) => Number.parseInt(s.trim()));
              if (Number.isNaN(resultsNum)) {
                console.log("NaN-value found for match result", resultsNum);
              }
              const firstTeamRes = resultsNum[0];
              const secondTeamRes = resultsNum[1];

              setResults[0] = firstTeamRes;
              setResults[1] = secondTeamRes;

              if (
                firstTeamRes === undefined ||
                secondTeamRes === undefined ||
                Number.isNaN(firstTeamRes) ||
                Number.isNaN(secondTeamRes)
              ) {
                throw Error();
              }

              results.push(setResults);
            }

            let firstTeam = [] as unknown as [string, string];
            let secondTeam = [] as unknown as [string, string];
            let k = 0;
            const playerContainers = $(".c-trigger", matchContainer);
            for (const playerContainer of playerContainers) {
              let playerId: PlayerId = playerContainer.attribs.href.trim().replace("jugadores", "en/players");
              if (!playerId) {
                const playerNamesContainer = $(".c-teams__players", matchContainer)[k < 2 ? 0 : 1];
                playerId = $(`.c-teams__name:nth-of-type(${k === 0 || k === 2 ? 1 : 2})`, playerNamesContainer)
                  .text()
                  .trim()
                  .toLowerCase()
                  .replace(/  +/g, " ") // Replace multiple spaces with one space
                  .split(" ")
                  .join("-");
                playerId = replaceSpecialCharacters(playerId);
              }
              if (playerId.endsWith("/")) {
                const arr = playerId.split("/");
                playerId = arr[arr.length - 2];
              } else {
                const arr = playerId.split("/");
                playerId = arr[arr.length - 1];
              }

              if (k < 2) {
                firstTeam.push(playerId);
              } else {
                secondTeam.push(playerId);
              }
              ++k;
              if (k > 3) break;
            }

            if (!firstTeam.length || !secondTeam.length) throw Error();

            const match: Match = {
              ...roundInfo,
              firstTeam,
              secondTeam,
              category: _category,
              results,
            };
            matches = [...matches, match];
            ++i;
          }
        } catch (err) {
          continue;
        }
      }

      return matches;
    } catch (err) {
      console.error(`[scrapeTournamentGeneral]: Error when parsing data for ${url}: ${err}`);
    }
  }

  if (category === "both") {
    let dataArr: [WptResponse, WptResponse];
    try {
      dataArr = await Promise.all([fetchFunction("Masculino"), fetchFunction("Femenino")]);
    } catch (_err) {
      const err = _err as any;
      if (err.code === 1) {
        throw new Error(`[scrapeTournamentMatches]: Response ${url} not ok`);
      } else if (err.code === 2) {
        console.log(`[scrapeTournamentMatches] Response for ${url} no good`);
        return [];
      }
    }

    const [{ data: tournamentResultsHtmlMale }, { data: tournamentResultsHtmlFemale }] = dataArr!;

    let matches: Match[] = [];
    if (tournamentResultsHtmlMale !== "") {
      matches = { ...matches, ...(parseHTML(cheerioLoad(tournamentResultsHtmlMale), "male") ?? {}) };
    }
    if (tournamentResultsHtmlFemale !== "") {
      matches = { ...matches, ...(parseHTML(cheerioLoad(tournamentResultsHtmlFemale), "female") ?? {}) };
    }

    return matches;
  } else {
    let data: WptResponse;
    try {
      data = await fetchFunction();
    } catch (_err) {
      const err = _err as any;
      if (err.code === 1) {
        throw new Error(`[scrapeTournamentPhases]: Response ${url} not ok`);
      } else if (err.code === 2) {
        console.log(`[scrapeTournamentPhases] Response for ${url} no good`);
        return [];
      }
    }

    const { data: tournamentResultsHtml } = data!;

    return tournamentResultsHtml !== "" ? parseHTML(cheerioLoad(tournamentResultsHtml), category) ?? [] : [];
  }
}

async function scrapeTournamentsPartialData(ids?: string[]): Promise<TournamentsPartialData> {
  async function fetchFunction(year: number) {
    const headers = new Headers();
    headers.append("x-requested-with", "XMLHttpRequest");
    headers.append("Cookie", "language=en");

    const formData = new FormData();
    formData.append("lang", "en");

    const options: RequestInit = {
      method: "POST",
      headers,
      body: formData,
      redirect: "follow",
    };

    const fetchUrl = `https://www.worldpadeltour.com/search-torneos/-/${year}`;

    let data = Cache.nc.get(fetchUrl) as WptResponse | undefined;

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

      if (!data!.res) {
        throw { code: 2 };
      }
    }
    data = data!;

    Cache.nc.set(fetchUrl, data);

    return data;
  }

  function parseHTML($: CheerioAPI): TournamentsPartialData {
    let tournaments: TournamentsPartialData = {};

    for (const tournamentContainer of $(".c-tournaments__container")) {
      try {
        let id: string = "";
        let pageUrl: string = "";
        const urls = $(".c-tournaments__triggers", tournamentContainer).children("a");
        for (const _url of urls) {
          if ($(_url).text().toLowerCase().includes("info")) {
            pageUrl = _url.attribs.href;
            if (pageUrl.endsWith("/")) {
              const arr = pageUrl.split("/");
              id = arr[arr.length - 3];
            } else {
              const arr = pageUrl.split("/");
              id = arr[arr.length - 2];
            }
          }
        }
        if (ids && !ids.includes(id)) continue;

        const posterUrl = $(".c-tournaments__poster", tournamentContainer)
          .children(".c-tournaments__img")!
          .css("background-image")!
          .match(/\((.*)\)/)!
          .pop()!
          .trim();
        const [dateFrom, dateTo] = $(".c-tournaments__date", tournamentContainer)!
          .text()!
          .match(DATE_REGEX)!
          .map((ds) => ds.match(REAL_DATE_REGEX)?.[0])
          .filter((ds) => !!ds)
          .map((ds) => new Date(ds!.split("/").reverse().join("-")));
        const name = $(".c-tournaments__title", tournamentContainer).text()!;
        const categoryStr = $(".c-tournaments__cat", tournamentContainer).text().toLowerCase();
        let category: TournamentCategory;
        if (categoryStr.includes("male")) {
          category = "male";
        } else if (categoryStr.includes("female")) {
          category = "female";
        } else {
          category = "both";
        }
        const place = $(".c-tournaments__city", tournamentContainer).text().replace(/\..*/, "").trim();
        const typeStr = $(".c-tournaments__tag", tournamentContainer).text().toUpperCase();
        let type: TournamentType;
        if (typeStr.includes("MASTER-FINAL")) {
          type = "masterfinal";
        } else if (typeStr.includes("MASTER")) {
          type = "master";
        } else if (typeStr.includes("OPEN")) {
          type = "open";
        } else if (typeStr.includes("CHALLENGER")) {
          type = "challenger";
        } else if (typeStr.includes("EXHIBITION")) {
          type = "exhibition";
        } else {
          type = "unknown";
        }
        const firstImage = $(".c-tournaments__top-card", tournamentContainer)
          .children(".c-tournaments__header")!
          .css("background")!
          .match(/\('(.*)'\)/)!
          .pop()!
          .trim();
        const images = [firstImage];
        const yearInName = name.match(/\d{4}/g)?.[0] as YearString;
        const yearFromDate = dateFrom.getFullYear() as unknown as YearString;
        let year: YearString = yearInName ? (name.trim().endsWith(yearInName) ? yearInName : "2022") : "2022";
        if (Number.isNaN(Number.parseInt(year)) && yearFromDate) {
          year = yearFromDate;
        }

        const data = { id, pageUrl, dateFrom, dateTo, year, category, name, place, type, posterUrl, images };

        tournaments[id] = data;

        if (ids && Object.keys(ids).every((_id) => Object.keys(tournaments).includes(_id))) {
          break;
        }
      } catch (err) {
        console.error(
          `Error when parsing data for ${$(".c-player-card__name", tournamentContainer).text()} (${
            $("a", tournamentContainer)![0]!.attribs.href
          }): ${err}`,
        );
      }
    }

    return tournaments;
  }

  // Ugly but more effective, since we don't have to scrape from which years we can access tournament data
  const thisYear = new Date().getFullYear();
  const firstYear = 2016;
  let yearsToScrape = [thisYear];
  for (let i = thisYear; i >= firstYear; --i) {
    yearsToScrape.push(i);
  }

  let allTournamentsPartial: TournamentsPartialData = {};

  for (const year of yearsToScrape) {
    let data: WptResponse;
    try {
      data = await fetchFunction(year);
    } catch (_err) {
      const err = _err as any;
      if (err.code === 1) {
        throw new Error(`[scrapeTournamentsPartialData]: Response ${year} not ok`);
      } else if (err.code === 2) {
        console.log(`[scrapeTournamentsPartialData] Response for ${year} no good`);
        continue;
      }
    }

    const { data: tournamentHtml } = data!;

    if (tournamentHtml !== "") {
      allTournamentsPartial = { ...allTournamentsPartial, ...parseHTML(cheerioLoad(tournamentHtml)) };
    } else {
      break;
    }
  }

  const tournamentsPartialFromDB = await getTournamentsPartialFromDB();

  // Return partial data, but remove tournaments that was last scraped after they were completed
  // if they are not explicitily scraped using the "ids" param
  return ids
    ? allTournamentsPartial
    : Object.fromEntries(
        Object.entries(allTournamentsPartial).filter(([id]) => {
          if (id in tournamentsPartialFromDB) {
            const to = DateTime.fromJSDate(tournamentsPartialFromDB[id].dateTo);
            const lastScraped = DateTime.fromJSDate(tournamentsPartialFromDB[id].lastScraped);
            if (lastScraped > to) {
              return false;
            }
          }

          return true;
        }),
      );
}

async function scrapeTournament(
  partialData: TournamentPartialData,
  insertToDb: boolean = true,
): Promise<Tournament | undefined> {
  if (!partialData) {
    console.log("Can't call scrapeTournament with undefined partialData");
    return;
  }

  const url = partialData.pageUrl.replace(TOURNAMENT_PAGE_BASE_URL, TOURNAMENT_BASE_URL);
  if (!partialData) return undefined;
  const general = await scrapeTournamentGeneral(url);
  const phases = await scrapeTournamentPhases(url);
  const registeredTeams = await scrapeTournamentRegisteredTeams(url);

  let matches: Match[] = [];
  for (const phase of phases) {
    matches = [...matches, ...(await scrapeTournamentMatches(url, phase, partialData.category))];
  }

  const tournament: Tournament = {
    ...partialData,
    ...general,
    registeredTeams,
    matches,
  };

  if (insertToDb) {
    insertTournamentsInDb({ [tournament.id]: tournament });
  }

  return tournament;
}

export async function scrapeTournaments(ids?: string[]): Promise<Tournaments> {
  if (ids && (!Array.isArray(ids) || (Array.isArray(ids) && !ids.length))) {
    throw Error('[scrapePlayers] Can\'t give empty array as "ids"');
  }

  let tournaments: Tournaments = {};
  let tournamentsTemp: Tournaments = {};

  if (isDev && existsSync(`.dev/tournaments.json`)) {
    const file = readFileSync(`.dev/tournaments.json`, { encoding: "utf8" });
    tournaments = JSON.parse(file);

    if (ids) {
      tournamentsTemp = cloneDeep(tournaments);
      tournaments = Object.fromEntries(Object.entries(tournaments).filter(([_id]) => ids.includes(_id)));
    }
  }

  if (!isDev || (isDev && ids && ids.some((_id) => !(_id in tournaments)))) {
    const tournamentsPartial = await scrapeTournamentsPartialData(ids);

    for (const tournamentIdOrPartial of ids ?? Object.values(tournamentsPartial)) {
      const currentTournamentId =
        typeof tournamentIdOrPartial === "string" ? tournamentIdOrPartial : tournamentIdOrPartial.id;
      const tournamentPartial =
        typeof tournamentIdOrPartial === "string" ? tournamentsPartial[tournamentIdOrPartial] : tournamentIdOrPartial;

      const tournament = await scrapeTournament(tournamentPartial, false);

      if (tournament) {
        tournaments[currentTournamentId] = tournament;
      }
    }
  }

  if (isDev) {
    if (!existsSync(".dev")) {
      mkdirSync(".dev");
    }
    writeFileSync(`.dev/tournaments.json`, JSON.stringify({ ...tournamentsTemp, ...tournaments }));
  }

  insertTournamentsInDb(tournaments);

  return tournaments;
}
