import Layout from '@components/Layout/Layout';
import PlayerCard from '@components/PlayerCard/PlayerCard';
import type { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>WPT-Scraper</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <PlayerCard index={0} />
        <PlayerCard index={1} />
        <PlayerCard index={2} />
      </Layout>
    </>
  );
};

export default Home;
