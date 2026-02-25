export interface ReplayDispatchInput {
  kind: string;
  dir?: number;
  x?: number;
  y?: number;
  value?: number;
}

export interface ReplayDispatchPlan {
  method: "move" | "insertCustomTile";
  args: number[];
}

export function planReplayDispatch(input: ReplayDispatchInput): ReplayDispatchPlan {
  if (input.kind === "m") {
    return {
      method: "move",
      args: [input.dir as number]
    };
  }

  if (input.kind === "u") {
    return {
      method: "move",
      args: [-1]
    };
  }

  if (input.kind === "p") {
    return {
      method: "insertCustomTile",
      args: [input.x as number, input.y as number, input.value as number]
    };
  }

  throw "Unknown replay action";
}
