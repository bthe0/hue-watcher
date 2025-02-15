"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const app = new app_1.App();
app.start().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map