import { query } from 'database/db';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import { SQLDate } from '../../../types/types';

export type PlayerName = {
  firstName: string;
  middleName: string;
  lastName: string;
};

export type TotalStats = {
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  totalMatchesLost: number;
  consecutiveWins: number;
  winPercentage?: string;
  lossPercentage?: string;
};

export interface PlayerBasic {
  id: string;
  firstName: PlayerName['firstName'];
  middleName: PlayerName['middleName'];
  lastName: PlayerName['lastName'];
  rank: number;
  profileImgUrl: string;
  country: string;
  currentScore: number;
  matchStats: TotalStats;
  courtPosition: 'left' | 'right';
  partner: PlayerName;
  birthdate: SQLDate;
  category: 'male' | 'female';
}

interface SQLPlayerBasic {
  id: string;
  firstName: PlayerName['firstName'];
  middleName: PlayerName['middleName'];
  lastName: PlayerName['lastName'];
  ranking: number;
  profileImgUrl: string;
  country: string;
  currentScore: number;
  totalMatchesWon: number;
  totalMatchesPlayed: number;
  courtPosition: 'left' | 'right';
  partnerFirstName: string;
  partnerMiddleName: string;
  partnerLastName: string;
  birthdate: SQLDate;
  category: 'male' | 'female';
  consecutiveWins: number;
}

const calcMatches = (totalMatchesWon: number, totalMatchesPlayed: number) => {
  const totalMatchesLost = totalMatchesPlayed - totalMatchesWon;
  const winPercentage =
    ((100 * totalMatchesWon) / totalMatchesPlayed).toString() + '%';
  const lossPercentage =
    ((100 * totalMatchesLost) / totalMatchesPlayed).toString() + '%';

  return {
    totalMatchesPlayed,
    totalMatchesWon,
    totalMatchesLost,
    winPercentage,
    lossPercentage
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sql = `
    SELECT pl1.id, pl1.first_name AS firstName, pl1.middle_name AS middleName, pl1.last_name AS lastName, pl1.points AS currentScore,
    pl1.rank AS ranking, pl1.profile_image_url AS profileImgUrl, pl1.country, pl1.consecutive_wins AS consecutiveWins,
    pl1.birthdate, pl1.total_matches_played AS totalMatchesPlayed, pl1.total_matches_won AS totalMatchesWon,
		pl1.preferred_court_position AS courtPosition, pl1.category,
    pl2.first_name AS partnerFirstName, pl2.middle_name AS partnerMiddleName, pl2.last_name AS partnerLastName
        FROM players AS pl1
        INNER JOIN players AS pl2 ON pl1.current_team = pl2.current_team
        WHERE pl1.first_name <> pl2.first_name AND pl1.category = "male" ORDER BY pl1.rank;`;

    const values: any = [];
    const data = await query({ query: sql, values });

    const tempData = JSON.parse(JSON.stringify(data));

    const playerData = tempData.map((item: SQLPlayerBasic): PlayerBasic => {
      return {
        id: item.id,
        firstName: item.firstName,
        middleName: item.middleName,
        lastName: item.lastName,
        profileImgUrl: item.profileImgUrl,
        currentScore: item.currentScore,
        rank: item.ranking,
        matchStats: {
          ...calcMatches(item.totalMatchesWon, item.totalMatchesPlayed),
          consecutiveWins: item.consecutiveWins
        },
        courtPosition: item.courtPosition,
        partner: {
          firstName: item.partnerFirstName,
          middleName: item.partnerMiddleName,
          lastName: item.partnerLastName
        },
        birthdate: item.birthdate,
        category: item.category,
        country: item.country
      };
    });

    res.status(200).json({ playerData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
