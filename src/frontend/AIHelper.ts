import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { Console, LogChannel, LogLevel } from "../frontend/ConsoleController";

namespace OpenAI
{
    interface Message
    {
        role: string;
        content: string;
        refusal: any;
        annotations: any[]
    }

    interface Choice
    {
        index: number;
        message: Message;
        logprobs: any;
        finish_reason: string;
    }

    interface PromptTokenDetails
    {
        cached_tokens: number;
        audio_tokens: number;
    }

    interface CompletionTokenDetails
    {
        reasoning_tokens: number;
        audio_tokens: number;
        accepted_prediction_tokens: number;
        rejected_prediction_tokens: number;
    }

    interface Usage
    {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details: PromptTokenDetails;
        completion_tokens_details: CompletionTokenDetails;
    }

    export interface Completion
    {
        id: string;
        object: string;
        created: number;
        model: string;
        choices: Choice[];
        usage: Usage;
        service_tier: string;
        system_fingerprint: string;
    }

    export async function requestQuery(systemPrompt: string, userQuery: string, apiKey: string, model: string)
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
        return data as OpenAI.Completion;
    }
}

namespace UI
{
    export function createPremadeQueryEntry(name: string)
    {
        const entry = document.createElement("a");
        entry.textContent = name;
        return entry;
    }

    export function createRequest(content: string)
    {
        const entry = document.createElement("div");
        entry.classList.add("ai-request");
        entry.textContent = content;
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

export class AIHelper
{
    private preMadeQueriesDropdown: HTMLElement;
    private queryInput: HTMLTextAreaElement;
    private queryOutput: HTMLElement;
    private requestQueryBtn: HTMLElement;
    private newChatBtn: HTMLElement;
    private queryCallback: IAIQueryCallback;
    
    private apiKey: string;
    private model: string;
    
    private contextSoFar: string;
    private loadingElement: HTMLElement;
    private waitingForResponse: boolean;

    constructor(preMadeQueriesDropdown: HTMLElement, queryInput: HTMLTextAreaElement, queryOutput: HTMLElement, requestQueryBtn: HTMLElement, newChatBtn: HTMLElement, queryCallback: IAIQueryCallback)
    {
        this.preMadeQueriesDropdown = preMadeQueriesDropdown;
        this.queryInput = queryInput;
        this.queryOutput = queryOutput;
        this.requestQueryBtn = requestQueryBtn;
        this.newChatBtn = newChatBtn;
        this.queryCallback = queryCallback;
        this.waitingForResponse = false;

        this.resizeInput();
        this.queryInput.addEventListener('input', () => { this.resizeInput(); });

        this.queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !this.waitingForResponse)
            {
                e.preventDefault();
                this.queryCallback();
            }
        });
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
            if (!this.waitingForResponse)
                this.queryCallback();
        };

        this.newChatBtn.onclick = () => {
            this.clear();
        }
    }

    clear()
    {
        this.contextSoFar = "";
        this.queryOutput.innerHTML = "";
        this.loadingElement = null;
        this.lockSending(false);
    }

    async simulateResponse()
    {
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        await delay(2000);

        const data: OpenAI.Completion = {
            id: "test",
            object: "",
            created: 0,
            model: "",
            choices: [
                {
                    index: 0,
                    message: {
                        role: "",
                        content: "This is example content",
                        refusal: null,
                        annotations: [],
                    },
                    logprobs: null,
                    finish_reason: "",
                }
            ],
            usage: null,
            service_tier: "",
            system_fingerprint: "",
        }

        return data;
    }

    async analyseEntity(entity: RECORDING.IEntity, frame: number)
    {
        this.queryOutput.append(UI.createRequest(this.queryInput.value));

        const systemPrompt = "You are an AI assistant helping finding insights of debugging data from a videogame. You might receive entity data from the game in JSON format, containing nformation about one entity on one frame, on a videogame. The entity will have properties that describe its current state on the frame, and events that happened on that frame. You will also receive a request from a user regarding that data. You will interact with the user in a chat form, giving answers, and the user asking follow-up questions, that might come with additional data. Please answer in a comprehensive way, with bullet points if it helps with clarity. Send the reply in HTML format, indicating headers, parragraphs, lists, etc. All styles should be inlined, don't create style nodes. The html content will be added to an existing page that has a dark mode. Default text color should be #EEEEEE. Header color should be #bb86fc. Don't alter the font size or family.";

        this.contextSoFar += "User question: " + this.queryInput.value + "\n";

        this.queryInput.value = "";
        this.resizeInput();

        this.lockSending(true);

        try
        {
            const userQuery = JSON.stringify(entity);
            this.contextSoFar += "Entity data of frame " + frame + " in JSON: " + userQuery + "\n";

            const loader = UI.createLoader();
            let responseLoading = document.createElement("div");
            responseLoading.append(loader, " Thinking...");
            this.loadingElement = responseLoading;
            this.queryOutput.append(this.loadingElement);

            const completion = await OpenAI.requestQuery(systemPrompt, this.contextSoFar, this.apiKey, this.model);
            //const completion = await this.simulateResponse();

            const result = completion.choices[0].message.content;
            
            console.log(completion);

            if (this.loadingElement)
                this.loadingElement.remove();

            let response = document.createElement("div");
            response.innerHTML = result;
            this.queryOutput.append(response);

            this.contextSoFar += "Your answer: " + result + "\n";

            this.lockSending(false);
        }
        catch (error)
        {
            this.lockSending(false);
            this.queryOutput.append(UI.createResponse("Error: " + error.message));
            Console.log(LogLevel.Error, LogChannel.Files, "Error performing an AI query: " + error.message);
        }
    }

    private lockSending(isLocked: boolean)
    {
        this.waitingForResponse = isLocked;

        DOMUtils.setClass(this.requestQueryBtn, "basico-disabled", isLocked);
    }

    private resizeInput()
    {
      // reset height so scrollHeight is accurate
      this.queryInput.style.height = 'auto';

      // computed paddings (scrollHeight includes padding but CSS height (content-box)
      // does not — so subtract padding to get the correct content height)
      const cs = window.getComputedStyle(this.queryInput);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const padding = padTop + padBottom;

      // computed min/max (visual values from CSS) -> convert to content values
      const visualMax = parseFloat(cs.maxHeight) || 200;
      const visualMin = parseFloat(cs.minHeight) || 38;
      const contentMax = Math.max(0, visualMax - padding);
      const contentMin = Math.max(0, visualMin - padding);

      // scrollHeight includes padding; subtract padding to obtain content height
      const contentHeight = Math.max(this.queryInput.scrollHeight - padding + 15, contentMin);
      const finalHeight = Math.min(contentHeight, contentMax);

      this.queryInput.style.height = finalHeight + 'px';
    }
}