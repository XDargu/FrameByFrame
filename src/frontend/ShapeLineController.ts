import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";
import * as DOMUtils from '../utils/DOMUtils';

export interface IGetPropertyItemCallback {
    (propertyId: number) : HTMLElement;
}

export interface IGetPropertyCanvasPosCallback {
    (propertyId: number, subIndex: number) : RECORDING.IVec3;
}

export default class ShapeLineController
{
    private hoveredPropertyitem: HTMLElement = null;
    private hoveredPropertyId: number = 0;
    private hoveredPropertySubIndex: number = -1;
    private isEnabled: boolean = true;
    private isActive: boolean = false;
    private getPropertyItem: IGetPropertyItemCallback;
    private getPropertyCanvasPos: IGetPropertyCanvasPosCallback;
    private color: Utils.RGBColor;
    private originElement: HTMLElement;
    private targetElement: HTMLElement;
    private lineElement: HTMLElement;
    private canvasElement: HTMLElement;
    
    constructor(getPropertyItem: IGetPropertyItemCallback, getPropertyCanvasPos: IGetPropertyCanvasPosCallback, color: string)
    {
        this.getPropertyItem = getPropertyItem;
        this.getPropertyCanvasPos = getPropertyCanvasPos;

        this.originElement = document.getElementById("shapeHighlightOrigin");
        this.targetElement = document.getElementById("shapeHighlightTarget");
        this.lineElement = document.getElementById("shapeHighlightLine");
        this.canvasElement = document.getElementById("render-canvas");

        this.setColor(color);
    }

    setEnabled(enabled: boolean)
    {
        if (enabled == false)
        {
            this.deactivate();
        }

        this.isEnabled = enabled;
    }

    activate(propertyId: number, subIndex: number)
    {
        if (!this.isEnabled) return;
        
        this.isActive = true;

        this.originElement.classList.remove("disabled");
        this.targetElement.classList.remove("disabled");
        this.lineElement.classList.remove("disabled");

        this.hoveredPropertyId = propertyId;
        this.hoveredPropertySubIndex = subIndex;

        this.updateShapeLine();
        window.requestAnimationFrame(this.updateShapeLine.bind(this));
    }

    deactivate()
    {
        DOMUtils.addUniqueClass(this.originElement, "disabled");
        DOMUtils.addUniqueClass(this.targetElement, "disabled");
        DOMUtils.addUniqueClass(this.lineElement, "disabled");
        this.isActive = false;
    }

    setColor(hexColor: string)
    {
        this.color = Utils.hexToRgb(hexColor);

        const cssBackgroundColor = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;

        this.originElement.style.backgroundColor = cssBackgroundColor;
        this.targetElement.style.backgroundColor = cssBackgroundColor;
        this.lineElement.style.backgroundColor = cssBackgroundColor;
    }

    updateShapeLine()
    {
        this.hoveredPropertyitem = this.getPropertyItem(this.hoveredPropertyId);

        // Disable if needed
        if (this.hoveredPropertyitem == null)
        {
            this.deactivate();
            return;
        }

        const pos = this.getPropertyCanvasPos(this.hoveredPropertyId, this.hoveredPropertySubIndex);
        if (!pos)
        {
            this.deactivate();
            return;
        }

        const canvasRect = this.canvasElement.getBoundingClientRect();
        const targetRect = this.targetElement.getBoundingClientRect();
        const itemRect = this.hoveredPropertyitem.getBoundingClientRect()

        // Origin
        {
            const padding = targetRect.width;

            let x = canvasRect.right - padding;
            let y = itemRect.top + padding * 0.5 + 3;

            y = Utils.clamp(y, canvasRect.top + padding, canvasRect.bottom - padding);

            this.originElement.style.left = x + "px";
            this.originElement.style.top = y + "px";
        }

        // Target
        {
            let x = canvasRect.left + pos.x;
            let y = canvasRect.top + pos.y;

            this.targetElement.style.left = x + "px";
            this.targetElement.style.top = y + "px";

            const insetTop = Math.max(0, canvasRect.top - targetRect.top);
            const insetRight = Math.max(0, targetRect.right - canvasRect.right);
            const insetBottom = Math.max(0, targetRect.bottom - canvasRect.bottom);
            const insetLeft = Math.max(0, canvasRect.left - targetRect.left);

            this.targetElement.style.clipPath = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
        }

        // Line
        {
            // Find the points based off the elements left and top
            let p1 = {x: this.originElement.offsetLeft, y: this.originElement.offsetTop};
            let p2 = {x: this.targetElement.offsetLeft, y: this.targetElement.offsetTop};

            const offset = targetRect.width * 0.5;
            const result = Utils.LiangBarsky(canvasRect.left - offset, canvasRect.right - offset, canvasRect.top - offset, canvasRect.bottom - offset,
                p1.x, p1.y, p2.x, p2.y);

            if (result)
            {
                p1.x = result.x0;
                p1.y = result.y0;

                p2.x = result.x1;
                p2.y = result.y1;
            }

            // Get distance between the points for length of line
            const a = p1.x - p2.x;
            const b = p1.y - p2.y;

            const length = Math.sqrt( a*a + b*b );

            // Get angle between points
            const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angleDeg = angleRad * 180 / Math.PI;

            // Get distance from edge of point to center
            const pointWidth = this.originElement.clientWidth / 2;
            const pointHeight = this.originElement.clientWidth / 2;

            // Set line distance and position
            // Add width/height from above so the line starts in the middle instead of the top-left corner
            this.lineElement.style.width = length + 'px';
            this.lineElement.style.left = (p1.x + pointWidth)+ 'px';
            this.lineElement.style.top = (p1.y + pointHeight) + 'px';

            // Rotate line to match angle between points
            this.lineElement.style.transform = "rotate(" + angleDeg + "deg)";
        }

        if (this.isActive)
            window.requestAnimationFrame(this.updateShapeLine.bind(this));
    }
}