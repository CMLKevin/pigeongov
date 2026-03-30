# Privacy policy

`PigeonGov` is designed to be local-first and privacy-preserving across the CLI, TUI, browser planner/reviewer, and MCP server.

## What this means

- Form and workflow data stays on your machine unless you explicitly choose to move the files yourself.
- The CLI, TUI, local MCP server, and browser planner should not send application data to cloud services.
- No telemetry should be collected.
- No analytics should be embedded.
- No user tax or application data should be written to logs.
- Sensitive fields such as SSNs should be masked in terminal input.

## File handling

- Input PDFs, JSON files, generated outputs, and workflow bundles are read and written locally.
- You control where files are stored.
- The tool should not upload documents anywhere.

## Browser planner and reviewer

- The public website is a client-side planner and reviewer, not a hosted filing backend.
- Uploaded bundle JSON in the reviewer is processed in the browser session for local inspection.
- The planner generates local starter payloads and sample bundle downloads. It does not submit forms to agencies.

## MCP behavior

- The MCP server is an interface to the same local engine and workflow registry.
- Agent requests should be processed without exfiltrating user data.
- Any future network activity must be opt-in and must never include return or application contents by default.

## Third-party libraries

The project may rely on open-source libraries for CLI, PDF, schema, and MCP support. These libraries should be used locally and should not receive user form data unless a specific feature explicitly requires it and the user opts in.

## What to do if privacy is at risk

If any feature would require sending user data off-device, it should be treated as a separate, explicit opt-in workflow and documented clearly before use.
