type Data = null | string | number | boolean | Data[] | { [key: string]: Data };

export type EndpointObservation = {
  endpoint: string;
  startedAt: string;
  finishedAt: string;
  status: number;
  data: Data;
};
export type EvidenceFrame = {
  startedAt: string;
  observedAt: string;
  clientState: string;
  accountState: string;
  requests: EndpointObservation[];
};

/**
 * Explicit projection, never a recursive copy of an unknown response. Aliases
 * stay consistent for one capture and preserve joins between the local APIs.
 * Unknown field names are recorded for contract inspection; values are dropped.
 */
export class EvidenceSanitizer {
  private aliases = new Map<string, Map<string | number, string | number>>();

  endpoint(path: string, input: unknown, password?: string): Data {
    let output: Data = null;
    const obj = object(input);
    if (path.endsWith("/gameflow-phase") || path.endsWith("/game-version")) {
      output = typeof input === "string" ? input.slice(0, 120) : null;
    } else if (path.endsWith("/current-summoner")) {
      output = this.identity(obj, this.pick(obj, ["summonerLevel"]));
    } else if (path.endsWith("/current-ranked-stats")) {
      output = this.pick(obj, []);
      const queue = (value: unknown) =>
        this.pick(object(value), [
          "queueType",
          "tier",
          "division",
          "leaguePoints",
          "wins",
          "losses",
          "isProvisional",
          "provisionalGamesRemaining",
          "highestTier",
          "highestDivision",
        ]);
      if (Array.isArray(obj.queues))
        output.queues = obj.queues.slice(0, 30).map(queue);
      if (obj.queueMap && typeof obj.queueMap === "object") {
        const map = object(obj.queueMap);
        output.queueMap = Object.fromEntries(
          ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"]
            .filter((key) => key in map)
            .map((key) => [key, queue(map[key])]),
        );
      }
    } else if (path.endsWith("/lol-gameflow/v1/session")) {
      const game = object(obj.gameData);
      const gameData = this.pick(game, ["gameMode", "mapId", "isCustomGame"]);
      if (typeof game.gameId === "number")
        gameData.gameId = this.alias("game", game.gameId);
      if (game.queue !== undefined)
        gameData.queue = this.pick(object(game.queue), [
          "id",
          "type",
          "gameMode",
          "mapId",
        ]);
      for (const key of ["teamOne", "teamTwo"]) {
        if (Array.isArray(game[key]))
          gameData[key] = game[key].slice(0, 20).map((value) => {
            const player = object(value);
            return this.identity(
              player,
              this.pick(player, [
                "championId",
                "teamParticipantId",
                "selectedPosition",
                "spell1Id",
                "spell2Id",
              ]),
            );
          });
      }
      output = {
        ...this.pick(obj, ["phase"]),
        ...(obj.gameData !== undefined ? { gameData } : {}),
      };
    } else if (path.endsWith("/allgamedata")) {
      output = this.pick(obj, []);
      if (obj.gameData !== undefined)
        output.gameData = this.pick(object(obj.gameData), [
          "gameMode",
          "gameTime",
          "mapName",
          "mapNumber",
          "mapTerrain",
        ]);
      if (obj.activePlayer !== undefined)
        output.activePlayer = this.identity(
          object(obj.activePlayer),
          this.pick(object(obj.activePlayer), ["level"]),
        );
      if (Array.isArray(obj.allPlayers))
        output.allPlayers = obj.allPlayers.slice(0, 20).map((value) => {
          const player = object(value);
          const result = this.identity(
            player,
            this.pick(player, [
              "championName",
              "rawChampionName",
              "team",
              "position",
              "level",
              "isDead",
              "respawnTimer",
            ]),
          );
          if (player.scores !== undefined)
            result.scores = this.pick(object(player.scores), [
              "kills",
              "deaths",
              "assists",
              "creepScore",
              "wardScore",
            ]);
          return result;
        });
      if (obj.events !== undefined) {
        const events = object(obj.events).Events;
        output.events = {
          _observedKeys: Object.keys(object(obj.events)).sort(),
        };
        if (Array.isArray(events)) {
          output.events._totalEvents = events.length;
          output.events.Events = events.slice(-50).map((value) => {
            const event = object(value);
            const result = this.pick(event, [
              "EventID",
              "EventName",
              "EventTime",
              "TurretKilled",
              "InhibKilled",
              "DragonType",
              "Stolen",
              "KillStreak",
              "Result",
            ]);
            for (const key of ["KillerName", "VictimName", "Recipient"]) {
              if (typeof event[key] === "string")
                result[key] = this.playerName(event[key]);
            }
            if (Array.isArray(event.Assisters))
              result.Assisters = event.Assisters.filter(
                (value): value is string => typeof value === "string",
              ).map((name) => this.playerName(name));
            return result;
          });
        }
      }
    }
    // Even an unexpected credential echo in an allowed field must be removed.
    if (!password) return output;
    const secrets = [
      password,
      Buffer.from(`riot:${password}`).toString("base64"),
    ];
    const scrub = (value: Data): Data => {
      if (typeof value === "string")
        return secrets.reduce(
          (text, secret) => text.replaceAll(secret, "[redacted]"),
          value,
        );
      if (Array.isArray(value)) return value.map(scrub);
      if (value !== null && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, scrub(item)]),
        );
      return value;
    };
    return scrub(output);
  }

  private pick(
    input: Record<string, unknown>,
    keys: string[],
  ): { [key: string]: Data } {
    const result: { [key: string]: Data } = {
      _observedKeys: Object.keys(input).sort(),
    };
    for (const key of keys) {
      const value = input[key];
      if (
        value === null ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
      )
        result[key] = value;
      if (typeof value === "string") result[key] = value.slice(0, 120);
    }
    return result;
  }

  private identity(
    input: Record<string, unknown>,
    result: { [key: string]: Data },
  ): { [key: string]: Data } {
    for (const key of ["puuid", "summonerId", "accountId"]) {
      const value = input[key];
      if (typeof value === "string" || typeof value === "number")
        result[key] = this.alias(key, value);
      else if (value === null) result[key] = null;
    }
    for (const key of [
      "gameName",
      "riotIdGameName",
      "displayName",
      "summonerName",
    ]) {
      if (typeof input[key] === "string")
        result[key] = this.playerName(input[key]);
    }
    for (const key of ["tagLine", "riotIdTagLine"]) {
      if (typeof input[key] === "string")
        result[key] = this.alias("tag", input[key]);
    }
    if (typeof input.riotId === "string")
      result.riotId = this.playerName(input.riotId);
    return result;
  }

  private playerName(value: string): string {
    if (!value) return value;
    const separator = value.lastIndexOf("#");
    return separator < 0
      ? String(this.alias("player", value))
      : `${this.alias("player", value.slice(0, separator))}#${this.alias("tag", value.slice(separator + 1))}`;
  }

  private alias(kind: string, value: string | number): string | number {
    if (value === "" || value === 0 || value === "0") return value;
    if (
      kind === "puuid" &&
      typeof value === "string" &&
      /^0+$/.test(value.replaceAll("-", ""))
    )
      return value;
    let aliases = this.aliases.get(kind);
    if (!aliases) {
      aliases = new Map();
      this.aliases.set(kind, aliases);
    }
    let alias = aliases.get(value);
    if (alias === undefined) {
      alias =
        typeof value === "number"
          ? aliases.size + 1
          : `${kind}-${aliases.size + 1}`;
      aliases.set(value, alias);
    }
    return alias;
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
