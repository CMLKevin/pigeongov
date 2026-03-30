import type { XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: {
    port: 3847,
    host: "127.0.0.1",
    endpoint: "/mcp",
    debug: false,
  },
  stdio: {
    debug: false,
  },
  paths: {
    tools: "./src/mcp/tools",
    prompts: false,
    resources: false,
  },
};

export default config;
