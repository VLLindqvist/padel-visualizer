import React from 'react';
import Image from 'next/image';
import { PlayerName } from 'pages/api/getPlayers';

interface PlayerHeaderProps {
  playerName: PlayerName;
  country: string;
  rank: number;
  playerImage: string;
}

const PlayerHeader = ({
  playerName,
  country,
  rank,
  playerImage
}: PlayerHeaderProps) => {
  return (
    <div className=" flex justify-between">
      <div className=" flex flex-col justify-end">
        <div className="w-12 h-12 relative">
          <Image
            layout="fill"
            objectFit="contain"
            unoptimized={true}
            src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country}.svg`}
            alt="img"
          />
        </div>
        <div className="flex flex-col justify-end">
          <h2 className="text-gray-300">{playerName.firstName}</h2>
          <h1 className="text-2xl">
            {playerName.middleName} {playerName.lastName}
          </h1>
        </div>
      </div>

      <div className="flex items-end space-x-4">
        <span className="lg-stats">#{rank}</span>
        <div className="relative w-40 h-40">
          <Image
            layout="fill"
            objectFit="contain"
            src={playerImage}
            alt="img"
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerHeader;
