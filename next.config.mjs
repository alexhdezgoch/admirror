/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
  serverExternalPackages: ['ffmpeg-static'],
};

export default nextConfig;
