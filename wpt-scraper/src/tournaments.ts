import { CheerioAPI, load as cheerioLoad } from "cheerio";
import FormData from "form-data";
import fetch, { Headers, RequestInit } from "node-fetch";
import {
  TournamentsPartialData,
  Tournament,
  PlayerYearlyStats,
  TournamentGeneral,
  WptResponse,
  Match,
  TournamentRound,
  MatchResults,
  TournamentRoundInfo,
  PlayerCategory,
  AllTournamentsPerYearResponse,
  TournamentRegisteredTeam,
  SQLDate,
  TournamentType,
  PlayerId,
  Tournaments,
} from "./types.js";
import { TournamentPhase, Matches, MatchId, TournamentCategory, SetResults } from "./types";
import { DATE_REGEX, isDev, isInitialScrape, REAL_DATE_REGEX } from "./constants.js";
import { YearString } from "./utilityTypes";

async function getTournamentRegisteredTeams(url: string): Promise<TournamentRegisteredTeam[]> {
  function fetchFunction() {
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

    return fetch(url, options);
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
              let playerUrl = playerUrlContainer.attribs.href.trim().replace("jugadores", "en/players");
              if (!playerUrl) {
                const playerNamesContainer = $(".c-teams__players", container)[i < 2 ? 0 : 1];
                playerUrl = $(`.c-teams__name:nth-of-type(${i === 0 ? 1 : 2})`, playerNamesContainer)
                  .text()
                  .trim();
              }

              players.push(playerUrl);
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
      console.error(`[getTournamentRegisteredTeams]: Error when parsing data for ${url}: ${err}`);
    }
  }

  const res = await fetchFunction();

  if (!res.ok) {
    throw new Error(`[getTournamentRegisteredTeams]: Response for ${url} not ok`);
  }
  const data = (await res.json()) as WptResponse;
  if (!data.res) throw new Error(`[getTournamentRegisteredTeams] Response for ${url} no good`);

  const { data: tournamentRegisteredTeams } = data;

  return tournamentRegisteredTeams !== "" ? parseHTML(cheerioLoad(tournamentRegisteredTeams)) ?? [] : [];
}

async function getTournamentGeneral(url: string): Promise<TournamentGeneral> {
  function fetchFunction() {
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

    return fetch(url, options);
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
      console.error(`[getTournamentGeneral]: Error when parsing data for ${url}: ${err}`);
    }
  }

  const res = await fetchFunction();

  if (!res.ok) {
    throw new Error(`[getTournamentGeneral]: Response for ${url} not ok`);
  }
  const data = (await res.json()) as WptResponse;
  if (!data.res) throw new Error(`[getTournamentGeneral] Response for ${url} no good`);

  const { data: tournamentGeneralHtml } = data;

  return tournamentGeneralHtml !== "" ? parseHTML(cheerioLoad(tournamentGeneralHtml)) ?? {} : {};
}

async function getTournamentPhases(url: string): Promise<TournamentPhase[]> {
  function fetchFunction() {
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

    return fetch(url, options);
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
      console.error(`[getTournamentGeneral]: Error when parsing data for ${url}: ${err}`);
    }
  }

  const res = await fetchFunction();

  if (!res.ok) {
    throw new Error(`[getTournamentGeneral]: Response for ${url} not ok`);
  }
  const data = (await res.json()) as WptResponse;
  if (!data.res) throw new Error(`[getTournamentGeneral] Response for ${url} no good`);

  const { data: tournamentResultsHtml } = data;

  return tournamentResultsHtml !== "" ? parseHTML(cheerioLoad(tournamentResultsHtml)) ?? [] : [];
}

async function getTournamentMatches(
  url: string,
  phase: TournamentPhase,
  category: TournamentCategory,
): Promise<Matches> {
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

    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`[getTournamentMatches]: Response for ${url} not ok`);
    }
    const data = (await res.json()) as WptResponse;
    if (!data.res) throw new Error(`[getTournamentMatches] Response for ${url} no good`);

    return data;
  }

  function parseHTML($: CheerioAPI, _category: PlayerCategory): Matches | undefined {
    try {
      const resultsContainers = $(".c-results-wrapper");
      let matches: Matches = {};

      for (const resultsContainer of resultsContainers) {
        try {
          const roundStr = $(".c-results-title", resultsContainer).text().split("-")[0]!.trim().toLowerCase();
          let round: TournamentRound;
          if (phase === "main_draw") {
            if (roundStr.includes("final")) {
              round = "final";
            } else if (roundStr.includes("semifinals")) {
              round = "semi";
            } else if (roundStr.includes("quarterfinals")) {
              round = "quarter";
            } else if (roundStr.includes("1/8")) {
              round = "roundOfEight";
            } else {
              round = "roundOfSixteen";
            }
          } else {
            if (roundStr.includes("round") && roundStr.includes("1")) {
              round = "1";
            } else if (roundStr.includes("round") && roundStr.includes("2")) {
              round = "2";
            } else if (roundStr.includes("round") && roundStr.includes("3")) {
              round = "3";
            } else {
              round = "4";
            }
          }
          const roundInfo = {
            round,
            phase,
          } as TournamentRoundInfo;

          let i = 0;
          const matchContainers = $(resultsContainer).nextUntil(".c-results-wrapper");
          for (const matchContainer of matchContainers) {
            const matchId = `${phase}-${round}-${i}` as MatchId;

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
              let tieBreak: number = 0;
              if (!!tieBreakStr) {
                resultStr.replace(`(${tieBreakStr})`, "");
                setResults.push(Number.parseInt(tieBreakStr.trim()));
              }

              const resultsNum = resultStr.split("-").map((s) => Number.parseInt(s.trim()));
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
              let playerUrl = playerContainer.attribs.href.trim().replace("jugadores", "en/players");
              if (!playerUrl) {
                const playerNamesContainer = $(".c-teams__players", matchContainer)[k < 2 ? 0 : 1];
                playerUrl = $(`.c-teams__name:nth-of-type(${k === 0 || k === 2 ? 1 : 2})`, playerNamesContainer)
                  .text()
                  .trim();
              }

              if (k < 2) {
                firstTeam.push(playerUrl);
              } else {
                secondTeam.push(playerUrl);
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
            matches = {
              ...matches,
              [matchId]: match,
            };
            ++i;
          }
        } catch (err) {
          continue;
        }
      }

      return matches;
    } catch (err) {
      console.error(`[getTournamentGeneral]: Error when parsing data for ${url}: ${err}`);
    }
  }

  if (category === "both") {
    const dataArr = await Promise.all([fetchFunction("Masculino"), fetchFunction("Femenino")]);
    const [{ data: tournamentResultsHtmlMale }, { data: tournamentResultsHtmlFemale }] = dataArr;

    let matches: Matches = {};
    if (tournamentResultsHtmlMale !== "") {
      matches = { ...matches, ...(parseHTML(cheerioLoad(tournamentResultsHtmlMale), "male") ?? {}) };
    }
    if (tournamentResultsHtmlFemale !== "") {
      matches = { ...matches, ...(parseHTML(cheerioLoad(tournamentResultsHtmlFemale), "female") ?? {}) };
    }

    return matches;
  } else {
    const data = await fetchFunction();
    const { data: tournamentResultsHtml } = data;

    return tournamentResultsHtml !== "" ? parseHTML(cheerioLoad(tournamentResultsHtml), category) ?? {} : {};
  }
}

async function getTournamentsPartialData(url?: string): Promise<TournamentsPartialData[]> {
  function fetchFunction(year: number) {
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

    return fetch(`https://www.worldpadeltour.com/search-torneos/-/${year}`, options);
  }

  function parseHTML($: CheerioAPI): TournamentsPartialData[] {
    let tournaments: TournamentsPartialData[] = [];

    for (const tournamentContainer of $(".c-tournaments__container")) {
      try {
        const posterUrl = $(".c-tournaments__poster", tournamentContainer)
          .children(".c-tournaments__img")!
          .css("background-image")!
          .match(/\((.*)\)/)!
          .pop()!
          .trim();

        let url: string = "";
        let pageUrl: string = "";
        const urls = $(".c-tournaments__triggers", tournamentContainer).children("a");
        for (const _url of urls) {
          if ($(_url).text().toLowerCase().includes("info")) {
            pageUrl = _url.attribs.href;
            url = pageUrl.replace(
              "https://www.worldpadeltour.com/en/tournaments/",
              "https://www.worldpadeltour.com/info-torneos/",
            );
          }
        }
        const [dateFrom, dateTo] = $(".c-tournaments__date", tournamentContainer)!
          .text()!
          .match(DATE_REGEX)!
          .map((ds) => ds.match(REAL_DATE_REGEX)?.[0])
          .filter((ds) => !!ds)
          .map((ds) => ds!.split("/").reverse().join("-") as SQLDate);
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
        const typeStr = $(".c-tournaments__tag", tournamentContainer).text();
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
          .match(/\((.*)\)/)!
          .pop()!
          .trim();
        const images = [firstImage];
        const yearInName = name.match(/\d{4}/g)?.[0] as YearString;
        const yearFromDate = dateFrom.split("-")[0] as YearString;
        let year: YearString = yearInName ? (name.trim().endsWith(yearInName) ? yearInName : "2022") : "2022";
        if (Number.isNaN(Number.parseInt(year)) && yearFromDate) {
          year = yearFromDate;
        }

        tournaments.push({ url, pageUrl, dateFrom, dateTo, year, category, name, place, type, posterUrl, images });
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
  if (isInitialScrape || !!url) {
    for (let i = firstYear; i < thisYear; ++i) {
      yearsToScrape.push(i);
    }
  }

  let allTournamentsPartial: TournamentsPartialData[] = [];

  for (const year of yearsToScrape) {
    const res = await fetchFunction(year);

    if (!res.ok) {
      throw new Error(`[getTournamentsPartialData]: Response for ${year} not ok`);
    }
    const data = (await res.json()) as AllTournamentsPerYearResponse;
    if (!data.res) throw new Error(`[getTournamentsPartialData] Response for ${year} no good`);

    const { data: tournamentHtml } = data;

    if (tournamentHtml !== "") {
      allTournamentsPartial = [...allTournamentsPartial, ...parseHTML(cheerioLoad(tournamentHtml))];
    } else {
      break;
    }

    if (!!url && allTournamentsPartial.some((t) => t.url === url)) {
      const relevantTournament = allTournamentsPartial.find((t) => t.url === url)!;
      allTournamentsPartial = [relevantTournament];
      break;
    }
  }

  return allTournamentsPartial;
}

export async function getTournament(
  partialDataOrUrl: string | TournamentsPartialData,
): Promise<Tournament | undefined> {
  const url = typeof partialDataOrUrl == "string" ? partialDataOrUrl : partialDataOrUrl.url;
  const partialData =
    typeof partialDataOrUrl == "string" ? (await getTournamentsPartialData(url))?.[0] : partialDataOrUrl;
  if (!partialData) return undefined;
  const general = await getTournamentGeneral(url);
  const phases = await getTournamentPhases(url);
  getTournamentRegisteredTeams(url);
  let matches: Matches = {};

  for (const phase of phases) {
    matches = { ...matches, ...(await getTournamentMatches(url, phase, partialData.category)) };
  }

  return {
    ...partialData,
    ...general,
    matches,
  };
}

export async function getAllTournaments(): Promise<Tournaments> {
  const allTournamentsPartial = await getTournamentsPartialData();

  let tournaments: Tournaments = {};

  let isFirst = true;
  for (const tournamentPartial of allTournamentsPartial) {
    if (isDev) {
      if (!isFirst) break;
      else isFirst = false;
    }

    const tournament = await getTournament(isDev ? tournamentPartial.url : tournamentPartial);

    if (tournament) {
      tournaments[tournament.url] = tournament;
    }
  }

  return tournaments;
}
