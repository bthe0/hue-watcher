import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  hue: {
    username: process.env.HUE_USERNAME,
    appName: 'hue-auto-control',
    deviceName: 'home-automation',
    bridgeIp: '192.168.50.109',
  },
};
