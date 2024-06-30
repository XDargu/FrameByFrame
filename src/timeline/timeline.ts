import { ResizeObserver } from 'resize-observer';
import * as Utils from '../utils/utils';

export type TimelineEventId = number;
export type TimelineEventTypeId = number;

interface ITimelineFrameClickedCallback {
	(frame: number) : void;
}

interface ITimelineUpdatedCallback {
	(secondsPassed: number) : void;
}

interface IEventClickedCallback {
	(entityId: string, frame: number) : void;
}

interface IRangeChangedCallback {
	(initRange: number, endRange: number) : void;
}

export interface IGetEntityName
{
    (entityId: string, frameIdx: number) : string
}

export interface ITimelineEvent {
    entityId: string;
    typeId: TimelineEventTypeId;
    id: TimelineEventId;
    frame: number;
    color: Utils.RGBColor;
    label: string;
}

export interface ITimelineMarker {
    name: string,
    frame: number,
    color: string;
}

type TEventsPerFrame = Map<number, ITimelineEvent[]>;

enum InputOperation
{
    None,
    MovingTimeline,
    MovingLeftRange,
    MovingRightRange,
    PressingTimeline
}

export function findEventOfEntityId(eventList: ITimelineEvent[], entityId: string)
{
    for (let i=0; i<eventList.length; ++i)
    {
        if (eventList[i].entityId == entityId)
        {
            return eventList[i];
        }
    }
    return undefined;
}

function findEventOfColor(eventList: ITimelineEvent[], color: Utils.RGBColor)
{
    for (let i=0; i<eventList.length; ++i)
    {
        if (eventList[i].color.r == color.r && eventList[i].color.g == color.g && eventList[i].color.b == color.b)
        {
            return eventList[i];
        }
    }
    return undefined;
}

function findEventOfEntityIdAndColor(eventList: ITimelineEvent[], entityId: string, color: Utils.RGBColor)
{
    for (let i=0; i<eventList.length; ++i)
    {
        if (eventList[i].entityId == entityId && eventList[i].color.r == color.r && eventList[i].color.g == color.g && eventList[i].color.b == color.b)
        {
            return eventList[i];
        }
    }
    return undefined;
}

class EventPopup {

    private popup: HTMLElement;
    private hideTimeout: NodeJS.Timeout;
    private getEntityName: IGetEntityName;
    private isActive: boolean;

    constructor(popup: HTMLElement)
    {
        this.popup = popup;
        console.log(popup);
        this.hideTimeout = null;
    }

    showAtPosition(x: number, y: number, events: ITimelineEvent[], onEventClicked: IEventClickedCallback)
    {
        if (!this.isActive) { return; }

        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;

        Utils.setClass(this.popup, "hidden", false);

        this.popup.innerHTML = "";
        for (let i=0; i<events.length; ++i)
        {
            const event = events[i];
            let p = document.createElement("p");
            const name = this.getEntityName ? ` - ${this.getEntityName(event.entityId, event.frame)}` : "";
            p.textContent = event.label + name;
            p.onclick = () => {
                onEventClicked(event.entityId, event.frame);
            };
            this.popup.appendChild(p);
        }

        const clampedPos = Utils.clampElementToScreen(x, y, this.popup, -10, 10);

        this.popup.style.left = (clampedPos.x) + "px";
        this.popup.style.top = (clampedPos.y) + "px";
    }

    hide()
    {
        if (this.hideTimeout == null)
        {
            this.hideTimeout = setTimeout(() => {
                Utils.setClass(this.popup, "hidden", true);
            }, 200);
        }
    }

    setGetEntityNameCallback(callback: IGetEntityName)
    {
        this.getEntityName = callback;
    }

    setActive(isActive: boolean)
    {
        this.isActive = isActive;
        if (!isActive)
        {
            this.hide();
        }
    }
}

interface TimelineRange
{
    initFrame: number;
    endFrame: number;
}

export class TimelineData {

    // Timeline information
    currentFrame : number;
    length : number;
    range: TimelineRange;

    // Selection
    selectedEntityId: number;

    events: TimelineEvents;
    markers: TimelineMarkers;

    constructor() {
        this.events = new TimelineEvents();
        this.markers = new TimelineMarkers();
        this.range = { initFrame: 0, endFrame: 0 };

        this.selectedEntityId = -1;
        this.currentFrame = 0;
        this.length = 0;
    }

    clear() {
        this.length = 0;
        this.currentFrame = 0;
        this.selectedEntityId = -1;
        this.range = { initFrame: 0, endFrame: 0 };
        this.events.clear();
        this.markers.clear();
    }
}

interface IEventsPerFrameVisitor {
	(events: ITimelineEvent[], frame: number) : void;
}

class TimelineEvents {

    constructor() {
        this.events = new Map<number, ITimelineEvent>();
        this.eventsPerFrame = new Map<number, ITimelineEvent[]>();
        this.eventColors = [];
    }

    // Events
    private events : Map<TimelineEventId, ITimelineEvent>
    private eventsPerFrame : TEventsPerFrame;
    private eventColors: string[];

    addEvent(id: TimelineEventId, entityId: string, frame : number, color : string, label: string, type: TimelineEventTypeId)
    {
        const event: ITimelineEvent = {id: id, entityId: entityId, frame: frame, color: Utils.hexToRgb(color), typeId: type, label: label};
        this.events.set(id, event);

        let events = this.eventsPerFrame.get(frame);
        if (events != undefined)
        {
            events.push(event);
        }
        else
        {
            this.eventsPerFrame.set(frame, [event]);
        }

        Utils.pushUnique(this.eventColors, color);
    }

    getEventColorAmount() : number { return this.eventColors.length; }
    getEventColorByIndex(index: number) : string { return this.eventColors[index]; }

    visitEventsPerFrame(visitor: IEventsPerFrameVisitor)
    {
        this.eventsPerFrame.forEach(visitor);
    }

    getEvent(id: TimelineEventId) : ITimelineEvent
    {
        return this.events.get(id);
    }

    getEventsInFrame(frame: number) : ITimelineEvent[]
    {
        return this.eventsPerFrame.get(frame);
    }

    clear()
    {
        this.events.clear();
        this.eventsPerFrame.clear();
        this.eventColors.length = 0;
    }
}

class TimelineMarkers {

    constructor() {
        this.markers = [];
    }

    // Markers
    private markers: ITimelineMarker[];

    addMarker(name: string, frame: number, color: string)
    {
        this.markers.push({ name: name, frame: frame, color: color });
    }

    clear()
    {
        this.markers.length = 0;
    }

    getMarkerAmount() : number
    {
        return this.markers.length;
    }

    getMarkerByIndex(index: number) : ITimelineMarker
    {
        return this.markers[index];
    }
}

class TimelineInputHandler {

    // Canvas
    canvas: HTMLCanvasElement;

    // Input control
    private inputOperation: InputOperation;

    // Data
    private data: TimelineData;

    // Rendering info
    renderer: TimelineRenderer;
    popup: EventPopup; // TODO: Move this out of this class

    // Callbacks
    onframeClicked : ITimelineFrameClickedCallback;
    onEventClicked: IEventClickedCallback;
    onRangeChanged: IRangeChangedCallback;

    constructor(canvas: HTMLCanvasElement, renderer: TimelineRenderer, data: TimelineData, popup: EventPopup) {

        canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        canvas.addEventListener("wheel", this.onMouseWheel.bind(this));
        canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        canvas.addEventListener("contextmenu", this.disableEvent);
        canvas.addEventListener('selectstart', this.disableEvent);

        this.canvas = canvas;
        this.data = data;
        this.renderer = renderer;
        this.popup = popup;

        this.inputOperation = InputOperation.None;
    }

    clear()
    {
        this.inputOperation = InputOperation.None;
    }

    private onMouseUp(event : MouseEvent)
    {
        this.inputOperation = InputOperation.None;
    }

    private onMouseMove(event : MouseEvent)
    {
        if (this.data.length == 0) { return; }
        this.renderer.hoveredEvent = this.renderer.findEventAtPosition(event.offsetX, event.offsetY);
        this.renderer.hoveredLeftRange = this.renderer.isInRange(event.offsetX, event.offsetY, true);
        this.renderer.hoveredRightRange = this.renderer.isInRange(event.offsetX, event.offsetY, false);

        const canvasPosition : number = event.offsetX;
        let targetFrame = null;

        switch(this.inputOperation)
        {
            case InputOperation.MovingTimeline:
                this.renderer.translate(-event.movementX);
                break;
            case InputOperation.MovingRightRange:
                {
                    const prevEndFrame = this.data.range.endFrame;
                    const targetEndFrame = Math.round(this.renderer.canvas2frame(canvasPosition));
                    // Prevent overlapping
                    this.data.range.endFrame = Utils.clamp(targetEndFrame, this.data.range.initFrame + 1, this.data.length - 1);

                    this.renderer.hoveredRightRange = true;
                    if (this.data.currentFrame <= prevEndFrame && this.data.currentFrame > this.data.range.endFrame)
                    {
                        targetFrame = this.data.range.endFrame;
                    }
                    if (this.onRangeChanged)
                    {
                        this.onRangeChanged(this.data.range.initFrame, this.data.range.endFrame);
                    }
                    break;
                }
            case InputOperation.MovingLeftRange:
                {
                    const prevInitFrame = this.data.range.initFrame;
                    const targetInitFrame = Math.round(this.renderer.canvas2frame(canvasPosition));
                    // Prevent overlapping
                    this.data.range.initFrame = Utils.clamp(targetInitFrame, 0, this.data.range.endFrame - 1);
                    this.renderer.hoveredLeftRange = true;

                    if (this.data.currentFrame >= prevInitFrame && this.data.currentFrame < this.data.range.initFrame)
                    {
                        targetFrame = this.data.range.initFrame;
                    }
                    if (this.onRangeChanged)
                    {
                        this.onRangeChanged(this.data.range.initFrame, this.data.range.endFrame);
                    }
                    break;
                }
            case InputOperation.PressingTimeline:
                targetFrame = Math.round(this.renderer.canvas2frame(canvasPosition)); // Mutating data
                break;
        }

        if (targetFrame != null)
        {
            this.data.currentFrame = targetFrame;
            if (this.onframeClicked)
            {
                this.onframeClicked(this.data.currentFrame);
            }
        }

        const shouldDisplayPointer = this.renderer.hoveredEvent || this.renderer.hoveredLeftRange || this.renderer.hoveredRightRange;
        this.canvas.style.cursor = shouldDisplayPointer ? "pointer" : "auto";

        const shouldDisplayPopup = this.renderer.hoveredEvent && this.inputOperation != InputOperation.MovingTimeline;
        if (shouldDisplayPopup)
        {
            const events = this.data.events.getEventsInFrame(this.renderer.hoveredEvent.frame);

            const pageY = this.canvas.offsetTop + TimelineRenderer.eventHeight;
            this.popup.showAtPosition(event.pageX, pageY, events, this.onEventClicked);
        }
        else
        {
            this.popup.hide();
        }
    }

    private onMouseWheel(event : any)
    {
        this.renderer.zoomInPosition(event.offsetX, event.deltaY);
    }

    private onMouseLeave(event : MouseEvent)
    {
        this.inputOperation = InputOperation.None;
        this.popup.hide();
    }

    private onMouseDown(event : MouseEvent)
    {
        if (this.data.length == 0) { return; }

        this.renderer.hoveredEvent = this.renderer.findEventAtPosition(event.offsetX, event.offsetY);
        this.renderer.hoveredLeftRange = this.renderer.isInRange(event.offsetX, event.offsetY, true);
        this.renderer.hoveredRightRange = this.renderer.isInRange(event.offsetX, event.offsetY, false);
        const canvasPosition : number = event.offsetX;

        if (event.shiftKey && event.button == 0)
        {
            // Set initial values
            const targetInitFrame = Math.round(this.renderer.canvas2frame(canvasPosition));
            const targetEndFrame = Math.round(this.renderer.canvas2frame(canvasPosition));

            // Prevent overlapping
            this.data.range.initFrame = Utils.clamp(targetInitFrame, 0, this.data.length - 1);
            this.data.range.endFrame = Utils.clamp(targetEndFrame, this.data.range.initFrame + 1, this.data.length - 1);

            this.inputOperation = InputOperation.MovingRightRange;
        }
        else if (event.button == 2)
        {
            this.inputOperation = InputOperation.MovingTimeline;
        }
        else if (event.button == 0)
        {
            const canvasPosition : number = event.offsetX;

            if (this.renderer.hoveredLeftRange)
            {
                this.inputOperation = InputOperation.MovingLeftRange;
            }
            else if (this.renderer.hoveredRightRange)
            {
                this.inputOperation = InputOperation.MovingRightRange;
            }
            else
            {
                this.inputOperation = InputOperation.PressingTimeline;

                this.data.currentFrame = Math.round(this.renderer.canvas2frame(canvasPosition)); // Mutating data

                if (this.renderer.hoveredEvent && this.onEventClicked)
                {
                    this.onEventClicked(this.renderer.hoveredEvent.entityId, this.renderer.hoveredEvent.frame);
                }
                else if (this.onframeClicked)
                {
                    this.onframeClicked(this.data.currentFrame);
                }
            }
        }
    }

    private disableEvent(event : any) {
        event.preventDefault();
    }
}

class TimelineRenderer {
    // Constants
    static readonly headerHeight : number = 16;
    static readonly smallMarkerHeight : number = 3;
    static readonly markerHeight : number = 5;
    static readonly markerTriangleSize : number = 3;
    static readonly textHeight : number = 2;
    static readonly frameGroupMinSize : number = 200;
    static readonly eventHeight : number = 33;
    static readonly eventRadius : number = 4;
    
    static readonly headerColor: Utils.RGBColor = Utils.hexToRgb("#574D5F");
    static readonly bodyColor: Utils.RGBColor = Utils.hexToRgb("#473D4F");

    // Canvas information
    canvas : HTMLCanvasElement;
    ctx : CanvasRenderingContext2D;
    height : number;
    width : number;
    ratio : number;

    // Camera control
    private zoom : number;
    private translation : number;

    // Cached information for rendering
    private frameSize : number;
    private totalSize : number;

    // Event
    hoveredEvent: ITimelineEvent;
    hoveredLeftRange: boolean;
    hoveredRightRange: boolean;

    // Time control
    private timeStampLastUpdate: number;

    // Data
    private data: TimelineData;

    // Callbacks
    ontimelineUpdated : ITimelineUpdatedCallback;

    constructor(data: TimelineData, canvas: HTMLCanvasElement, wrapper: HTMLElement)
    {
        this.data = data;
        this.timeStampLastUpdate = 0;

        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        window.requestAnimationFrame(this.render.bind(this));
        this.ratio = window.devicePixelRatio;

        this.width = this.canvas.width / this.ratio;
        this.height = this.canvas.height / this.ratio;

        this.hoveredLeftRange = false;
        this.hoveredRightRange = false;

        this.zoom = 1;
        this.translation = 0;

        var resizeObserver = new ResizeObserver(entries => {
            canvas.width = entries[0].contentRect.width * this.ratio;
            canvas.height = entries[0].contentRect.height * this.ratio;
            //canvas.style.left = entries[0].target.offsetLeft + "px";
            this.onResize();
        });
        resizeObserver.observe(wrapper);
    }

    render(timeStamp : number)
    {
        if (this.timeStampLastUpdate != timeStamp)
        {
            const secondsPassed : number = (timeStamp - this.timeStampLastUpdate) / 1000;
            this.timeStampLastUpdate = timeStamp;

            if (this.ontimelineUpdated)
            {
                this.ontimelineUpdated(secondsPassed);
            }
        }

        this.ctx.fillStyle = "#473D4F";
        this.ctx.fillRect(0,0,this.width,this.height);

        this.renderHeader();

        if (this.data.length != 0)
        {
            this.renderCustomMarkers();
            this.renderEvents(false, 0.3);
            this.renderEvents(true, 1);
            this.renderRangeMarker(this.data.range.initFrame, true);
            this.renderRangeMarker(this.data.range.endFrame, false);
            this.renderRangeOverlay();
            this.renderMarker();
        }

        window.requestAnimationFrame(this.render.bind(this));
    }

    private renderHeader()
    {
        this.ctx.fillStyle = "#574D5F";
        this.ctx.fillRect(0, 0, this.width, TimelineRenderer.headerHeight);

        const firstFrameOnCanvas : number = Math.floor(this.getMinFrameOnCanvas());
        const lastFrameOnCanvas : number = Math.ceil(this.getMaxFrameOnCanvas());

        // Numbers and marks
        // Numbers will be collapsed if they are below a certain threshold
        const frameStep : number = Math.max(1, Math.pow(10, Math.floor(TimelineRenderer.frameGroupMinSize / this.frameSize).toString().length - 1));
        const smallStep : number = Math.max(1, frameStep / 10);

        this.ctx.textAlign = "center";
        this.ctx.font = "8px Arial";
        this.ctx.fillStyle = "#C4C4C4";
        this.ctx.textBaseline = "top";

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "#C4C4C4";

        this.ctx.beginPath();

        // Adjust the first and last frame to the smallstep
        const firstFrame : number = Math.max(0, firstFrameOnCanvas - firstFrameOnCanvas % smallStep - 1);
        const lastFrame : number = Math.min(this.data.length, lastFrameOnCanvas + smallStep - (lastFrameOnCanvas % smallStep));

        let i : number = firstFrame;
        for (; i < lastFrame; )
        {
            const position : number = this.frame2canvas(i);
            const baseOneFrame = i + 1;

            const isFirstFrame = (i == 0);
            const isLastFrame = (i == lastFrame - 1);
            const isMiddleStep = (baseOneFrame % frameStep == 0);

            if (isFirstFrame || isMiddleStep || isLastFrame)
            {
                const frameNumber = baseOneFrame.toString();

                this.ctx.moveTo(position, TimelineRenderer.headerHeight);
                this.ctx.lineTo(position, TimelineRenderer.headerHeight - TimelineRenderer.markerHeight);

                let offset = 0;
                if (isFirstFrame)
                {
                    offset = this.ctx.measureText(frameNumber).width;
                }
                else if (isLastFrame)
                {
                    offset = -this.ctx.measureText(frameNumber).width * 0.6;
                }

                this.ctx.fillText(frameNumber, position + offset, TimelineRenderer.textHeight);
            }
            else
            {
                this.ctx.moveTo(position, TimelineRenderer.headerHeight);
                this.ctx.lineTo(position, TimelineRenderer.headerHeight - TimelineRenderer.smallMarkerHeight);
            }

            if (i == 0)
                i+= Math.max(1, smallStep - 1);
            else
                i+= smallStep
        }

        this.ctx.stroke();
        this.ctx.closePath();
    }

    private drawLeftHalf(position: number) { 
        this.ctx.arc(position, TimelineRenderer.eventHeight, TimelineRenderer.eventRadius, Math.PI * 0.5, Math.PI * 1.5);
    };
    private drawRightHalf(position: number) { 
        this.ctx.arc(position, TimelineRenderer.eventHeight, TimelineRenderer.eventRadius, Math.PI * -0.5, Math.PI * 0.5);
    };
    private drawCircle(position: number) { 
        this.ctx.arc(position, TimelineRenderer.eventHeight, TimelineRenderer.eventRadius, 0, Math.PI * 2);
    };

    private renderEvents(selectedOnly: boolean, opacity: number)
    {
        const firstFrame : number = Math.floor(this.getMinFrameOnCanvas());
        const lastFrame : number = Math.ceil(this.getMaxFrameOnCanvas());

        const selectionAsString = this.data.selectedEntityId.toString();

        if (this.frameSize > TimelineRenderer.eventRadius * 2)
        {
            this.data.events.visitEventsPerFrame((eventList, frame) => {
                const event = selectedOnly ? findEventOfEntityId(eventList, selectionAsString) : eventList[0];
                if (event)
                {
                    if (frame >= firstFrame && frame <= lastFrame)
                    {
                        const position : number = this.frame2canvas(event.frame);

                        const blend = Utils.blend(TimelineRenderer.bodyColor, event.color, opacity);
                        this.ctx.fillStyle = Utils.rgbToHex(blend);
                        this.ctx.beginPath();
                        this.drawCircle(position);
                        this.ctx.fill();

                        if (selectedOnly)
                        {
                            this.ctx.strokeStyle = "#FFFFFF";
                            this.ctx.lineWidth = 1;
                            this.ctx.stroke();
                        }
                    }
                }
            });
        }
        else
        {
            // TODO: Improve performance of this
            for (let colIdx=0; colIdx<this.data.events.getEventColorAmount(); ++colIdx)
            {
                const color = this.data.events.getEventColorByIndex(colIdx);
                const rgbColor = Utils.hexToRgb(color);
                const blend = Utils.blend(TimelineRenderer.bodyColor, rgbColor, opacity);

                let i : number = firstFrame;
                for (; i < lastFrame; )
                {
                    const eventList = this.data.events.getEventsInFrame(i);
                    if (eventList)
                    {
                        const event = selectedOnly ? findEventOfEntityIdAndColor(eventList, selectionAsString, rgbColor) : findEventOfColor(eventList, rgbColor);
                        if (event)
                        {
                            const position : number = this.frame2canvas(i);

                            const nextFrameEvents = this.data.events.getEventsInFrame(i + 1);
                            const prevFrameEvents = this.data.events.getEventsInFrame(i - 1);
                            const hasNextFrameEvent = selectedOnly ? 
                                nextFrameEvents && findEventOfEntityIdAndColor(nextFrameEvents, selectionAsString, rgbColor) != undefined :
                                nextFrameEvents && findEventOfColor(nextFrameEvents, rgbColor) != undefined;
                            const hasPrevFrameEvent = selectedOnly ? 
                            prevFrameEvents && findEventOfEntityIdAndColor(prevFrameEvents, selectionAsString, rgbColor) != undefined :
                                prevFrameEvents && findEventOfColor(prevFrameEvents, rgbColor) != undefined;

                            this.ctx.fillStyle = Utils.rgbToHex(blend);
                            this.ctx.beginPath();

                            if (!hasNextFrameEvent && !hasPrevFrameEvent)
                            {
                                this.drawCircle(position);
                                i++;
                            }
                            else
                            {
                                i++;
                                let j = i + 1;
                                while (j < lastFrame)
                                {
                                    const peekEventList = this.data.events.getEventsInFrame(j);
                                    if (peekEventList)
                                    {
                                        const peekEvent = selectedOnly ? findEventOfEntityIdAndColor(peekEventList, selectionAsString, rgbColor) : findEventOfColor(peekEventList, rgbColor);
                                        if (peekEvent) {
                                            j++
                                        }
                                        else
                                        {
                                            break;
                                        }
                                    }
                                    else
                                    {
                                        break;
                                    }
                                }

                                const lastPosition : number = this.frame2canvas(j - 1);

                                this.drawLeftHalf(position);
                                this.ctx.lineTo(lastPosition, TimelineRenderer.eventHeight - TimelineRenderer.eventRadius);
                                this.drawRightHalf(lastPosition);
                                this.ctx.lineTo(position, TimelineRenderer.eventHeight + TimelineRenderer.eventRadius);
                                i = j;
                            }

                            this.ctx.fill();
                            if (selectedOnly)
                            {
                                this.ctx.strokeStyle = "#FFFFFF";
                                this.ctx.lineWidth = 1;
                                this.ctx.stroke();
                            }
                        }
                    }

                    i++;
                }
            }
        }

        if (this.hoveredEvent)
        {
            const position : number = this.frame2canvas(this.hoveredEvent.frame);
            const lighten = Utils.blend(this.hoveredEvent.color, {r: 255, g: 255, b: 255}, 0.5);

            this.ctx.strokeStyle = "#6DE080";
            this.ctx.fillStyle = Utils.rgbToHex(lighten);

            this.ctx.beginPath();
            this.ctx.lineWidth = 2;
            this.drawCircle(position);
            this.ctx.stroke();
            this.ctx.fill();
        }
    }

    private renderRangeMarker(frame: number, rightOriented: boolean)
    {
        const position : number = this.frame2canvas(frame);
        const offset = rightOriented ? TimelineRenderer.headerHeight : -TimelineRenderer.headerHeight;
        const isHovering = this.hoveredLeftRange && rightOriented || this.hoveredRightRange && !rightOriented;

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = isHovering ? "#6DE080" : "#D6A3FF";
        this.ctx.fillStyle = isHovering ? "#6DE080" : "#D6A3FF";

        // Triangle at the bottom
        this.ctx.beginPath();
        this.ctx.moveTo(position, this.height);
        this.ctx.lineTo(position + offset, this.height);
        this.ctx.lineTo(position, this.height - TimelineRenderer.headerHeight);
        this.ctx.fill();

        // Line
        this.ctx.beginPath();
        this.ctx.moveTo(position, 0);
        this.ctx.lineTo(position, this.height);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    private renderRangeOverlay()
    {
        const init : number = this.frame2canvas(this.data.range.initFrame);
        const end : number = this.frame2canvas(this.data.range.endFrame);

        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0,0,init,this.height);
        this.ctx.fillRect(end,0,this.width,this.height);
        this.ctx.globalAlpha = 1;
    }

    private renderMarker()
    {
        const position : number = this.frame2canvas(this.data.currentFrame);

        const eventLength = this.data.events.getEventsInFrame(this.data.currentFrame)?.length || 0;
        const eventLabel = eventLength == 1 ? "event" : "events";
        const eventText = eventLength == 0 ? "" : ` (${eventLength} ${eventLabel})`;
        const markerText = `${this.data.currentFrame + 1}${eventText}`;
        const frameTextWidth = this.ctx.measureText(markerText).width;
        const textPadding = 4;
        const rectPadding = 1;
        const rectHeight = TimelineRenderer.headerHeight - rectPadding * 2;
        const rectWidth = frameTextWidth + textPadding * 2;
        const rectInvert = (rectWidth + position < this.width) ? 1  : -1;

        // Rectangle with frame
        this.ctx.fillStyle = "#2B2530";
        this.ctx.fillRect(position, rectPadding, rectWidth * rectInvert, rectHeight);

        this.ctx.textAlign = "center";
        this.ctx.font = "8px Arial";
        this.ctx.fillStyle = "#C4C4C4";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(markerText, position + rectWidth * 0.5 * rectInvert, rectPadding + rectHeight * 0.5);

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "#6DE080";
        this.ctx.fillStyle = "#6DE080";

        // Triangle on top
        this.ctx.beginPath();
        this.ctx.moveTo(position - TimelineRenderer.markerTriangleSize, 0);
        this.ctx.lineTo(position + TimelineRenderer.markerTriangleSize, 0);
        this.ctx.lineTo(position, + TimelineRenderer.markerTriangleSize * 2);
        this.ctx.fill();


        // Line
        this.ctx.beginPath();
        this.ctx.moveTo(position, 0);
        this.ctx.lineTo(position, this.height);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    private renderCustomMarkers()
    {
        this.ctx.textAlign = "center";
        this.ctx.font = "10px Arial";
        this.ctx.textBaseline = "bottom";

        for (let i=0; i<this.data.markers.getMarkerAmount(); ++i)
        {
            const marker = this.data.markers.getMarkerByIndex(i);
            const position : number = this.frame2canvas(marker.frame);

            this.ctx.strokeStyle = marker.color;
            this.ctx.fillStyle = marker.color;

            this.ctx.beginPath();
            this.ctx.moveTo(position, 0);
            this.ctx.lineTo(position, this.height);
            this.ctx.stroke();
            this.ctx.closePath();

            const frameTextWidth = this.ctx.measureText(marker.name).width;
            const textPadding = 2;
            const rectWidth = frameTextWidth + textPadding * 2;
            const rectInvert = (rectWidth + position < this.width) ? 1  : -1;

            this.ctx.fillText(marker.name, position + rectWidth * 0.5 * rectInvert, this.height - textPadding);
        }
    }

    frame2canvas(frame : number) : number
    {
        return this.frameSize * frame - this.translation;
    }

    canvas2frame(canvasPosition : number) : number
    {
        return (canvasPosition + this.translation) / this.frameSize;
    }

    private isMouseHoveringEvent(event: ITimelineEvent, mouseX: number, mouseY: number)
    {
        const x = this.frame2canvas(event.frame);
        const y = TimelineRenderer.eventHeight;

        const distanceSq = (x - mouseX) * (x - mouseX) + (y - mouseY) * (y - mouseY);

        return distanceSq < TimelineRenderer.eventRadius * TimelineRenderer.eventRadius;
    }

    private findHoveredEventInFrame(frame: number, mouseX: number, mouseY: number, entityIdFilter: string = undefined) : ITimelineEvent
    {
        const eventList = this.data.events.getEventsInFrame(frame);
        if (eventList)
        {
            const firstEvent = eventList[0];
            if (firstEvent)
            {
                if (this.isMouseHoveringEvent(firstEvent, mouseX, mouseY))
                {
                    if (entityIdFilter != undefined)
                    {
                        return findEventOfEntityId(eventList, entityIdFilter);
                    }
                    else
                    {
                        return firstEvent;
                    }
                }
            }
        }

        return null;
    };

    private findHoveredEventAroundFrame(mouseX: number, mouseY: number, entityIdFilter: string = undefined) : ITimelineEvent
    {
        const frame = Math.round(this.canvas2frame(mouseX));

        const firstFrame = Math.round(this.canvas2frame(mouseX - TimelineRenderer.eventRadius));
        const lastFrame = Math.round(this.canvas2frame(mouseX + TimelineRenderer.eventRadius));

        // Check the current frame first
        const frameEvent = this.findHoveredEventInFrame(frame, mouseX, mouseY, entityIdFilter);
        if (frameEvent)
        {
            return frameEvent;
        }

        // Check frames around the event
        for (let i=firstFrame; i<lastFrame; ++i)
        {
            const frameEvent = this.findHoveredEventInFrame(i, mouseX, mouseY, entityIdFilter);
            if (frameEvent)
            {
                return frameEvent;
            }
        }

        return null;
    }

    findEventAtPosition(mouseX: number, mouseY: number) : ITimelineEvent
    {
        // Give priority to currently selected entity
        const selectedEntityEvent = this.findHoveredEventAroundFrame(mouseX, mouseY, this.data.selectedEntityId.toString());
        if (selectedEntityEvent)
        {
            return selectedEntityEvent;
        }

        return  this.findHoveredEventAroundFrame(mouseX, mouseY);
    }

    isPointInsideTriangle(
        pX: number, pY: number,
        aX: number, aY: number,
        bX: number, bY: number,
        cX: number, cY: number) : boolean
    {
        const as_x = pX - aX;
        const as_y = pY - aY;

        const s_ab = (bX - aX) * as_y - (bY - aY) * as_x > 0;

        if ((cX - aX) * as_y - (cY - aY) * as_x > 0 == s_ab) 
            return false;
        if ((cX - bX) * (pY - bY) - (cY - bY)*(pX - bX) > 0 != s_ab) 
            return false;
        return true;
    }

    isInRange(mouseX: number, mouseY: number, rightOriented: boolean) : boolean
    {
        const frame = rightOriented ? this.data.range.initFrame : this.data.range.endFrame;
        const offset = rightOriented ? TimelineRenderer.headerHeight : -TimelineRenderer.headerHeight;
        
        const position : number = this.frame2canvas(frame);

        return this.isPointInsideTriangle(
            mouseX, mouseY,
            position, this.height,
            position + offset, this.height,
            position, this.height - TimelineRenderer.headerHeight);
    }

    private getMinFrameOnCanvas()
    {
        return this.canvas2frame(0);
    }

    private getMaxFrameOnCanvas()
    {
        return this.canvas2frame(this.width);
    }

    calculateRenderingConstants()
    {
        this.totalSize = this.width * this.zoom;
        this.frameSize = this.totalSize / (this.data.length - 1);
    }

    onResize()
    {
        this.width = this.canvas.width / this.ratio;
        this.height = this.canvas.height / this.ratio;

        this.ctx.scale(this.ratio, this.ratio);

        this.canvas.style.width = this.width + "px";
        this.canvas.style.height = this.height + "px";

        this.calculateRenderingConstants();
    }

    translate(deltaTranslation: number)
    {
        this.translation = Math.min(Math.max(this.translation + deltaTranslation, 0), this.totalSize - this.width);
    }

    zoomInPosition(canvasPosition: number, amount: number)
    {
        const frame : number = this.canvas2frame(canvasPosition);
        const oldFrameSize : number = this.frameSize;

        const zoomRatio : number = 0.001 * this.frameSize;
        this.zoom = Math.min(Math.max(this.zoom - amount * zoomRatio, 1), 100);
        this.calculateRenderingConstants();

        const newFrameSize : number = this.frameSize;
        const deltaTranslation : number = frame * (newFrameSize - oldFrameSize);

        this.translate(deltaTranslation)
    }

    updateTranslation()
    {
        if (this.data.currentFrame > this.getMaxFrameOnCanvas())
        {
            const canvasDist = this.frame2canvas(this.data.currentFrame) - this.width;
            this.translation = this.translation + canvasDist;
        }
        if (this.data.currentFrame < this.getMinFrameOnCanvas())
        {
            const canvasDist = this.frame2canvas(this.data.currentFrame);
            this.translation = this.translation + canvasDist;
        }
    }

    clear()
    {
        this.zoom = 1;
        this.translation = 0;
    }
}

export default class Timeline {

    private data: TimelineData;
    
    private renderer: TimelineRenderer;
    private inputHandler: TimelineInputHandler;

    private popup: EventPopup;

    constructor(canvas : HTMLCanvasElement, wrapper: HTMLElement)
    {
        this.data = new TimelineData();
        this.renderer = new TimelineRenderer(this.data, canvas, wrapper);
        this.popup = new EventPopup(document.getElementById("eventPopup"));
        this.inputHandler = new TimelineInputHandler(canvas, this.renderer, this.data, this.popup);
    }

    clear()
    {
        this.renderer.clear();
        this.inputHandler.clear();
        this.data.clear();   
    }

    setSelectedEntity(entityId: number)
    {
        this.data.selectedEntityId = entityId;
    }

    getSelectedEntity()
    {
        return this.data.selectedEntityId;
    }

    addMarker(name: string, frame: number, color: string)
    {
        this.data.markers.addMarker(name, frame, color);
    }

    addEvent(id: TimelineEventId, entityId: string, frame : number, color : string, label: string, type: TimelineEventTypeId)
    {
        this.data.events.addEvent(id, entityId, frame, color, label, type);
    }

    getEvent(id: TimelineEventId) : ITimelineEvent
    {
        return this.data.events.getEvent(id);
    }

    getEventsInFrame(frame: number) : ITimelineEvent[]
    {
        return this.data.events.getEventsInFrame(frame);
    }

    clearEvents()
    {
        this.data.events.clear();
    }

    clearMarkers()
    {
        this.data.markers.clear();
    }

    setFrameClickedCallback(callback : ITimelineFrameClickedCallback)
    {
        this.inputHandler.onframeClicked = callback;
    }

    setTimelineUpdatedCallback(callback : ITimelineUpdatedCallback)
    {
        this.renderer.ontimelineUpdated = callback;
    }

    setEventClickedCallback(callback : IEventClickedCallback)
    {
        this.inputHandler.onEventClicked = callback;
    }

    setRangeChangedCallback(callback: IRangeChangedCallback)
    {
        this.inputHandler.onRangeChanged = callback;
    }

    setGetEntityNameCallback(callback: IGetEntityName)
    {
        this.popup.setGetEntityNameCallback(callback);
    }

    setPopupActive(isActive: boolean)
    {
        this.popup.setActive(isActive);
    }

    setCurrentFrame(frame: number)
    {
        this.data.currentFrame = frame;
        this.renderer.updateTranslation();
    }

    getCurrentFrame()
    {
        return this.data.currentFrame;
    }

    setLength(length: number)
    {
        const isInLastFrame = (this.data.range.endFrame == this.data.length - 1) || length == 0;
        if (isInLastFrame)
        {
            this.data.range.endFrame = length - 1;
        }

        this.data.length = length;

        this.renderer.calculateRenderingConstants();
    }

    getLength()
    {
        return this.data.length;
    }

    getSelectionInit()
    {
        return this.data.range.initFrame;
    }

    getSelectionEnd()
    {
        return this.data.range.endFrame;
    }
}