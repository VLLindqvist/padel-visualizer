import React from 'react';

interface StatProps {
  heading: string;
  stat: string | number;
}

const Stat = ({ heading, stat }: StatProps) => {
  return (
    <div className="flex flex-col">
      <span className="info-heading">{heading}</span>
      <span className="text-lg">{stat}</span>
    </div>
  );
};

export default Stat;
