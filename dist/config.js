"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '8080', 10),
    hue: {
        username: process.env.HUE_USERNAME,
        appName: 'hue-auto-control',
        deviceName: 'home-automation',
        bridgeIp: '192.168.50.109',
    },
};
//# sourceMappingURL=config.js.map