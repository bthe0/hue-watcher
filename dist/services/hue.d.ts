export declare class HueService {
    private lightStates;
    private api;
    discoverBridge(): Promise<string>;
    connect(bridgeIp: string): Promise<void>;
    ensureAuthenticated(bridgeIp: string): Promise<void>;
    setupEventStream(bridgeIp: string): Promise<void>;
    private setupEventHandlers;
    private processLightStateChanges;
}
