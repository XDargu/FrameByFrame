import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { Console, LogChannel, LogLevel } from "../frontend/ConsoleController";
import { createContextMenu, IContextMenuItem, removeContextMenu } from "../frontend/ContextMenu";
import { ResizeObserver } from 'resize-observer';
import { runInvestigationStep } from '../ai/investigation';

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

export interface EntitySelectedCallback
{
    (id: number, frame: number) : void
}

export interface FrameSelectedCallback
{
    (frame: number) : void
}

export interface PropertySelectionCallback
{
    (entityId: number, propertyId: number, frame: number) : void
}

export interface EventSelectionCallback
{
    (entityId: number, eventIdx: number, frame: number) : void
}

export interface AIQueryCallback
{
    () : void
}

export interface AddContextCallback
{
    () : void
}

export interface GetEntityContextData
{
    () : EntityContextCore
}

export interface GetTimelineContextData
{
    () : TimelineContextCore
}

export interface AICallbacks
{
    runQuery: AIQueryCallback;
    addEntityContext: AddContextCallback;
    addTimelineContext: AddContextCallback;
    getEntityContextData: GetEntityContextData;
    getTimelineContextData: GetTimelineContextData;
    onEntityClicked: EntitySelectedCallback;
    onFrameClicked: FrameSelectedCallback;
    onPropertyClicked: PropertySelectionCallback;
    onEventClicked: EventSelectionCallback;
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

interface EntityContextCore
{
    entity: RECORDING.IEntity;
    name: string;
    frame: number;
    tag: string;
}

interface EntityContext extends BaseContext, EntityContextCore
{
    type: ContextType.Entity;
}

function isEntityContextSame(a: EntityContextCore, b: EntityContextCore)
{
    return a.entity == b.entity && a.name == b.name && a.frame == b.frame && a.tag == b.tag;
}

export interface TimelineContextEntry
{
    frame: number;
    entityId: number;
    entityName: string;
    eventId: number;
    eventName: string;
}

interface TimelineContextCore
{
    frameFrom: number;
    frameTo: number;
}

interface TimelineContext extends BaseContext, TimelineContextCore
{
    content: TimelineContextEntry[];
    type: ContextType.Timeline;
}

function isTimelineContextSame(a: TimelineContextCore, b: TimelineContextCore)
{
    return a.frameFrom == b.frameFrom && a.frameTo == b.frameTo;
}

interface ContextElements
{
    context: EntityContext | TimelineContext;
    element: HTMLElement;
}

function isContextSame(a: ContextElements, b: ContextElements)
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
    private statsItem: HTMLElement;
    private callbacks: AICallbacks;
    
    private apiKey: string;
    private model: string;
    
    private contextSoFar: string;
    private loadingElement: HTMLElement;
    private waitingForResponse: boolean;

    private contextElements: ContextElements[] = [];

    private inputTokens: number = 0;
    private outputTokens: number = 0;
    private cachedTokens: number = 0;

    constructor(preMadeQueriesDropdown: HTMLElement, queryInput: HTMLTextAreaElement, queryOutput: HTMLElement, 
        requestQueryBtn: HTMLElement, newChatBtn: HTMLElement,
        addGlobalBtn: HTMLElement,
        entityContextList: HTMLElement,
        inputWrapper: HTMLElement,
        statsItem: HTMLElement,
        callbacks: AICallbacks,
    )
    {
        this.preMadeQueriesDropdown = preMadeQueriesDropdown;
        this.queryInput = queryInput;
        this.queryOutput = queryOutput;
        this.requestQueryBtn = requestQueryBtn;
        this.newChatBtn = newChatBtn;
        
        this.addGlobalBtn = addGlobalBtn;

        this.inputWrapper = inputWrapper;
        this.entityContextList = entityContextList;
        this.callbacks = callbacks;
        this.waitingForResponse = false;
        this.statsItem = statsItem;

        this.queryInput.addEventListener('input', () => { this.resizeInput(); });

        this.queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !this.waitingForResponse)
            {
                e.preventDefault();
                this.callbacks.runQuery();
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

        const createEventFilter = UI.createPremadeQueryEntry("Explain selection");
        createEventFilter.onclick = () => {
            this.clearContext();
            this.queryInput.value = "Explain briefly what the entity is doing on this frame.";
            this.callbacks.addEntityContext();
            this.resizeInput();
        };

        const createPropertyFilter = UI.createPremadeQueryEntry("Find bugs and anomalies");
        createPropertyFilter.onclick = () => {
            this.clearContext();
            this.queryInput.value = "Make a brief list of any possible bugs or anomalies.";
            this.callbacks.addEntityContext();
            this.resizeInput();
        };

        const explainTimeline = UI.createPremadeQueryEntry("Summary of timeline");
        explainTimeline.onclick = () => {
            this.clearContext();
            this.queryInput.value = "Make a table with the most relevant events of the timeline";
            this.callbacks.addTimelineContext();
            this.resizeInput();
        };

        const eventsOfEntity = UI.createPremadeQueryEntry("Important events of entity");
        eventsOfEntity.onclick = () => {
            this.clearContext();
            this.queryInput.value = "Find the most important events related to this entity";
            this.callbacks.addEntityContext();
            this.callbacks.addTimelineContext();
            this.resizeInput();
        };

        content.append(createEventFilter, createPropertyFilter, explainTimeline, eventsOfEntity);

        this.preMadeQueriesDropdown.onmouseenter = () => {
            const isNearBottom = window.innerHeight - this.preMadeQueriesDropdown.getBoundingClientRect().bottom < 70;
            DOMUtils.setClass(content, "bottom", isNearBottom);
        };
        
        this.requestQueryBtn.onclick = () => {
            if (!this.waitingForResponse)
                this.callbacks.runQuery();
        };

        this.newChatBtn.onclick = () => {
            this.clear();
        }

        this.addGlobalBtn.onclick = (ev) => {

            // Context menu for items
            let config: IContextMenuItem[] = [];

            const entityCtxData = this.callbacks.getEntityContextData();

            if (!entityCtxData)
                config.push({ text: "No entity selected", icon: "fa-user", callback: () => { }, enabled: () => { return false; } });
            else if (this.canAddEntityContext(entityCtxData))
                config.push({ text: "Add selected entity", icon: "fa-user", callback: () => { this.callbacks.addEntityContext(); } });
            else
                config.push({ text: "Entity already added", icon: "fa-user", callback: () => { }, enabled: () => { return false;} });
            
            const timelineCtxData = this.callbacks.getTimelineContextData();

            if (!timelineCtxData)
                config.push({ text: "No timeline selected", icon: "fa-clock", callback: () => { }, enabled: () => { return false;} });
            else if (this.canAddTimelineContext(this.callbacks.getTimelineContextData()))
                config.push({ text: "Add selected timeline", icon: "fa-clock", callback: () => { this.callbacks.addTimelineContext(); } });
            else
                config.push({ text: "Timeline already added", icon: "fa-clock", callback: () => { }, enabled: () => { return false;} });

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

    clearContext()
    {
        this.contextElements = [];
        this.entityContextList.innerHTML = "";
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

        this.clearContext();

        this.lockSending(false);
        this.updateContextStyle();

        this.inputTokens = 0;
        this.outputTokens = 0;
        this.cachedTokens = 0;
        this.statsItem.textContent = "";
        DOMUtils.setClass(this.statsItem, "hide-element", true);
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

    async analyse(currentFrame: number, entities: RECORDING.IFrameEntityData)
    {
        const request = UI.createRequest(this.queryInput.value);

        if (this.contextElements.length > 0)
        {
            request.prepend(UI.createRequestContext(this.contextElements));
        }

        DOMUtils.setClass(this.newChatBtn, "hide-element", false);
        DOMUtils.setClass(this.preMadeQueriesDropdown, "hide-element", true);

        this.queryOutput.append(request);


        this.queryInput.value = "";
        this.resizeInput();

        const loader = UI.createLoader();
        let responseLoading = document.createElement("div");
        responseLoading.append(loader, " Thinking...");
        this.loadingElement = responseLoading;
        this.queryOutput.append(this.loadingElement);

        responseLoading.scrollIntoView({behavior:'smooth', block:'end'});

        this.lockSending(true);

        try
        {
            let entityInfo = [];

            for (let entity in entities)
            {
                entityInfo.push({
                    name: RECORDING.NaiveRecordedData.getEntityName(entities[entity]),
                    id: entities[entity].id
                });
            }

            const state = {
                user_question: "this.queryInput.value",
                currentFrame: currentFrame,
                entitiesCurrentFrame: entityInfo
            }
            const resultQuery = await runInvestigationStep(this.apiKey, this.model, state);

            let response = document.createElement("div");
            response.innerHTML = JSON.stringify(resultQuery);
            this.queryOutput.append(response);

            response.scrollIntoView({behavior:'smooth', block:'start'});

            this.lockSending(false);
        }
        catch (error)
        {
            this.lockSending(false);
            this.queryOutput.append(UI.createResponse("Error: " + error.message));
            Console.log(LogLevel.Error, LogChannel.Files, "Error performing an AI query: " + error.message);
            if (this.loadingElement)
                this.loadingElement.remove();
        }
    }

    async analyseOldTest()
    {
        const request = UI.createRequest(this.queryInput.value);

        if (this.contextElements.length > 0)
        {
            request.prepend(UI.createRequestContext(this.contextElements));
        }

        DOMUtils.setClass(this.newChatBtn, "hide-element", false);
        DOMUtils.setClass(this.preMadeQueriesDropdown, "hide-element", true);

        this.queryOutput.append(request);

        const systemPrompt = 
`# Goals
You are an AI assistant helping finding insights of debugging data from a videogame.
You might receive entity data from the game in JSON format, containing nformation about one entity on one frame, on a videogame.
The entity will have properties that describe its current state on the frame, and events that happened on that frame.
You will also receive a request from a user regarding that data.
You will interact with the user in a chat form, giving answers, and the user asking follow-up questions, that might come with additional data.
Please answer in a comprehensive way, with bullet points, tables or diagramas if it helps with clarity, but keep it relatively short if possible.
# Needing more data
If you need more data to give an answer, ask the user to do so.
If the user hasn't provided any data ask for it, and do not mention JSON.
The user can provide entity data by clicking on the 'Add' icon next to the chat, and give entity or timeline context data.
# Style and format of the answer
Send the reply in HTML format, indicating headers, parragraphs, lists, etc.
All styles should be inlined, don't create style nodes.
The html content will be added to an existing page that has a dark mode.
Default text color should be #EEEEEE. Header color should be #bb86fc.
You can higlight important words or parts of the answer in bold with color #6DE080.
Don't alter the font size or family.

# Sources for data with context
When you refer to data from the recording, give sources whenever possible. To do so, you need to source data using a special syntax.
Sources are vital for users, they need to know where the information comes from.
Always give sources when you refer to data, if possible.
IMPORTANT: Use as many sources as possible.

## Entities
Never reference or mention entities only by name or id. Do not ever do it.
Every single time in your response you refer to any entity, always use the special syntax. You must add a source to be helpful.
The syntax for entities is: $[id: entityId, frame: frameNumber, name: entityName].
- entityId: entityId of the entity
- frameNumber: must correspond to the most relevant frame for the entity. Ensure there is always a frame, try to get it from context.
- name: name of the entity.

## Frames
During your answer, you might refer to frames in the recording.
Every single time you refer to a frame, always use the special syntax.
Do not mention frames without using special syntax or giving a source.
The syntax for frames is : @[frame: frameNumber, text: displayText]
- frameNumber: frame number
- displayText: the text you want to display to the user
For example, instead of saying "During frame 5, multiple events happened" you must say "During @[frame: 5, text: frame 5], multiple events happened"
Another example: instead of saying "During frames 5, 6 and 8, multiple events happened" you must say "During frames @[frame: 5, text: 5], @[frame: 6, text: 6] and @[frame: 7, text: 7] multiple events happened"

## Properties and events
All properties and events (in JSON) have an associated id, represented by the "id" field on the json. Important: ignore the "idx" field!
That id is only unique within the frame. Events or properties from different frames might have the same id.

## Properties
For example, this is a property representing velocity with id 55. { "value":-10 "type":"number", "name":"velocity", "id":55 }
Every single time you refer to a property of an entity, always use the special syntax.
The syntax for properties is the following: $[id: entityId, propId: propertyId, frame: frameNumber, name: propertyName]
- entityId: entityId of the entity
- propertyId: propertyId, the "id" field in the JSON mentioned earlier.
- frameNumber: relevant frame number
- propertyName: name of the property, the "name" field in the JSON mentioned earlier
Example: if there is a velocity property id 55, in the frame 120, that belongs to an entity with ID 678, instead of saying "the velocity was -10" you must say "the $[id: 678, propId: 55, frame: 120, name: velocity] was -10".

## Events
This is an event with id 6: { "id":6, "name":"Finished", "tag":"Query", "properties":{} }
Every single time you refer to an event of an entity, always use the special syntax.
The syntax for events is the following: $[id: entityId, eventId: eventId, frame: frameNumber, name: eventName]
- entityId: entityId of the entity
- eventId: eventId, the "id" field in the JSON mentioned earlier.
- frameNumber: frame number that correspond to the most relevant frame for the entity.
- eventName: name of the event, the "name" field in the JSON mentioned earlier
Example: if there is an event of id 853, in the frame 23, that belongs to an entity with ID 50, instead of saying "the Finished event happened...", you must say "the $[id: 50, eventId: 853, frame: 23, name: Finished] even happened...".

## Conclusions on usage of sources
The more sources you give, the more helpful your are to the user. Use it as much as possible. Use it every single time you can.
If you can't use it because you are missing one of the fields, then leave it out, and write normally.
Ensure you use the rigth syntax for each type of source. Do not mix them up.
When using the special syntax, always use the full syntax, don't leave fields out. Don't create incomplete special syntax.
Never use it to represent multiple events or properties as one.
Never do this: $[id: 1025, eventId: 7,8, frame: 8 and 10] This is incorrect, too many events ids, too many frames and it doesn't follow the format.
Never do this: $[id: 1025, propId: 3,4,8,12] This is also incorrect, there is more than one propId, and it's missing fields.
Never do this: $[id: 43012, propId: 52, frame: 3] This is also incorrect, the name is missing.
Before sending each answer, make sure all special syntax is correct, and carefully consider every use of it.
`;

        this.contextSoFar += "User question: " + this.queryInput.value + "\n";

        this.queryInput.value = "";
        this.resizeInput();

        const loader = UI.createLoader();
        let responseLoading = document.createElement("div");
        responseLoading.append(loader, " Thinking...");
        this.loadingElement = responseLoading;
        this.queryOutput.append(this.loadingElement);

        responseLoading.scrollIntoView({behavior:'smooth', block:'end'});

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

            this.contextSoFar += "Note from system: Remember to keep using the correct special syntax.\n";

            this.clearContext();

            this.updateContextStyle();

            console.log(this.contextSoFar);

            const completion = await OpenAI.requestQuery(systemPrompt, this.contextSoFar, this.apiKey, this.model);
            //const completion = await this.simulateResponse();

            this.inputTokens += completion.usage.prompt_tokens;
            this.outputTokens += completion.usage.completion_tokens;
            this.cachedTokens = completion.usage.prompt_tokens_details.cached_tokens;
            
            //const estimatedCost = (this.inputTokens * 0.4 / 1000000) + (this.cachedTokens * 0.1 / 1000000) + (this.outputTokens * 1.6 / 1000000);
            //this.statsItem.innerText = `Input tokens: ${this.inputTokens}\nOutput tokens: ${this.outputTokens}\nCached tokens: ${this.cachedTokens}\nEstimated cost: $${estimatedCost}`;
            //DOMUtils.setClass(this.statsItem, "hide-element", false);

            const result = completion.choices[0].message.content;

            const entityRefRegex = /\$\[id:\s*(\d+),\s*frame:\s*(\d+)\,\s*name:\s*([^\],]+)]/g;

            const resultWithEntities = result.replace(entityRefRegex, (match, id, frame, name) => {
                return `<span class="ai-entity-ref" data-id="${id}" data-frame="${frame}" data-name="${name}"><i class="fas fa-user"></i>${name}</span>`;
            });

            const frameRefRegex = /[@$]\[frame:\s*(\d+)\,\s*text:\s*([^\],]+)]/g;
            
            const resultWithFrames = resultWithEntities.replace(frameRefRegex, (match, frame, text) => {
                return `<span class="ai-frame-ref" data-frame="${frame}"><i class="fas fa-clock"></i>${text}</span>`;
            });

            const frameSimpleRefRegex = /[@$]\[frame:\s*(\d+)\]/g; // Make it work also with $, sometimes results use it
            
            const resultWithFramesSimple = resultWithFrames.replace(frameSimpleRefRegex, (match, frame) => {
                return `<span class="ai-frame-ref" data-frame="${frame}"><i class="fas fa-clock"></i>${frame}</span>`;
            });

            const propertyRefRegex = /\$\[id:\s*(\d+),\s*propId:\s*(\d+),\s*frame:\s*(\d+)\,\s*name:\s*([^\],]+)]/g;
            
            const resultWithProperties = resultWithFramesSimple.replace(propertyRefRegex, (match, eid, propId, frame, name) => {
                return `<span class="ai-property-ref" data-eid="${eid}" data-id="${propId}" data-frame="${frame}" data-name="${name}"><i class="fas fa-tag"></i>${name}</span>`;
            });

            const eventRefRegex = /\$\[id:\s*(\d+),\s*eventId:\s*(\d+),\s*frame:\s*(\d+)\,\s*name:\s*([^\],]+)]/g;
            
            const resultWithEvents = resultWithProperties.replace(eventRefRegex, (match, eid, eventId, frame, name) => {
                return `<span class="ai-event-ref" data-eid="${eid}" data-id="${eventId}" data-frame="${frame}" data-name="${name}"><i class="fas fa-bolt"></i>${name}</span>`;
            });
            
            console.log(completion);

            if (this.loadingElement)
                this.loadingElement.remove();

            let response = document.createElement("div");
            response.innerHTML = resultWithEvents;
            this.queryOutput.append(response);

            response.querySelectorAll("span.ai-entity-ref").forEach(elem => {
                const span = elem as HTMLSpanElement;
                const id = span.dataset.id;
                const frame = span.dataset.frame;
                const name = span.dataset.name;

                span.title = `${name} in frame ${frame} (${id})`;

                span.onclick = () => {
                    this.callbacks.onEntityClicked(parseInt(id), parseInt(frame));
                }
            });
            
            response.querySelectorAll("span.ai-frame-ref").forEach(elem => {
                const span = elem as HTMLSpanElement;
                const frame = span.dataset.frame;

                span.onclick = () => {
                    this.callbacks.onFrameClicked(parseInt(frame));
                }
            });

            response.querySelectorAll("span.ai-property-ref").forEach(elem => {
                const span = elem as HTMLSpanElement;
                const eid = span.dataset.eid;
                const id = span.dataset.id;
                const frame = span.dataset.frame;
                const name = span.dataset.name;

                span.title = `${name} in frame ${frame} (${id})`;

                span.onclick = () => {
                    this.callbacks.onPropertyClicked(parseInt(eid), parseInt(id), parseInt(frame));
                }
            });

            response.querySelectorAll("span.ai-event-ref").forEach(elem => {
                const span = elem as HTMLSpanElement;
                const eid = span.dataset.eid;
                const id = span.dataset.id;
                const frame = span.dataset.frame;
                const name = span.dataset.name;

                span.title = `${name} in frame ${frame} (${id})`;

                span.onclick = () => {
                    this.callbacks.onEventClicked(parseInt(eid), parseInt(id), parseInt(frame));
                }
            });

            this.contextSoFar += "Your answer: " + result + "\n";

            response.scrollIntoView({behavior:'smooth', block:'start'});

            this.lockSending(false);
        }
        catch (error)
        {
            this.lockSending(false);
            this.queryOutput.append(UI.createResponse("Error: " + error.message));
            Console.log(LogLevel.Error, LogChannel.Files, "Error performing an AI query: " + error.message);
            if (this.loadingElement)
                this.loadingElement.remove();
        }
    }

    canAddEntityContext(context: EntityContextCore)
    {
        const existing = this.contextElements.find((contextElem) => {
            if (contextElem.context.type == ContextType.Entity)
                return isEntityContextSame(contextElem.context, context)
            return false;
        });

        return !existing;
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

        if (this.canAddEntityContext(newContext))
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

    canAddTimelineContext(context: TimelineContextCore)
    {
        const existing = this.contextElements.find((contextElem) => {
            if (contextElem.context.type == ContextType.Timeline)
                return isTimelineContextSame(contextElem.context, context)
            return false;
        });

        return !existing;
    }

    addTimelineContext(frameFrom: number, frameTo: number, content: TimelineContextEntry[])
    {
        const newContext: TimelineContext = {
            type: ContextType.Timeline,
            frameFrom: frameFrom,
            frameTo: frameTo,
            content: content,
        };

        if (this.canAddTimelineContext(newContext))
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