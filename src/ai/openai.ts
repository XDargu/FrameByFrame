// llm/openai.ts
const OPENAI_URL = "https://api.openai.com/v1/responses";

export async function openAIRequest(apiKey: string, body: any) {
    const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok)
    {
        const errorText = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${errorText}`);
    }

    return res.json();
}

