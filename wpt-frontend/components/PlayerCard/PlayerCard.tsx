import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlayerBasic } from 'pages/api/getPlayers';
interface PlayerCardProps {
  playerData: PlayerBasic;
}

const PlayerCard = ({ playerData }: PlayerCardProps) => {
  return (
    <Link href={`/player/${encodeURIComponent(playerData.id)}`}>
      <div className="flex w-full justify-between player-card glass-style rounded-md cursor-pointer hover:bg-gray-500 ">
        <div className="flex space-x-8 w-1/3">
          <div
            style={{ minWidth: '120px', minHeight: '158px' }}
            className="relative overflow-hidden"
          >
            <Image
              layout="fill"
              objectFit="contain"
              src={playerData.profileImgUrl}
              alt="img"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex flex-col">
              <span className="info-heading">{playerData.firstName}</span>
              <span className="text-lg">
                {`${playerData.middleName} ${playerData.lastName}`}
              </span>
            </div>
            <div className="w-12 h-12 relative">
              <Image
                layout="fill"
                objectFit="contain"
                unoptimized={true}
                src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${playerData.country.toUpperCase()}.svg`}
                alt="img"
              />
            </div>
          </div>
        </div>
        <div className="flex space-x-12 w-full">
          <div className="flex flex-col items-center justify-center w-full ">
            <div className="space-y-4 ">
              <div className="flex flex-col">
                <span className="info-heading">Date of Birth</span>
                <span className="text-lg">
                  {playerData.birthdate.split('T')[0]}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="info-heading">Position</span>
                <span className="text-lg">{playerData.courtPosition}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-4 w-full justify-center ">
            <div className="flex flex-col">
              <span className="info-heading">Partner</span>
              <span className="">{`${playerData.partner.firstName} ${playerData.partner.middleName} ${playerData.partner.lastName}`}</span>
            </div>
            <div className="flex flex-col justify-center w-full">
              <span className="info-heading mb-1">Wins/Loss</span>
              <div className="flex h-6 w-3/4 rounded-md shadow-md overflow-hidden ">
                <div
                  style={{ width: playerData.matchStats.winPercentage }}
                  className="bg-emerald-700 flex items-center text-xs "
                >
                  <span className="px-2">
                    {playerData.matchStats.totalMatchesWon}
                  </span>
                </div>
                <div
                  style={{ width: playerData.matchStats.lossPercentage }}
                  className="bg-red-800 flex items-center text-xs "
                >
                  <span className="px-2">
                    {playerData.matchStats.totalMatchesLost}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2  justify-center">
            <div className="flex flex-col items-end">
              <span className="info-heading">Rank</span>
              <span className="lg-stats">{playerData.rank}</span>
            </div>
            <div className=" flex flex-col items-end">
              <span className="info-heading">Points</span>
              <span className="lg-stats">{playerData.currentScore}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PlayerCard;
