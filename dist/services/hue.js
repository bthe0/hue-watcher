"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HueService = void 0;
const node_hue_api_1 = require("node-hue-api");
const config_1 = require("../config");
const eventsource_1 = require("eventsource");
class HueService {
    lightStates = new Map();
    api;
    async discoverBridge() {
        const discoveryResults = await node_hue_api_1.discovery.nupnpSearch();
        if (discoveryResults.length === 0) {
            throw new Error('Failed to find any Hue Bridges');
        }
        return discoveryResults[0].ipaddress;
    }
    async connect(bridgeIp) {
        this.api = await node_hue_api_1.api.createLocal(bridgeIp).connect(config_1.config.hue.username);
    }
    async ensureAuthenticated(bridgeIp) {
        if (config_1.config.hue.username) {
            return;
        }
        console.log('No Hue username found. Creating new username...');
        const unauthenticatedApi = await node_hue_api_1.api.createLocal(bridgeIp).connect();
        console.log('Press the link button on your Hue Bridge...');
        for (let i = 0; i < 15; i++) {
            try {
                const createdUser = await unauthenticatedApi.users.createUser(config_1.config.hue.appName, config_1.config.hue.deviceName);
                const username = createdUser.username;
                console.log('Successfully created new username:', username);
                process.exit();
            }
            catch (err) {
                if (err instanceof Error &&
                    err.message.includes('link button not pressed')) {
                    process.stdout.write(`\rWaiting for link button press... (${15 - i} attempts remaining)`);
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    continue;
                }
                throw err;
            }
        }
        console.error('\nTimed out waiting for link button press. Please try again.');
        process.exit(1);
    }
    async setupEventStream(bridgeIp) {
        try {
            const eventSource = new eventsource_1.EventSource(`https://${bridgeIp}/eventstream/clip/v2`, {
                fetch: (input, init) => fetch(input, {
                    ...init,
                    headers: {
                        ...init.headers,
                        'hue-application-key': config_1.config.hue.username,
                    },
                }),
            });
            this.setupEventHandlers(eventSource, bridgeIp);
        }
        catch (err) {
            console.error('Failed to setup event stream:', err);
            setTimeout(() => this.setupEventStream(bridgeIp), 5000);
        }
    }
    setupEventHandlers(eventSource, bridgeIp) {
        eventSource.onopen = () => {
            console.log('Connected to Hue Bridge event stream');
        };
        eventSource.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                this.processLightStateChanges(data);
            }
            catch (err) {
                console.error('Error processing event:', err);
            }
        };
        eventSource.onerror = (err) => {
            console.error('EventSource error:', err);
            eventSource.close();
            setTimeout(() => this.setupEventStream(bridgeIp), 5000);
        };
    }
    processLightStateChanges(data) {
        for (const change of data) {
            if (change.type === 'light' && change.on !== undefined) {
                const lightId = parseInt(change.id);
                const wasReachable = this.lightStates.get(lightId);
                const isReachable = change.on.on;
                if (!wasReachable && isReachable) {
                    console.log(`Light ${lightId} reconnected`);
                }
                this.lightStates.set(lightId, isReachable);
            }
        }
    }
}
exports.HueService = HueService;
//# sourceMappingURL=hue.js.map