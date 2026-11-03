import { Plugin } from "@fluxta/sdk/api";
import { windowsIO } from "./observation/io";
import { registerLeague } from "./plugin";

const plugin = new Plugin();
const observation = registerLeague(plugin, windowsIO());
plugin.onTerminal(() => observation.stop());
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    observation.stop();
    process.exit(0);
  });
}
await plugin.connect();
observation.start();
