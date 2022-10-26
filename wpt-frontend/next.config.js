/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['www.worldpadeltour.com', 'www.purecatamphetamine.github.io']
  }
};

module.exports = nextConfig;
