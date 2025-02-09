import { HueService } from './services/hue';
import { HealthService } from './services/health';
import { config } from './config';

export class App {
  private hueService: HueService;
  private healthService: HealthService;

  constructor() {
    this.hueService = new HueService();
    this.healthService = new HealthService();
  }

  async start(): Promise<void> {
    try {
      await this.hueService.ensureAuthenticated(config.hue.bridgeIp);
      await this.hueService.connect(config.hue.bridgeIp);
      await this.hueService.setupEventStream(config.hue.bridgeIp);

      this.healthService.start();
      this.setupShutdownHandlers();
    } catch (err) {
      console.error(
        'Failed to initialize:',
        err instanceof Error ? err.message : String(err)
      );
      process.exit(1);
    }
  }

  private setupShutdownHandlers(): void {
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM. Performing graceful shutdown...');
      await this.healthService.stop();
      process.exit(0);
    });
  }
}
