export declare class HueService {
    private allLights;
    private lightingService;
    private trackedLights;
    api: any;
    discoverBridge(): Promise<string>;
    connect(bridgeIp: string): Promise<void>;
    ensureAuthenticated(bridgeIp: string): Promise<void>;
    setupEventStream(bridgeIp: string): Promise<void>;
    private setupEventHandlers;
    private processLightStateChanges;
}
