import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { Console, LogChannel, LogLevel } from "../frontend/ConsoleController";

namespace UI
{
    export function createPremadeQueryEntry(name: string)
    {
        const entry = document.createElement("a");
        entry.textContent = name;
        return entry;
    }

    export function createResponse(content: string)
    {
        const entry = document.createElement("div");
        entry.classList.add("ai-response");
        entry.textContent = content;
        return entry;
    }

    export function createLoader()
    {
        const entry = document.createElement("span");
        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-spinner", "fa-spin");
        entry.append(icon);
        return entry;
    }
}

export interface IAIQueryCallback
{
    () : void
}

async function callOpenAI(systemPrompt: string, userQuery: string, apiKey: string, model: string)
{
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("OpenAI API error: " + err);
  }

  const data = await response.json();
  return data;
}

export class AIHelper
{
    private preMadeQueriesDropdown: HTMLElement;
    private queryInput: HTMLTextAreaElement;
    private queryOutput: HTMLElement;
    private requestQueryBtn: HTMLElement;
    private queryCallback: IAIQueryCallback;

    private apiKey: string;
    private model: string;

    constructor(preMadeQueriesDropdown: HTMLElement, queryInput: HTMLTextAreaElement, queryOutput: HTMLElement, requestQueryBtn: HTMLElement, queryCallback: IAIQueryCallback)
    {
        this.preMadeQueriesDropdown = preMadeQueriesDropdown;
        this.queryInput = queryInput;
        this.queryOutput = queryOutput;
        this.requestQueryBtn = requestQueryBtn;
        this.queryCallback = queryCallback;
    }

    setApiKey(apiKey: string)
    {
        this.apiKey = apiKey;
    }

    setModel(model: string)
    {
        this.model = model;
    }

    initialize()
    {
        let content = this.preMadeQueriesDropdown.querySelector('.basico-dropdown-content') as HTMLElement;

        const createEventFilter = UI.createPremadeQueryEntry("Explain Selection");
        createEventFilter.onclick = () => { 
            this.queryInput.value = "Explain what the entity is doing on this frame.";
        };

        const createPropertyFilter = UI.createPremadeQueryEntry("Find bugs and anomalies");
        createPropertyFilter.onclick = () => {
            this.queryInput.value = "Make a brief list of any possibl bugs or anomalies.";
        };

        content.append(createEventFilter, createPropertyFilter);

        this.preMadeQueriesDropdown.onmouseenter = () => {
            const isNearBottom = window.innerHeight - this.preMadeQueriesDropdown.getBoundingClientRect().bottom < 70;
            DOMUtils.setClass(content, "bottom", isNearBottom);
        };

        this.requestQueryBtn.onclick = () => {
            this.queryCallback();
        };
    }

    async analyseEntity(entity: RECORDING.IEntity)
    {
        this.queryOutput.innerHTML = "";

        this.queryOutput.append(UI.createLoader(), "  Waiting for an answer...");

        try
        {
            const userQuery = JSON.stringify(entity);

            const systemPrompt = "You will receive a JSON with information about a single entity, on one frame, on a videogame. The entity will have properties that describe its current state on the frame, and events that happened on that frame. You are going to receive a request about the entity. Please answer in a comprehensive way, with bullet points if it helps with clarity. Send the reply in HTML format, indicating headers, parragraphs, lists, etc. All styles should be inlined, don't create style nodes. The html content will be added to an existing page that has a dark mode. Default text color should be #EEEEEE. Header color should be #bb86fc. Don't alter the font size or family. The request is: " + this.queryInput.value;
            const completion = await callOpenAI(systemPrompt, userQuery, this.apiKey, this.model);
            
            console.log(completion.choices);

            this.queryOutput.innerHTML = completion.choices[0].message.content;
        }
        catch (error)
        {
            this.queryOutput.innerHTML = "Error: " + error.message;
            Console.log(LogLevel.Error, LogChannel.Files, "Error performing an AI query: " + error.message);
        }
    }
}