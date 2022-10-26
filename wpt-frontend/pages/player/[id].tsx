import Layout from '@components/Layout/Layout';
import React from 'react';
import PlayerHeader from '@components/PlayerStats/PlayerHeader';
import CareerStats from '@components/PlayerStats/CareerStats';
import { PlayerData, PlayerYearlyStats } from '../../../types/types';

interface PlayerProps {
  data: PlayerData[];
  playerYearlyStats: PlayerYearlyStats[];
}

const Player = (props: PlayerProps) => {
  const player: PlayerData = props.data[0];
  const playerYearlyStats = props.playerYearlyStats;
  return (
    <Layout header={false}>
      <div style={{ maxWidth: '1300px' }} className="h-full w-full p-4 ">
        <PlayerHeader
          playerName={{
            firstName: player.firstName,
            middleName: player.middleName,
            lastName: player.lastName
          }}
          country={player.country}
          rank={player.ranking}
          playerImage={player.profileImgUrl}
        />
        <div className=" my-4 grid grid-cols-3 gap-4">
          <CareerStats
            matchStats={{
              totalMatchesWon: player.totalMatchesWon,
              totalMatchesPlayed: player.totalMatchesPlayed,
              totalMatchesLost:
                player.totalMatchesPlayed - player.totalMatchesWon,
              consecutiveWins: player.consecutiveWins
            }}
            playerYearlyStats={playerYearlyStats}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Player;

export const getStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking'
  };
};

export const getStaticProps = async (context: any) => {
  const { id } = context.params;
  try {
    const data = await fetch(`http://localhost:3000/api/getPlayer?id=${id}`);
    const playerResult = await data.json();
    const data2 = await fetch(
      `http://localhost:3000/api/getPlayerYearlyStats?id=${id}`
    );
    const playerYearlyStats = await data2.json();
    return {
      props: {
        data: playerResult.results,
        playerYearlyStats: playerYearlyStats.results
      }
    };
  } catch (error) {
    throw Error;
  }
};
