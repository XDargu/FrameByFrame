
export const ToolGetTimelineEvents = {
      type: "function",
      function: {
        name: "get_timeline_events",
        description: "Returns important events in a frame range",
        parameters: {
            type: "object",
            properties: {
            frameFrom: { type: "number", description: "First frame on the range." },
            frameTo: { type: "number", description: "Last frame on the range." },
            },
            required: ["frameFrom", "frameTo"],
            additionalProperties: false,
        }
        }
    };

export const ToolGetEntityData = {  
    type: "function",
    function: {
      name: "get_entity_data",
      description: "Returns full data of an entity at a specific frame",
      parameters: {
        type: "object",
        properties: {
          entityId: { type: "number" },
          frame: { type: "number" },
        },
        required: ["entityId", "frame"],
      }
    }
};

export const ToolGetEntitiesAtFrame = {
    type: "function",
    function: {
      name: "get_entities_at_frame",
      description: "Returns a list of entities and summary info for a given frame",
      parameters: {
        type: "object",
        properties: {
          frame: { type: "number" },
        },
        required: ["frame"],
      },
    }
};

/*export type ToolAction =
  | {
      type: "function",
      name: "get_timeline_events",
      description: "Returns important events in a frame range",
      parameters: {
        type: "object",
        properties: {
          frameFrom: { type: "number", description: "First frame on the range." },
          frameTo: { type: "number", description: "Last frame on the range." },
        },
        required: ["frameFrom", "frameTo"],
        additionalProperties: false,
      };
    }
  | {
    type: "function",
      name: "get_entity_data";
      description: "Returns full data of an entity at a specific frame";
      parameters: {
        type: "object";
        properties: {
          entityId: { type: "number" };
          frame: { type: "number" };
        };
        required: ["entityId", "frame"];
      };
    }
  | {
    type: "function",
      name: "get_entities_at_frame";
      description: "Returns a list of entities and summary info for a given frame";
      parameters: {
        type: "object";
        properties: {
          frame: { type: "number" };
        };
        required: ["frame"];
      };
    };

export async function executeTool(action: ToolAction): Promise<any> {
  switch (action.type) {
    case "get_timeline_events_summary":
      return getEvents(
        action.params.from_frame,
        action.params.to_frame,
        action.params.event_types,
      );

    case "get_entity_state_at_frame":
      return getEntityState(action.params.entity_id, action.params.frame);

    default:
      throw new Error(`Unknown tool: ${(action as any).type}`);
  }
}

async function getEvents(from: number, to: number, types: string[]) {
  return {
    events: [
      {
        id: "evt_99182",
        type: "KillEvent",
        frame: 12312,
        killer: "Player_17",
        victim: "Player_03",
        source: "ReplaySystem",
      },
    ],
    truncated: false,
  };
}

async function getEntityState(entityId: string, frame: number) {
  return {
    entity_id: entityId,
    frame,
    health: 100,
    team: "Red",
    alive: true,
  };
}
*/