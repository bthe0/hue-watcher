import { App } from './app';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = new App();
app.start().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
