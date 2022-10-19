import React from 'react';
import Image from 'next/image';
const Header = () => {
  return (
    <div className="w-full h-32 flex justify-center items-center">
      <div className="w-80 h-40 relative mt-16">
        <Image
          layout="fill"
          objectFit="contain"
          src="/padel_gurus.png"
          alt="img"
        />
      </div>
      {/* <h1 className="text-2xl uppercase">WPT - Stats - Visualizer</h1> */}
    </div>
  );
};

export default Header;
