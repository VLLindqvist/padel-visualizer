import Stat from '@components/Stat/Stat';
import { TotalStats } from 'pages/api/getPlayers';
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { PlayerYearlyStats } from '../../../types/types';

interface CareerStatsProps {
  matchStats: TotalStats;
  playerYearlyStats: PlayerYearlyStats[];
}

const CareerStats = ({ matchStats, playerYearlyStats }: CareerStatsProps) => {
  return (
    <div className="glass-style p-4 grid grid-cols-3 gap-4 col-span-3 rounded-md shadow-md">
      <h1 className="text-xl col-span-3">
        <span className="border-b pb-1 border-orange-500">Career Stats</span>
      </h1>
      <div className="rounded-md p-4 flex flex-row justify-between items-start bg-orange-500 bg-opacity-50 backdrop-filter backdrop-blur-md;">
        <div className="space-y-2 ">
          <Stat heading="Matches Played" stat={matchStats.totalMatchesPlayed} />
          <Stat heading="Matches Lost" stat={matchStats.totalMatchesLost} />
        </div>
        <div className="space-y-2">
          <Stat heading="Matches Won" stat={matchStats.totalMatchesWon} />
          <Stat heading="Consecutive Wins" stat={matchStats.consecutiveWins} />
        </div>
      </div>
      <div className="rounded-md p-4 flex flex-col space-y-4 glass-style">
        {/* Hard coded stats for now here */}
        <Stat heading="Tournaments played" stat={72} />
        <Stat heading="Tournament wins" stat={25} />
      </div>

      {/* <div className="glass-style h-12 rounded-md"></div> */}
      <div className=" glass-style rounded-md  col-span-3 p-8 flex justify-center items-center text-black-500 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            width={400}
            height={200}
            data={playerYearlyStats}
            margin={{ top: 5, right: 50 }}
          >
            <XAxis
              padding={{ left: 10, right: 10 }}
              dataKey="year"
              stroke="white"
            />
            <YAxis stroke="white" />
            <Tooltip
              contentStyle={{ backgroundColor: '#ededed' }}
              itemStyle={{ color: '#f97316' }}
            />
            <Legend />
            <Line
              name="Tournament wins"
              type="monotone"
              dataKey="tournamentWins"
              stroke="#f97316"
              strokeWidth={2}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CareerStats;
