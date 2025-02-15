"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HueService = void 0;
const node_hue_api_1 = require("node-hue-api");
const config_1 = require("../config");
const eventsource_1 = require("eventsource");
const lighting_1 = require("./lighting");
class HueService {
    allLights = new Map();
    lightingService;
    trackedLights = [
        'Kitchen 1',
        'Kitchen 2',
        'Kitchen 3',
        'Storage 1',
        'Hallway 2 1',
        'Bathroom 2 1',
    ];
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
        this.lightingService = new lighting_1.LightingService({
            latitude: 44.3302,
            longitude: 23.7949,
        });
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
        const lights = await this.api.lights.getAll();
        for (const light of lights) {
            this.allLights.set(`/lights/${light.data.id}`, light);
        }
        setInterval(() => {
            const { brightness, colorTemp } = this.lightingService.getCurrentLightState();
            for (const light of this.allLights.values()) {
                if (this.trackedLights.includes(light.data.name)) {
                    const state = new node_hue_api_1.model.LightState()
                        .brightness(brightness)
                        .ct(colorTemp);
                    this.api.lights.setLightState(light.data.id, state);
                }
            }
        }, 30 * 60 * 1000);
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
                console.dir(data, { depth: null });
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
            if (change.type === 'update' && change.data[0].status === 'connected') {
                const lightId = change.data[0].id_v1;
                const light = this.allLights.get(lightId);
                if (!light) {
                    continue;
                }
                const id = light.data.id;
                const name = light.data.name;
                if (!this.trackedLights.includes(name)) {
                    continue;
                }
                const { brightness, colorTemp } = this.lightingService.getCurrentLightState();
                const state = new node_hue_api_1.model.LightState()
                    .brightness(brightness)
                    .ct(colorTemp);
                this.api.lights.setLightState(id, state);
            }
        }
    }
}
exports.HueService = HueService;
//# sourceMappingURL=hue.js.map