import type { ReplayRecord } from "../../../src/contracts";
import {
  shareJsonFile,
  type JsonFileShareNativePort,
  type JsonFileShareOptions,
} from "./json-file-share";

export type ReplayShareNativePort = JsonFileShareNativePort;
export interface SaveReplayOptions extends JsonFileShareOptions {}

export const REPLAY_FILENAME = "2048-next-replay.json";

export async function saveReplayRecord(
  replay: ReplayRecord,
  options: SaveReplayOptions = {},
): Promise<void> {
  await shareJsonFile(
    {
      directory: "replay-share",
      filename: REPLAY_FILENAME,
      title: "2048 NEXT replay",
      serialized: JSON.stringify(replay, null, 2),
    },
    options,
  );
}
