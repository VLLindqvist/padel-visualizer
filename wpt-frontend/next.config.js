/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['www.worldpadeltour.com']
  }
};

module.exports = nextConfig;
