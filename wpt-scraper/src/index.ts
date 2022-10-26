import * as dotenv from "dotenv";
import NodeCache from "node-cache";

import Cache from "./cache.js";
import setupDB from "./db/index.js";
import { scrapeTournaments } from "./tournaments";
import { scrapePlayers } from "./players";
import { isDev } from "./constants.js";

dotenv.config();

async function main() {
  Cache.nc = new NodeCache();

  try {
    await scrapeTournaments(isDev ? ["swedish-padel-open-2022", "estrella-damm-menorca-open-2022"] : undefined);
  } catch (err) {
    console.error(`Tournaments scraping error: ${err}`);
  }

  try {
    await scrapePlayers(isDev ? ["miguel-lamperti"] : undefined);
  } catch (err) {
    console.error(`Players scraping error: ${err}`);
  }
}

main();
