import { openAIRequest } from "./openai";
/*import { ExplanationSchema } from "./schemas";

export async function generateExplanation(apiKey: string, investigationResult: any) {
  const response = await openAIRequest(apiKey, {
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `
You are generating a final debugging explanation.
Use structured rich text nodes.
`
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify(investigationResult)
          }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: ExplanationSchema
    }
  });

  return response.output_parsed;
}*/