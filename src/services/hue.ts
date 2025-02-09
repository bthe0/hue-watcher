import { api as hueApi, discovery } from 'node-hue-api';
import { config } from '../config';
import { EventSource } from 'eventsource';
import { LightState } from '../types';

export class HueService {
  private lightStates: Map<number, boolean> = new Map();
  private api: any;

  async discoverBridge(): Promise<string> {
    const discoveryResults = await discovery.nupnpSearch();

    if (discoveryResults.length === 0) {
      throw new Error('Failed to find any Hue Bridges');
    }

    return discoveryResults[0].ipaddress;
  }

  async connect(bridgeIp: string): Promise<void> {
    this.api = await hueApi.createLocal(bridgeIp).connect(config.hue.username);
  }

  async ensureAuthenticated(bridgeIp: string): Promise<void> {
    if (config.hue.username) {
      return;
    }

    console.log('No Hue username found. Creating new username...');
    const unauthenticatedApi = await hueApi.createLocal(bridgeIp).connect();

    console.log('Press the link button on your Hue Bridge...');

    for (let i = 0; i < 15; i++) {
      try {
        const createdUser = await unauthenticatedApi.users.createUser(
          config.hue.appName,
          config.hue.deviceName
        );

        const username = createdUser.username;
        console.log('Successfully created new username:', username);
        process.exit();
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes('link button not pressed')
        ) {
          process.stdout.write(
            `\rWaiting for link button press... (${15 - i} attempts remaining)`
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        throw err;
      }
    }

    console.error(
      '\nTimed out waiting for link button press. Please try again.'
    );
    process.exit(1);
  }

  async setupEventStream(bridgeIp: string): Promise<void> {
    try {
      const eventSource = new EventSource(
        `https://${bridgeIp}/eventstream/clip/v2`,
        {
          fetch: (input: any, init: any) =>
            fetch(input, {
              ...init,
              headers: {
                ...init.headers,
                'hue-application-key': config.hue.username,
              },
            }),
        } as any
      );

      this.setupEventHandlers(eventSource, bridgeIp);
    } catch (err) {
      console.error('Failed to setup event stream:', err);
      setTimeout(() => this.setupEventStream(bridgeIp), 5000);
    }
  }

  private setupEventHandlers(eventSource: EventSource, bridgeIp: string): void {
    eventSource.onopen = () => {
      console.log('Connected to Hue Bridge event stream');
    };

    eventSource.onmessage = async (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.processLightStateChanges(data);
      } catch (err) {
        console.error('Error processing event:', err);
      }
    };

    eventSource.onerror = (err: any) => {
      console.error('EventSource error:', err);
      eventSource.close();
      setTimeout(() => this.setupEventStream(bridgeIp), 5000);
    };
  }

  private processLightStateChanges(data: LightState[]): void {
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
