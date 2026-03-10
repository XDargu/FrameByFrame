export const NextActionSchema = {
  description: "Optional next data request",
  oneOf: [
    { type: "null" },

    // ---- get_events ----
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { const: "get_timeline_events_summary" },
        params: {
          type: "object",
          additionalProperties: false,
          properties: {
            from_frame: { type: "number" },
            to_frame: { type: "number" },
          },
          required: ["from_frame", "to_frame"]
        }
      },
      required: ["type", "params"]
    },

    // ---- get_entity_state ----
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { const: "get_entity_state_at_frame" },
        params: {
          type: "object",
          additionalProperties: false,
          properties: {
            entity_id: { type: "string" },
            frame: { type: "number" }
          },
          required: ["entity_id", "frame"]
        }
      },
      required: ["type", "params"]
    }
  ]
};

export const InvestigationStepSchema = {
  name: "InvestigationStep",
  schema: {
    type: "object",
    additionalProperties: false,

    properties: {
      hypothesis: {
        type: "string",
        description: "Current working hypothesis for the issue"
      },

      next_action: NextActionSchema,

      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confidence in the hypothesis (0-1)"
      },

      rationale: {
        type: "string",
        description: "Short explanation for why this step was chosen"
      }
    },

    required: [
      "hypothesis",
      "next_action",
      "confidence",
      "rationale"
    ]
  }
};