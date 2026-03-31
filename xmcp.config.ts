import type { XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  template: {
    name: "pigeongov",
    description: "PigeonGov MCP server — 34 government workflows, eligibility screening, benefits cliff analysis, and more.",
  },
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
  bundler: (rspackConfig) => {
    // Resolve .js imports to .ts source files (ESM TypeScript convention)
    rspackConfig.resolve = {
      ...rspackConfig.resolve,
      extensionAlias: {
        ...rspackConfig.resolve?.extensionAlias,
        ".js": [".ts", ".js"],
      },
    };
    return rspackConfig;
  },
};

export default config;
