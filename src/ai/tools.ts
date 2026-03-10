export type ToolAction =
  | {
      type: "get_timeline_events_summary";
      params: {
        from_frame: number;
        to_frame: number;
        event_types: string[];
      };
    }
  | {
      type: "get_entity_state_at_frame";
      params: {
        entity_id: string;
        frame: number;
      };
    };

export async function executeTool(action: ToolAction): Promise<any> {
  switch (action.type) {
    case "get_timeline_events_summary":
      return getEvents(
        action.params.from_frame,
        action.params.to_frame,
        action.params.event_types
      );

    case "get_entity_state_at_frame":
      return getEntityState(
        action.params.entity_id,
        action.params.frame
      );

    default:
      throw new Error(`Unknown tool: ${(action as any).type}`);
  }
}

async function getEvents(
  from: number,
  to: number,
  types: string[]
) {
  return {
    events: [
      {
        id: "evt_99182",
        type: "KillEvent",
        frame: 12312,
        killer: "Player_17",
        victim: "Player_03",
        source: "ReplaySystem"
      }
    ],
    truncated: false
  };
}

async function getEntityState(entityId: string, frame: number) {
  return {
    entity_id: entityId,
    frame,
    health: 100,
    team: "Red",
    alive: true
  };
}