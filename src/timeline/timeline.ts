import { ResizeObserver } from 'resize-observer';

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

interface ITimelineEvent {
    entityId: string;
    typeId: TimelineEventTypeId;
    id: TimelineEventId;
    frame: number;
    color: string;
}

type TEventsPerFrame = Map<number, ITimelineEvent[]>;
type TEventsPerType = Map<TimelineEventTypeId, TEventsPerFrame>;

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

    // Canvas information
    canvas : any;
    ctx : CanvasRenderingContext2D;
    height : number;
    width : number;
    ratio : number;

    // Timeline information
    currentFrame : number;
    length : number;

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
    private eventsPerType : TEventsPerType;

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

        this.currentFrame = 0;
        this.length = 0;

        this.onframeClicked = null;
        this.onEventClicked = null;
        this.events = new Map<number, ITimelineEvent>();
        this.eventsPerFrame = new Map<number, ITimelineEvent[]>();
        this.eventsPerType = new Map<number, TEventsPerFrame>();
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
    }

    addEvent(id: TimelineEventId, entityId: string, frame : number, color : string, type: TimelineEventTypeId)
    {
        const event: ITimelineEvent = {id: id, entityId: entityId, frame: frame, color: color, typeId: type};
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

    private findEventAtPosition(mouseX: number, mouseY: number) : ITimelineEvent
    {
        const frame = Math.round(this.canvas2frame(mouseX));

        const firstFrame = Math.round(this.canvas2frame(mouseX - Timeline.eventRadius));
        const lastFrame = Math.round(this.canvas2frame(mouseX + Timeline.eventRadius));

        // Check the current frame first
        const eventList = this.eventsPerFrame.get(frame);
        if (eventList)
        {
            const event = eventList[0];
            if (event)
            {
                if (this.isMouseHoveringEvent(event, mouseX, mouseY))
                {
                    return event;
                }
            }
        }

        for (let i=firstFrame; i<lastFrame; ++i)
        {
            const eventList = this.eventsPerFrame.get(i);
            if (eventList)
            {
                const event = eventList[0];
                if (event)
                {
                    if (this.isMouseHoveringEvent(event, mouseX, mouseY))
                    {
                        return event;
                    }
                }
            }
        }

        return null;
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
        this.renderEvents();
        this.renderMarker();

        window.requestAnimationFrame(this.render.bind(this));
    }

    private renderHeader()
    {
        this.ctx.fillStyle = "#574D5F";
        this.ctx.fillRect(0, 0, this.width, Timeline.headerHeight);

        // TODO: Figure out the first and last frame to render
        const firstFrame : number = 0;
        const lastFrame : number = this.length;

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

    private renderEvents()
    {
        if (this.frameSize > 5.7)
        {
            for (const eventList of this.eventsPerFrame.values())
            {
                const event = eventList[0];
                const position : number = this.frame2canvas(event.frame);

                this.ctx.fillStyle = event.color;
                this.ctx.beginPath();
                this.drawCircle(position);
                this.ctx.fill();
            }
        }
        else
        {
            enum State
            {
                Initial = 0,
                Drawing
            }

            // TODO: Figure out the first and last frame to render
            const firstFrame : number = 0;
            const lastFrame : number = this.length;

            let state = State.Initial;

            let i : number = firstFrame;
            for (; i < lastFrame; )
            {
                const eventList = this.eventsPerFrame.get(i);
                if (eventList)
                {
                    const event = eventList[0];
                    const position : number = this.frame2canvas(i);

                    const nextFrameEvents = this.getEventsInFrame(i + 1);
                    const prevFrameEvents = this.getEventsInFrame(i - 1);
                    const hasNextFrameEvent = nextFrameEvents != undefined;
                    const hasPrevFrameEvent = prevFrameEvents != undefined;

                    this.ctx.fillStyle = event.color;

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
                                j++
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
                }

                i++;
            }
        }

        if (this.hoveredEvent)
        {
            const position : number = this.frame2canvas(this.hoveredEvent.frame);
            this.ctx.strokeStyle = "#6DE080";
            this.ctx.beginPath();
            this.ctx.lineWidth = 3;
            this.drawCircle(position);
            this.ctx.stroke();
        }

        
        /* The way this could work:
            1. Go event by event
            2. Check if the distance to the next event is less than X
            4. If it's not, then just render a circle
            5. If it is, then start rendering half a circle
            6. Move ahead, and as long as theres is an event with the same colour within less than X, draw a rectangle
            7. Draw the other half of the circle
            
            Maybe do this for each color? And if it overlaps, render the overlapping shape instead.
            For overlapping shapes, something to take into consideration is keep the shape consistent
            */

        // Basic attempt, with all colors being the same, only using frames, not distance

        /*for (const eventList of this.eventsPerFrame.values())
        {
            const event = eventList[0];
            const position : number = this.frame2canvas(event.frame);

            const nextFrameEvents = this.getEventsInFrame(event.frame + 1);
            const hasNextFrameEvent = nextFrameEvents != undefined;

            switch(state)
            {
                case State.Initial:
                    {
                        if (hasNextFrameEvent)
                        {
                            drawLeftHalf(position);
                            state = State.Drawing;
                        }
                        else
                        {
                            drawCircle(position);
                        }
                    }
                    break;
                case State.Drawing:
                    if (hasNextFrameEvent)
                    {
                        drawRectangle(position);
                    }
                    else
                    {
                        drawRightHalf(position);
                        state = State.Initial;
                    }
                    break;
            }

            this.ctx.beginPath();
            this.ctx.fillStyle = event.color;
            this.ctx.fill();
        }*/
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
        const position : number = this.frame2canvas(this.currentFrame);

        const frameNumber = (this.currentFrame + 1).toString();
        const frameTextWidth = this.ctx.measureText(frameNumber).width;
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
        this.ctx.fillText(frameNumber, position + rectWidth * 0.5 * rectInvert, rectPadding + rectHeight * 0.5);

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