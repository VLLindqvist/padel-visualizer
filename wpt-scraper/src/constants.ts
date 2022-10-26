export const isDev = process.env.NODE_ENV !== "production";

export const REAL_DATE_REGEX =
  /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/g;
export const DATE_REGEX = /\d{2}\/\d{2}\/\d{4}/g;
export const YEAR_REGEX = /\d{4}/g;

export const RETRY_TIMEOUT = 3000;
export const NUMBER_OF_RETRIES = 4;

export const RACE_LINK = "https://www.worldpadeltour.com/en/race2021";
export const TOURNAMENT_BASE_URL = "https://www.worldpadeltour.com/info-torneos";
export const TOURNAMENT_PAGE_BASE_URL = "https://www.worldpadeltour.com/en/tournaments";
export const PLAYER_BASE_URL = "https://www.worldpadeltour.com/en/players";
export const FLAG_BASE_URL = "https://www.worldpadeltour.com/media/images/flags";
