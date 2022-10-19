import React from 'react';
import Image from 'next/image';

const dummyData = [
  {
    firstName: 'Juan',
    middleName: 'Lebrón',
    lastName: 'Chincoa',
    points: 14470,
    rank: 1,
    // img: 'https://www.worldpadeltour.com/media-content/2022/05/juan-lebrn-chincoa-f8ffc5f991-220x260.JPG',
    img: '/lebron_iso.png',
    country: 'Spain',
    countryImg: 'https://www.worldpadeltour.com/media/images/flags/es.png',
    birthdate: '1995-01-30',
    position: 'Left',
    partner: 'Alejandro Galan',
    wins: 299,
    lost: 136,
    mPlayed: 435
  },
  {
    firstName: 'Alejandro',
    middleName: 'Galan',
    lastName: 'Romo',
    points: 14470,
    rank: 1,
    // img: 'https://www.worldpadeltour.com/media-content/2022/05/alejandro-galn-romo-504e626a7f-220x260.JPG',
    img: '/galan.png',
    country: 'Spain',
    countryImg: 'https://www.worldpadeltour.com/media/images/flags/es.png',
    birthdate: '1996-05-15',
    position: 'Left',
    partner: 'Juan Lebrón',
    wins: 306,
    lost: 114,
    mPlayed: 420
  },
  {
    firstName: 'Fernando',
    middleName: 'Belasteguin',
    lastName: '',
    points: 9370,
    rank: 7,
    img: 'https://www.worldpadeltour.com/media-content/2022/05/fernando-belastegun-0603048547-220x260.JPG',
    country: 'Argentina',
    countryImg: 'https://www.worldpadeltour.com/media/images/flags/ar.png',
    birthdate: '1979-05-19',
    position: 'Left',
    partner: 'Arturo Coello',
    wins: 453,
    lost: 75,
    mPlayed: 528
  }
];

interface PlayerCardProps {
  index: number;
}

const PlayerCard = ({ index }: PlayerCardProps) => {
  const calcPercentage = (d: number) => {
    const s = ((100 * d) / dummyData[index].mPlayed).toString() + '%';
    return s;
  };
  return (
    <div className="flex w-full justify-between player-card glass-style rounded-md">
      <div className="flex space-x-8 w-1/3">
        <div
          style={{ minWidth: '120px', minHeight: '158px' }}
          className="relative overflow-hidden"
        >
          <Image
            layout="fill"
            objectFit="contain"
            src={dummyData[index].img}
            alt="img"
          />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex flex-col">
            <span className="info-heading">{dummyData[index].firstName}</span>
            <span className="text-lg">
              {`${dummyData[index].middleName} ${dummyData[index].lastName}`}
            </span>
          </div>
          <div className="w-12 h-12 relative">
            <Image
              layout="fill"
              objectFit="contain"
              src={dummyData[index].countryImg}
              alt="img"
            />
          </div>
        </div>
      </div>
      <div className="flex space-x-12 w-full">
        <div className="flex flex-col items-center justify-center w-full ">
          <div className="space-y-4 ">
            <div className="flex flex-col">
              <span className="info-heading">Partner</span>
              <span className="text-lg">{dummyData[index].partner}</span>
            </div>
            <div className="flex flex-col">
              <span className="info-heading">Position</span>
              <span className="text-lg">{dummyData[index].position}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-4 w-full justify-center ">
          <div className="flex flex-col  ">
            <span className="info-heading">Date of Birth</span>
            <span className="text-lg">{dummyData[index].birthdate}</span>
          </div>
          <div className="flex flex-col justify-center w-full">
            <span className="info-heading mb-1">Wins/Loss</span>
            <div className="flex h-6 w-3/4 rounded-md shadow-md overflow-hidden ">
              <div
                style={{ width: `${calcPercentage(dummyData[index].wins)}` }}
                className="bg-emerald-700 flex items-center text-xs "
              >
                <span className="px-2">{dummyData[index].wins}</span>
              </div>
              <div
                style={{ width: `${calcPercentage(dummyData[index].lost)}` }}
                className="bg-red-800 flex items-center text-xs "
              >
                <span className="px-2">{dummyData[index].lost}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2  justify-center">
          <div className="flex flex-col items-end">
            <span className="info-heading">Rank</span>
            <span className="lg-stats">{dummyData[index].rank}</span>
          </div>
          <div className=" flex flex-col items-end">
            <span className="info-heading">Points</span>
            <span className="lg-stats">{dummyData[index].points}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
