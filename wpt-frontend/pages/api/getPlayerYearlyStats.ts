import { query } from 'database/db';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sql = `
        SELECT player AS id, matches_played AS matchesPlayed, matches_won AS matchesWon, tournament_finals AS tournamentFinals, 
        tournament_quarters AS tournamentQuarters, tournament_round_of_eight as tournamentRoundOfEight, tournament_round_of_sixteen AS tournamentRoundOfSixteen,
        tournament_semis AS tournamentSemis, tournament_wins AS tournamentWins, year 
        FROM player_yearly_stats WHERE player = ?`;

    const values = [req.query.id];
    const data = await query({ query: sql, values });
    // console.log(data);
    res.status(200).json({ results: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
