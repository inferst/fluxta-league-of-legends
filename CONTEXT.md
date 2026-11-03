# League of Legends

Local observation of the streamer's League client and game for Fluxta scenarios.

## Language

**League Client**:
The local application used to sign in, choose a queue and launch a game.
It can be available while no game is running.
_Avoid_: game (when referring to the client).

**Client Availability**:
Whether the local League Client can currently be reached. A detected but
inaccessible client differs from an absent client.

**Active Account**:
The account currently identified by the local League Client. An unidentified
account is not a previously observed account.
_Avoid_: participant (an account outside a match).

**Riot ID**:
The account's player-facing game name and tag line together.
_Avoid_: summoner name (as a substitute for a Riot ID).

**Ranked Queue**:
A separate ranking track: Solo/Duo or Flex. A rank in one does not establish
a rank in the other.

**Match**:
A supported Summoner's Rift game being observed.

**Participant**:
A player within one Match, on the streamer's allied or opposing team.

**Final Composition**:
The champions assigned to the participants on a team after selection is final.
_Avoid_: hovered champions.

**Roster Ready**:
The point at which the streamer's identity, both team memberships and both
Final Compositions are known.

**External Connection**:
Fluxta's indicator for reachability of the local League Client. It is distinct
from the plugin process's Connection to Fluxta.
