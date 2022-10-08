import { Players, Tournaments } from "./types.js";
import { getPlayers } from "./players.js";
import { getAllTournaments, getTournament } from "./tournaments.js";

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
