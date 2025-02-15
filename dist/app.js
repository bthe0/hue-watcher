"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const hue_1 = require("./services/hue");
const health_1 = require("./services/health");
const config_1 = require("./config");
class App {
    hueService;
    healthService;
    constructor() {
        this.hueService = new hue_1.HueService();
        this.healthService = new health_1.HealthService();
    }
    async start() {
        try {
            await this.hueService.ensureAuthenticated(config_1.config.hue.bridgeIp);
            await this.hueService.connect(config_1.config.hue.bridgeIp);
            await this.hueService.setupEventStream(config_1.config.hue.bridgeIp);
            this.healthService.start();
            this.setupShutdownHandlers();
        }
        catch (err) {
            console.error('Failed to initialize:', err instanceof Error ? err.message : String(err));
            process.exit(1);
        }
    }
    setupShutdownHandlers() {
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM. Performing graceful shutdown...');
            await this.healthService.stop();
            process.exit(0);
        });
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map