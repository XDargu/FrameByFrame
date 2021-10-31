import { ResizeObserver } from 'resize-observer';

interface ITimelineFrameClickedCallback {
	(frame: number) : void;
}

interface ITimelineUpdatedCallback {
	(secondsPassed: number) : void;
}

interface ITimelineEvent {
    frame: number;
    color: string;
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

    // Events
    private events : Map<number, ITimelineEvent>

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
        this.events = new Map<number, ITimelineEvent>();

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

    addEvent(frame : number, color : string)
    {
        this.events.set(frame, {frame: frame, color: color});
    }

    getEvent(frame: number) : ITimelineEvent
    {
        return this.events.get(frame);
    }

    clearEvents()
    {
        this.events.clear();
    }

    setFrameClickedCallback(callback : ITimelineFrameClickedCallback)
    {
        this.onframeClicked = callback;
    }

    setTimelineUpdatedCallback(callback : ITimelineUpdatedCallback)
    {
        this.ontimelineUpdated = callback;
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
        if (event.button == 2)
        {
            this.dragging = true;
        }
        else if (event.button == 0)
        {
            const canvasPosition : number = event.offsetX;
            this.currentFrame = Math.round(this.canvas2frame(canvasPosition));
            this.pressing = true;

            if (this.onframeClicked)
            {
                this.onframeClicked(this.currentFrame);
            }
        }
    }

    private onMouseUp(event : MouseEvent)
    {
        this.dragging = false;
        this.pressing = false;
    }

    private onMouseMove(event : MouseEvent)
    {
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
    }

    private onMouseWheel(event : any)
    {
        const canvasPosition : number = event.offsetX;
        const frame : number = this.canvas2frame(canvasPosition);
        const oldFrameSize : number = this.frameSize;

        this.zoom = Math.min(Math.max(this.zoom - event.deltaY * 0.001, 1), 100);
        this.calculateRenderingConstants();

        const newFrameSize : number = this.frameSize;
        const deltaTranslation : number = frame * (newFrameSize - oldFrameSize);

        this.translation = Math.min(Math.max(this.translation + deltaTranslation, 0), this.totalSize - this.width);
    }

    render(timeStamp : number)
    {
        const secondsPassed : number = (timeStamp - this.timeStampLastUpdate) / 1000;
        this.timeStampLastUpdate = timeStamp;

        if (this.ontimelineUpdated)
        {
            this.ontimelineUpdated(secondsPassed);
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

        // Figure out the first and last frame to render
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
        for (; i < lastFrame; i+= smallStep)
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
        }

        this.ctx.stroke();
        this.ctx.closePath();
    }

    private renderEvents()
    {
        for (var event of this.events.values())
        {
            const position : number = this.frame2canvas(event.frame);

            this.ctx.beginPath();
            this.ctx.fillStyle = event.color;
            this.ctx.arc(position, Timeline.eventHeight, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
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
        this.ctx.strokeStyle = "#C4C4C4";
        this.ctx.fillStyle = "#C4C4C4";

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
        //this.render();
    }

    updateLength(length: number)
    {
        this.length = length;
        this.calculateRenderingConstants();
    }
}