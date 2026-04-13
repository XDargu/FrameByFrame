
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