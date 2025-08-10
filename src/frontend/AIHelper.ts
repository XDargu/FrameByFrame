import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { Console, LogChannel, LogLevel } from "../frontend/ConsoleController";
import { createContextMenu } from "../frontend/ContextMenu";
import { ResizeObserver } from 'resize-observer';

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
    export interface EntityContextCallback
    {
        (context: EntityContext) : void
    }

    export interface TimelineContextCallback
    {
        (context: TimelineContext) : void
    }

    export function createIntroMessage()
    {
        const entry = document.createElement("span");
        entry.innerHTML = `Attach data with the <i class="fas fa-plus"></i> button and ask anything you want`;
        return entry;
    }

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
        const text = document.createElement("span");
        text.textContent = content;
        entry.append(text);
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

    export function createEntityContext(context: EntityContext, onDelete?: EntityContextCallback)
    {
        const entry = document.createElement("div");
        entry.classList.add("ai-context");

        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-user");
        
        const text = document.createElement("span");
        text.textContent = `${context.name} (frame ${context.frame}) (${context.tag})`;

        entry.append(icon, text);

        if (onDelete)
        {
            const deleteIcon = document.createElement("i");
            deleteIcon.classList.add("fas", "fa-trash", "ai-delete");
            deleteIcon.title = "Remove entity context";

            deleteIcon.onclick = () => { onDelete(context); }

            entry.append(deleteIcon);
        }

        return entry;
    }

    export function createTimelineContext(context: TimelineContext, onDelete?: TimelineContextCallback)
    {
        const entry = document.createElement("div");
        entry.classList.add("ai-context");

        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-clock");
        
        const text = document.createElement("span");
        text.textContent = `Timeline (frames ${context.frameFrom}-${context.frameTo})`;

        entry.append(icon, text);

        if (onDelete)
        {
            const deleteIcon = document.createElement("i");
            deleteIcon.classList.add("fas", "fa-trash", "ai-delete");
            deleteIcon.title = "Remove timeline context";

            deleteIcon.onclick = () => { onDelete(context); }

            entry.append(deleteIcon);
        }

        return entry;
    }

    export function createRequestContext(context: ContextElements[])
    {
        const entry = document.createElement("div");
        entry.classList.add("ai-request-context");

        for (let ctx of context)
        {
            switch (ctx.context.type)
            {
                case ContextType.Entity: entry.append(createEntityContext(ctx.context)); break;
                case ContextType.Timeline: entry.append(createTimelineContext(ctx.context)); break;
            }
        }
        
        return entry;
    }
}

export interface IAIQueryCallback
{
    () : void
}

export interface IAIAddEntityContextCallback
{
    () : void
}

export interface IAIAddTimelineContextCallback
{
    () : void
}

enum ContextType
{
    Entity,
    Timeline
}

interface BaseContext
{
    type: ContextType;
}

interface EntityContext extends BaseContext
{
    entity: RECORDING.IEntity;
    name: string;
    frame: number;
    tag: string;
    type: ContextType.Entity;
}

function isEntityContextSame(a: EntityContext, b: EntityContext)
{
    return a.entity == b.entity && a.name == b.name && a.frame == b.frame && a.tag == b.tag;
}

export interface TimelineContextEntry
{
    frame: number;
    entityId: number;
    entityName: string;
    eventName: string;
}

interface TimelineContext extends BaseContext
{
    frameFrom: number;
    frameTo: number;
    content: TimelineContextEntry[];
    type: ContextType.Timeline;
}

function isTimelineContextSame(a: TimelineContext, b: TimelineContext)
{
    return a.frameFrom == b.frameFrom && a.frameTo == b.frameTo;
}

interface ContextElements
{
    context: EntityContext | TimelineContext;
    element: HTMLElement;
}

function isContextEqual(a: ContextElements, b: ContextElements)
{
    if (a.context.type != b.context.type)
        return false;

    switch (a.context.type)
    {
        case ContextType.Entity: return isEntityContextSame(a.context as EntityContext, b.context as EntityContext);
        case ContextType.Timeline: return isTimelineContextSame(a.context as TimelineContext, b.context as TimelineContext);
    }

    return false;
}

export class AIHelper
{
    private preMadeQueriesDropdown: HTMLElement;
    private queryInput: HTMLTextAreaElement;
    private queryOutput: HTMLElement;
    private requestQueryBtn: HTMLElement;
    private newChatBtn: HTMLElement;
    private addGlobalBtn: HTMLElement;
    private entityContextList: HTMLElement;
    private inputWrapper: HTMLElement;
    private queryCallback: IAIQueryCallback;
    private addEntityContextCallback: IAIAddEntityContextCallback;
    private addTimelineContextCallback: IAIAddTimelineContextCallback;
    
    private apiKey: string;
    private model: string;
    
    private contextSoFar: string;
    private loadingElement: HTMLElement;
    private waitingForResponse: boolean;

    private contextElements: ContextElements[] = [];

    constructor(preMadeQueriesDropdown: HTMLElement, queryInput: HTMLTextAreaElement, queryOutput: HTMLElement, 
        requestQueryBtn: HTMLElement, newChatBtn: HTMLElement,
        addGlobalBtn: HTMLElement,
        entityContextList: HTMLElement,
        inputWrapper: HTMLElement,
        queryCallback: IAIQueryCallback,
        addEntityContextCallback: IAIAddEntityContextCallback,
        addTimelineContextCallback: IAIAddTimelineContextCallback)
    {
        this.preMadeQueriesDropdown = preMadeQueriesDropdown;
        this.queryInput = queryInput;
        this.queryOutput = queryOutput;
        this.requestQueryBtn = requestQueryBtn;
        this.newChatBtn = newChatBtn;
        
        this.addGlobalBtn = addGlobalBtn;

        this.inputWrapper = inputWrapper;
        this.entityContextList = entityContextList;
        this.queryCallback = queryCallback;
        this.addEntityContextCallback = addEntityContextCallback;
        this.addTimelineContextCallback = addTimelineContextCallback;
        this.waitingForResponse = false;

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
            this.resizeInput();
        };

        const createPropertyFilter = UI.createPremadeQueryEntry("Find bugs and anomalies");
        createPropertyFilter.onclick = () => {
            this.queryInput.value = "Make a brief list of any possible bugs or anomalies.";
            this.resizeInput();
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

        // Context menu for items
        const config = [
            { text: "Add entity context", icon: "fa-user", callback: () => { this.addEntityContextCallback(); } },
            { text: "Add timeline context", icon: "fa-clock", callback: () => { this.addTimelineContextCallback(); } },
        ];

        this.addGlobalBtn.onclick = (ev) => {
            createContextMenu(ev.pageX, ev.pageY, ev.target as HTMLElement, config);
        }

        // Update wrapper
        this.queryInput.addEventListener('focus', () => {
            DOMUtils.setClass(this.inputWrapper, "focus", true);
        });

        this.queryInput.addEventListener('blur', () => {
            DOMUtils.setClass(this.inputWrapper, "focus", false);
        });

        // Resize observe
        let resizeObserver = new ResizeObserver(entries => {
            this.resizeInput();
        });

        resizeObserver.observe(this.inputWrapper);


        this.clear();
    }

    clear()
    {
        this.contextSoFar = "";
        this.queryOutput.innerHTML = "";
        this.queryOutput.append(UI.createIntroMessage());
        DOMUtils.setClass(this.newChatBtn, "hide-element", true);
        DOMUtils.setClass(this.preMadeQueriesDropdown, "hide-element", false);

        this.queryInput.value = "";
        this.resizeInput();
        this.loadingElement = null;

        // Clear context
        this.contextElements = [];
        this.entityContextList.innerHTML = "";

        this.lockSending(false);
        this.updateContextStyle();
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

    async analyse()
    {
        const request = UI.createRequest(this.queryInput.value);

        if (this.contextElements.length > 0)
        {
            request.prepend(UI.createRequestContext(this.contextElements));
        }

        DOMUtils.setClass(this.newChatBtn, "hide-element", false);
        DOMUtils.setClass(this.preMadeQueriesDropdown, "hide-element", true);

        this.queryOutput.append(request);

        const systemPrompt = "You are an AI assistant helping finding insights of debugging data from a videogame. You might receive entity data from the game in JSON format, containing nformation about one entity on one frame, on a videogame. The entity will have properties that describe its current state on the frame, and events that happened on that frame. You will also receive a request from a user regarding that data. You will interact with the user in a chat form, giving answers, and the user asking follow-up questions, that might come with additional data. Please answer in a comprehensive way, with bullet points if it helps with clarity, but keep it relatively short if possible. If the user hasn't provided any data ask for it, and do not mention JSON. The user can provide entity data by clicking on the 'Add Entity Context' button. Send the reply in HTML format, indicating headers, parragraphs, lists, etc. All styles should be inlined, don't create style nodes. The html content will be added to an existing page that has a dark mode. Default text color should be #EEEEEE. Header color should be #bb86fc. You can higlight important words or parts of the answer in bold with color #6DE080. Don't alter the font size or family.";

        this.contextSoFar += "User question: " + this.queryInput.value + "\n";

        this.queryInput.value = "";
        this.resizeInput();

        this.lockSending(true);

        try
        {
            for (let contextElem of this.contextElements)
            {
                const context = contextElem.context;

                switch (context.type)
                {
                    case ContextType.Entity:
                        {
                            const userQuery = JSON.stringify(context.entity);
                            this.contextSoFar += `Entity data of frame ${context.frame}, with name: ${context.name}, frame tag ${context.tag} in JSON: ${userQuery}\n`;
                            break;
                        }
                    case ContextType.Timeline:
                        {
                            const timelineData = JSON.stringify(context.content);
                            this.contextSoFar += `Information about events for each entity and frame, in JSON: ` + timelineData;
                            break;
                        }
                }

                
            }

            if (this.contextElements.length == 0)
            {
                this.contextSoFar += "No entity data sent this frame.\n";
            }

            const loader = UI.createLoader();
            let responseLoading = document.createElement("div");
            responseLoading.append(loader, " Thinking...");
            this.loadingElement = responseLoading;
            this.queryOutput.append(this.loadingElement);

            // Clear context
            this.contextElements = [];
            this.entityContextList.innerHTML = "";

            this.updateContextStyle();

            console.log(this.contextSoFar);

            //const completion = await OpenAI.requestQuery(systemPrompt, this.contextSoFar, this.apiKey, this.model);
            const completion = await this.simulateResponse();

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

    addEntityContext(entityName: string, entity: RECORDING.IEntity, tag: string, frame: number)
    {
        const newContext: EntityContext = {
            type: ContextType.Entity,
            entity: entity,
            name: entityName,
            frame: frame,
            tag: tag,
        };
        
        const existing = this.contextElements.find((contextElem) => {
            if (contextElem.context.type == ContextType.Entity)
                return isEntityContextSame(contextElem.context, newContext)
            return false;
        });

        if (!existing)
        {
            const element = UI.createEntityContext(newContext, (context) => {
                this.deleteEntityContext(context);
            });
            this.contextElements.push({ context: newContext, element: element });

            this.entityContextList.append(element);

            this.updateContextStyle()
        }
    }

    deleteEntityContext(contextToDelete: EntityContext)
    {
        const existingIdx = this.contextElements.findIndex((contextElem) => {
            if (contextElem.context.type == ContextType.Entity)
                return isEntityContextSame(contextElem.context, contextToDelete)
            return false;
        });

        if (existingIdx != -1)
        {
            this.contextElements[existingIdx].element.remove();
            this.contextElements.splice(existingIdx, 1);
            this.updateContextStyle();
        }
    }

    addTimelineContext(frameFrom: number, frameTo: number, content: TimelineContextEntry[])
    {
        const newContext: TimelineContext = {
            type: ContextType.Timeline,
            frameFrom: frameFrom,
            frameTo: frameTo,
            content: content,
        };
        
        const existing = this.contextElements.find((contextElem) => {
            if (contextElem.context.type == ContextType.Timeline)
                return isTimelineContextSame(contextElem.context, newContext)
            return false;
        });

        if (!existing)
        {
            const element = UI.createTimelineContext(newContext, (context) => {
                this.deleteTimelineContext(context);
            });
            this.contextElements.push({ context: newContext, element: element });

            this.entityContextList.append(element);

            this.updateContextStyle();
        }
    }

    deleteTimelineContext(contextToDelete: TimelineContext)
    {
        const existingIdx = this.contextElements.findIndex((contextElem) => {
            if (contextElem.context.type == ContextType.Timeline)
                return isTimelineContextSame(contextElem.context, contextToDelete)
            return false;
        });

        if (existingIdx != -1)
        {
            this.contextElements[existingIdx].element.remove();
            this.contextElements.splice(existingIdx, 1);
            this.updateContextStyle();
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
      const visualMin = parseFloat(cs.minHeight) || 35;
      const contentMax = Math.max(0, visualMax - padding);
      const contentMin = Math.max(0, visualMin - padding);

      // scrollHeight includes padding; subtract padding to obtain content height
      const contentHeight = Math.max(this.queryInput.scrollHeight - padding + 11, contentMin);
      const finalHeight = Math.min(contentHeight, contentMax);

      this.queryInput.style.height = finalHeight + 'px';
    }

    private updateContextStyle()
    {
        DOMUtils.setClass(this.entityContextList, "has-children", this.entityContextList.children.length > 0);
    }
}