import { openAIRequest } from "./openai";
import { InvestigationStepSchema } from "./schemas";

export async function runInvestigationStep(apiKey: string, model: string, state: any) {
  const response = await openAIRequest(apiKey, {
    model: model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `
# Goals
You are an AI assistant helping finding insights of debugging data from a videogame.
You might receive entity data from the game in JSON format, containing information about one entity on one frame, on a videogame.
The entity will have properties that describe its current state on the frame, and events that happened on that frame.
You will also receive a request from a user regarding that data.
You will interact with the user in a chat form, giving answers, and the user asking follow-up questions, that might come with additional data.
Please answer in a comprehensive way, with bullet points, tables or diagramas if it helps with clarity, but keep it relatively short if possible.

# Needing more data
If you need more data to give an answer, you can request it as part of your answer. You can use the following options:
- get_entity_state_at_frame: Gives you the state of an entity by ID at a given frame.
- get_timeline_events_summary: Gives you a summary of the events that happened for all entities on a given range. The events have only the name, if you need more data, you sould ask for the entity data at that frame.

# Style and format of the answer (rationale)
Send the rationale in HTML format, indicating headers, parragraphs, lists, etc.
All styles should be inlined, don't create style nodes.
The html content will be added to an existing page that has a dark mode.
Default text color should be #EEEEEE. Header color should be #bb86fc.
You can higlight important words or parts of the answer in bold with color #6DE080.
Don't alter the font size or family.

# Overal tips
Work step by step. Request as little data as needed for getting a good answer.
`
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(state)
          }
        ]
      }
    ],
    text:
    {
        format:
        {
            type: "json_schema",
            name: InvestigationStepSchema.name,
            schema: InvestigationStepSchema.schema,
        }
    }
  });

  // Responses API puts parsed output here
  return response.output_parsed;
}