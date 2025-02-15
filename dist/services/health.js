"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const http_1 = __importDefault(require("http"));
const config_1 = require("../config");
class HealthService {
    server;
    constructor() {
        this.server = http_1.default.createServer(this.handleRequest.bind(this));
    }
    handleRequest(req, res) {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            }));
        }
        else {
            res.writeHead(404);
            res.end();
        }
    }
    start() {
        this.server.listen(config_1.config.port, () => {
            console.log(`Health check endpoint listening on port ${config_1.config.port}`);
        });
    }
    stop() {
        return new Promise((resolve) => {
            this.server.close(() => {
                console.log('HTTP server closed');
                resolve();
            });
        });
    }
}
exports.HealthService = HealthService;
//# sourceMappingURL=health.js.map