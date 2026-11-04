import type { Plugin } from "@fluxta/sdk/api";
import { LeagueObservation } from "./observation/observation";
import type { LocalIO } from "./observation/io";

/** Registers the real capability; queries only read the last observation. */
export function registerLeague(
  plugin: Pick<Plugin, "registerSource" | "registerOptions" | "setConnections">,
  io: LocalIO,
): LeagueObservation {
  const observation = new LeagueObservation(io, (state) => {
    plugin.setConnections([
      {
        id: "local-client",
        title: "League of Legends",
        connected: state.clientAvailable,
      },
    ]);
  });
  for (const key of [
    "clientState",
    "clientAvailable",
    "accountState",
    "accountId",
    "accountName",
    "observedAt",
  ] as const) {
    plugin.registerSource({ key, resolve: () => observation.state()[key] });
  }
  plugin.registerOptions({
    key: "clientStates",
    resolve: () =>
      ["checking", "absent", "available", "inaccessible", "unsupported"].map(
        (value) => ({ value, label: value }),
      ),
  });
  plugin.registerOptions({
    key: "accountStates",
    resolve: () =>
      ["identified", "unidentified", "unavailable"].map((value) => ({
        value,
        label: value,
      })),
  });
  plugin.setConnections([
    { id: "local-client", title: "League of Legends", connected: false },
  ]);
  return observation;
}
