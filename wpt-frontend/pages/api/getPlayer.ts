import { query } from 'database/db';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sql = `
    SELECT pl1.id, pl1.first_name AS firstName, pl1.middle_name AS middleName, pl1.last_name AS lastName,
    pl1.current_team, pl1.points AS currentScore, pl1.rank AS ranking, pl1.profile_image_url AS profileImgUrl, pl1.country,
    pl1.birthplace, pl1.birthdate, pl1.height, pl1.hometown, pl1.consecutive_wins AS consecutiveWins,
    pl1.total_matches_played AS totalMatchesPlayed, pl1.total_matches_won AS totalMatchesWon, pl1.preferred_court_position AS courtPosition, pl1.category,
    pl2.first_name AS partnerFirstName, pl2.middle_name AS partnerMiddleName, pl2.last_name AS partnerLastName
        FROM players AS pl1
        INNER JOIN players AS pl2 ON pl1.current_team = pl2.current_team
        WHERE pl1.first_name <> pl2.first_name AND pl1.id = ?;`;

    const values = [req.query.id];
    const data = await query({ query: sql, values });
    // console.log(data);
    res.status(200).json({ results: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
