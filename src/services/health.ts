import http from 'http';
import { config } from '../config';

export class HealthService {
  private server: http.Server;

  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  start(): void {
    this.server.listen(config.port, () => {
      console.log(`Health check endpoint listening on port ${config.port}`);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
  }
}
