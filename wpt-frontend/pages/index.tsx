import Layout from '@components/Layout/Layout';
import PlayerCard from '@components/PlayerCard/PlayerCard';
import type { NextPage } from 'next';
import Head from 'next/head';
import { PlayerBasic } from './api/getPlayers';
const Home: NextPage = (props: any) => {
  console.log(props);
  const players = props.data;
  return (
    <>
      <Head>
        <title>WPT-Scraper</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        {players.map((player: PlayerBasic, index: number) => (
          <PlayerCard key={index} playerData={player} />
        ))}
      </Layout>
    </>
  );
};

export default Home;

export const getStaticProps = async () => {
  try {
    const data = await fetch(`http://localhost:3000/api/getPlayers`);
    const players = await data.json();
    console.log('asdasdsa', players);
    return { props: { data: players.playerData } };
  } catch (error) {
    throw Error;
  }
};
