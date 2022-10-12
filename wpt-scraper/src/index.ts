import { Players, Tournaments } from "wpt-scraper-types";
import { getPlayers } from "./players";
import { getAllTournaments } from "./tournaments";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  let players: Players = {};
  try {
    players = await getPlayers();
  } catch (err) {
    console.error(`Players scraping error: ${err}`);
  }
  console.log(players);

  let tournaments: Tournaments = {};
  try {
    tournaments = await getAllTournaments();
  } catch (err) {
    console.error(`Tournaments scraping error: ${err}`);
  }
  console.log(tournaments);
}

main();
