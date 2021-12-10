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

export interface ITimelineEvent {
    entityId: string;
    typeId: TimelineEventTypeId;
    id: TimelineEventId;
    frame: number;
    color: Utils.RGBColor;
}

type TEventsPerFrame = Map<number, ITimelineEvent[]>;

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

export default class Timeline {
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

    // Timeline information
    currentFrame : number;
    length : number;

    // Selection
    selectedEntityId: number;

    // Camera control
    private zoom : number;
    private translation : number;
    private dragging : boolean;
    private pressing : boolean;

    // Cached information for rendering
    private frameSize : number;
    private totalSize : number;

    // Callbacks
    private onframeClicked : ITimelineFrameClickedCallback;
    private ontimelineUpdated : ITimelineUpdatedCallback;
    private onEventClicked: IEventClickedCallback;

    // Events
    private events : Map<TimelineEventId, ITimelineEvent>
    private eventsPerFrame : TEventsPerFrame;
    private eventColors: string[];

    private hoveredEvent: ITimelineEvent;


    // Time control
    private timeStampLastUpdate: number;

    constructor(canvas : HTMLCanvasElement, wrapper: HTMLElement)
    {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        window.requestAnimationFrame(this.render.bind(this));
        this.ratio = window.devicePixelRatio;

        this.width = this.canvas.width / this.ratio;
        this.height = this.canvas.height / this.ratio;

        this.zoom = 1;
        this.translation = 0;
        this.dragging = false;
        this.pressing = false;

        this.selectedEntityId = -1;

        this.currentFrame = 0;
        this.length = 0;

        this.onframeClicked = null;
        this.onEventClicked = null;
        this.events = new Map<number, ITimelineEvent>();
        this.eventsPerFrame = new Map<number, ITimelineEvent[]>();
        this.eventColors = [];
        this.timeStampLastUpdate = 0;

        canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        canvas.addEventListener("wheel", this.onMouseWheel.bind(this));
        canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        canvas.addEventListener("contextmenu", this.disableEvent);
        canvas.addEventListener('selectstart', this.disableEvent);

        var resizeObserver = new ResizeObserver(entries => {
            canvas.width = entries[0].contentRect.width * this.ratio;
            canvas.height = entries[0].contentRect.height * this.ratio;
            //canvas.style.left = entries[0].target.offsetLeft + "px";
            this.onResize();
        });
        resizeObserver.observe(wrapper);
    }

    clear()
    {
        this.clearEvents();
        this.length = 0;
        this.currentFrame = 0;

        this.zoom = 1;
        this.translation = 0;
        this.dragging = false;
        this.pressing = false;
        this.selectedEntityId = -1;
    }

    setSelectedEntity(entityId: number)
    {
        this.selectedEntityId = entityId;
    }

    addEvent(id: TimelineEventId, entityId: string, frame : number, color : string, type: TimelineEventTypeId)
    {
        const event: ITimelineEvent = {id: id, entityId: entityId, frame: frame, color: Utils.hexToRgb(color), typeId: type};
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

    getEvent(id: TimelineEventId) : ITimelineEvent
    {
        return this.events.get(id);
    }

    getEventsInFrame(frame: number) : ITimelineEvent[]
    {
        return this.eventsPerFrame.get(frame);
    }

    clearEvents()
    {
        this.events.clear();
        this.eventsPerFrame.clear();
        this.eventColors = [];
    }

    setFrameClickedCallback(callback : ITimelineFrameClickedCallback)
    {
        this.onframeClicked = callback;
    }

    setTimelineUpdatedCallback(callback : ITimelineUpdatedCallback)
    {
        this.ontimelineUpdated = callback;
    }

    setEventClickedCallback(callback : IEventClickedCallback)
    {
        this.onEventClicked = callback;
    }

    private disableEvent(event : any) {
        event.preventDefault();
    }

    private onMouseLeave(event : MouseEvent)
    {
        this.dragging = false;
        this.pressing = false;
    }

    private onMouseDown(event : MouseEvent)
    {
        this.hoveredEvent = this.findEventAtPosition(event.offsetX, event.offsetY);

        if (event.button == 2)
        {
            this.dragging = true;
        }
        else if (event.button == 0)
        {
            const canvasPosition : number = event.offsetX;
            this.currentFrame = Math.round(this.canvas2frame(canvasPosition));
            this.pressing = true;

            if (this.hoveredEvent && this.onEventClicked)
            {
                this.onEventClicked(this.hoveredEvent.entityId, this.hoveredEvent.frame);
            }
            else if (this.onframeClicked)
            {
                this.onframeClicked(this.currentFrame);
            }
        }
    }

    private findHoveredEventInFrame(frame: number, mouseX: number, mouseY: number, entityIdFilter: string = undefined) : ITimelineEvent
    {
        const eventList = this.eventsPerFrame.get(frame);
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

        const firstFrame = Math.round(this.canvas2frame(mouseX - Timeline.eventRadius));
        const lastFrame = Math.round(this.canvas2frame(mouseX + Timeline.eventRadius));

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

    private findEventAtPosition(mouseX: number, mouseY: number) : ITimelineEvent
    {
        // Give priority to currently selected entity
        const selectedEntityEvent = this.findHoveredEventAroundFrame(mouseX, mouseY, this.selectedEntityId.toString());
        if (selectedEntityEvent)
        {
            return selectedEntityEvent;
        }

        return  this.findHoveredEventAroundFrame(mouseX, mouseY);
    }

    private onMouseUp(event : MouseEvent)
    {
        this.dragging = false;
        this.pressing = false;
    }

    private onMouseMove(event : MouseEvent)
    {
        let prevHoveredEvent = this.hoveredEvent;
        this.hoveredEvent = this.findEventAtPosition(event.offsetX, event.offsetY);

        if (this.dragging)
        {
            this.translation = Math.min(Math.max(this.translation - event.movementX, 0), this.totalSize - this.width);
        }

        if (this.pressing)
        {
            const canvasPosition : number = event.offsetX;
            this.currentFrame = Math.round(this.canvas2frame(canvasPosition));

            if (this.onframeClicked)
            {
                this.onframeClicked(this.currentFrame);
            }
        }

        const cursorStyle = this.hoveredEvent ? "pointer" : "auto";
        this.canvas.style.cursor = cursorStyle;
    }

    private onMouseWheel(event : any)
    {
        const canvasPosition : number = event.offsetX;
        const frame : number = this.canvas2frame(canvasPosition);
        const oldFrameSize : number = this.frameSize;

        const zoomRatio : number = 0.001 * this.frameSize;
        this.zoom = Math.min(Math.max(this.zoom - event.deltaY * zoomRatio, 1), 100);
        this.calculateRenderingConstants();

        const newFrameSize : number = this.frameSize;
        const deltaTranslation : number = frame * (newFrameSize - oldFrameSize);

        this.translation = Math.min(Math.max(this.translation + deltaTranslation, 0), this.totalSize - this.width);
    }

    setCurrentFrame(frame: number)
    {
        this.currentFrame = frame;

        if (this.currentFrame > this.getMaxFrameOnCanvas())
        {
            const canvasDist = this.frame2canvas(this.currentFrame) - this.width;
            this.translation = this.translation + canvasDist;
        }
        if (this.currentFrame < this.getMinFrameOnCanvas())
        {
            const canvasDist = this.frame2canvas(this.currentFrame);
            this.translation = this.translation + canvasDist;
        }
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
        this.renderEvents(false, 0.3);
        this.renderEvents(true, 1);
        this.renderMarker();

        window.requestAnimationFrame(this.render.bind(this));
    }

    private renderHeader()
    {
        this.ctx.fillStyle = "#574D5F";
        this.ctx.fillRect(0, 0, this.width, Timeline.headerHeight);

        const firstFrameOnCanvas : number = Math.floor(this.getMinFrameOnCanvas());
        const lastFrameOnCanvas : number = Math.ceil(this.getMaxFrameOnCanvas());

        // Numbers and marks
        // Numbers will be collapsed if they are below a certain threshold
        const frameStep : number = Math.max(1, Math.pow(10, Math.floor(Timeline.frameGroupMinSize / this.frameSize).toString().length - 1));
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
        const lastFrame : number = Math.min(this.length, lastFrameOnCanvas + smallStep - (lastFrameOnCanvas % smallStep));

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

                this.ctx.moveTo(position, Timeline.headerHeight);
                this.ctx.lineTo(position, Timeline.headerHeight - Timeline.markerHeight);

                let offset = 0;
                if (isFirstFrame)
                {
                    offset = this.ctx.measureText(frameNumber).width;
                }
                else if (isLastFrame)
                {
                    offset = -this.ctx.measureText(frameNumber).width * 0.6;
                }

                this.ctx.fillText(frameNumber, position + offset, Timeline.textHeight);
            }
            else
            {
                this.ctx.moveTo(position, Timeline.headerHeight);
                this.ctx.lineTo(position, Timeline.headerHeight - Timeline.smallMarkerHeight);
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
        this.ctx.arc(position, Timeline.eventHeight, Timeline.eventRadius, Math.PI * 0.5, Math.PI * 1.5);
    };
    private drawRightHalf(position: number) { 
        this.ctx.arc(position, Timeline.eventHeight, Timeline.eventRadius, Math.PI * -0.5, Math.PI * 0.5);
    };
    private drawCircle(position: number) { 
        this.ctx.arc(position, Timeline.eventHeight, Timeline.eventRadius, 0, Math.PI * 2);
    };

    private renderEvents(selectedOnly: boolean, opacity: number)
    {
        const firstFrame : number = Math.floor(this.getMinFrameOnCanvas());
        const lastFrame : number = Math.ceil(this.getMaxFrameOnCanvas());

        const selectionAsString = this.selectedEntityId.toString();

        if (this.frameSize > Timeline.eventRadius * 2)
        {
            this.eventsPerFrame.forEach((eventList, frame) => {
                const event = selectedOnly ? findEventOfEntityId(eventList, selectionAsString) : eventList[0];
                if (event)
                {
                    if (frame >= firstFrame && frame <= lastFrame)
                    {
                        const position : number = this.frame2canvas(event.frame);

                        const blend = Utils.blend(Timeline.bodyColor, event.color, opacity);
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
            for (let colIdx=0; colIdx<this.eventColors.length; ++colIdx)
            {
                const color = this.eventColors[colIdx];
                const rgbColor = Utils.hexToRgb(color);
                const blend = Utils.blend(Timeline.bodyColor, rgbColor, opacity);

                let i : number = firstFrame;
                for (; i < lastFrame; )
                {
                    const eventList = this.eventsPerFrame.get(i);
                    if (eventList)
                    {
                        const event = selectedOnly ? findEventOfEntityIdAndColor(eventList, selectionAsString, rgbColor) : findEventOfColor(eventList, rgbColor);
                        if (event)
                        {
                            const position : number = this.frame2canvas(i);

                            const nextFrameEvents = this.getEventsInFrame(i + 1);
                            const prevFrameEvents = this.getEventsInFrame(i - 1);
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
                                    const peekEventList = this.eventsPerFrame.get(j);
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
                                this.ctx.lineTo(lastPosition, Timeline.eventHeight - Timeline.eventRadius);
                                this.drawRightHalf(lastPosition);
                                this.ctx.lineTo(position, Timeline.eventHeight + Timeline.eventRadius);
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

    isMouseHoveringEvent(event: ITimelineEvent, mouseX: number, mouseY: number)
    {
        const x = this.frame2canvas(event.frame);
        const y = Timeline.eventHeight;

        const distanceSq = (x - mouseX) * (x - mouseX) + (y - mouseY) * (y - mouseY);

        return distanceSq < Timeline.eventRadius * Timeline.eventRadius;
    }

    private renderMarker()
    {
        const position : number = this.frame2canvas(this.currentFrame);;

        const eventLength = this.eventsPerFrame.get(this.currentFrame)?.length || 0;
        const eventLabel = eventLength == 1 ? "event" : "events";
        const eventText = eventLength == 0 ? "" : ` (${eventLength} ${eventLabel})`;
        const markerText = `${this.currentFrame + 1}${eventText}`;
        const frameTextWidth = this.ctx.measureText(markerText).width;
        const textPadding = 4;
        const rectPadding = 1;
        const rectHeight = Timeline.headerHeight - rectPadding * 2;
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
        this.ctx.moveTo(position - Timeline.markerTriangleSize, 0);
        this.ctx.lineTo(position + Timeline.markerTriangleSize, 0);
        this.ctx.lineTo(position, + Timeline.markerTriangleSize * 2);
        this.ctx.fill();


        // Line
        this.ctx.beginPath();
        this.ctx.moveTo(position, 0);
        this.ctx.lineTo(position, this.height);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    frame2canvas(frame : number) : number
    {
        return this.frameSize * frame - this.translation;
    }

    canvas2frame(canvasPosition : number) : number
    {
        return (canvasPosition + this.translation) / this.frameSize;
    }

    private getMinFrameOnCanvas()
    {
        return this.canvas2frame(0);
    }

    private getMaxFrameOnCanvas()
    {
        return this.canvas2frame(this.width);
    }

    private calculateRenderingConstants()
    {
        this.totalSize = this.width * this.zoom;
        this.frameSize = this.totalSize / (this.length - 1);
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

    updateLength(length: number)
    {
        this.length = length;
        this.calculateRenderingConstants();
    }
}