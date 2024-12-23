import * as UserWindows from "../frontend/UserWindows";
import * as Messaging from "../messaging/MessageDefinitions";
import { NaiveRecordedData } from "../recording/RecordingData";
import { loadResource } from "../resources/resources";
import { ResizeObserver } from 'resize-observer';
import * as Utils from "../utils/utils";
import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { Logger } from "babylonjs";

export interface IGetEntityData
{
    (entityId: number) : RECORDING.IEntity
}

export interface IGetResource
{
    (name: string) : RECORDING.IResource
}

export interface OnOpenInNewWindow
{
    () : void
}

interface Point
{
    x: number;
    y: number;
}

class View
{
    private matrix = [1, 0, 0, 1, 0, 0]; // current view transform
    private m = this.matrix;             // alias 
    private scale = 1;              // current scale
    private ctx : CanvasRenderingContext2D;                    // reference to the 2D context
    private pos = { x: 0, y: 0 }; // current position of origin

    setContext(_ctx: CanvasRenderingContext2D) { this.ctx = _ctx; }

    apply()
    {
        this.update();
        this.ctx.setTransform(this.m[0], this.m[1], this.m[2], this.m[3], this.m[4], this.m[5]);
    }
    getScale() { return this.scale }

    getPosition() { return this.pos }
    setPosition(pos: Point) { this.pos = pos; }

    update()
    {
        this.m[3] = this.m[0] = this.scale;
        this.m[2] = this.m[1] = 0;
        this.m[4] = this.pos.x;
        this.m[5] = this.pos.y;
    }

    restrictPos(imgWidth: number, imgHeight: number, canvasWidth: number, canvasHeight: number)
    {
        console.assert(!isNaN(this.pos.y))
        console.assert(!isNaN(this.scale))
        console.assert(!isNaN(canvasHeight))
        console.assert(!isNaN(imgHeight))
        const realImgWidth = imgWidth * this.scale;
        const realImgHeight = imgHeight * this.scale;
        this.pos.x = Utils.clamp(this.pos.x, canvasWidth - realImgWidth, 0);
        this.pos.y = Utils.clamp(this.pos.y, canvasHeight - realImgHeight, 0);
        console.assert(!isNaN(this.pos.y))
    }

    pan(amount: Point)
    {
        this.pos.x += amount.x;
        this.pos.y += amount.y;
    }

    scaleAt(at: Point, amount: number) // at in canvas pixel coords 
    {
        console.assert(!isNaN(this.pos.y))
        const prevScale = this.scale;
        this.scale = Utils.clamp(this.scale * amount, 1, 5);
        const realAmount = this.scale / prevScale;

        this.pos.x = at.x - (at.x - this.pos.x) * realAmount;
        this.pos.y = at.y - (at.y - this.pos.y) * realAmount;
        console.assert(!isNaN(this.pos.y))
    }

    reset()
    {
        this.scale = 1;
        this.pos.x = 0;
        this.pos.y = 0;
    }
}

export class PinnedTexture
{
    private view: View;

    private mouse = {x: 0, y: 0, oldX: 0, oldY: 0};

    private pinnedEntityId: number;
    private pinnedPropertyPath: string[];

    private getEntityCallback: IGetEntityData;
    private getResourceCallback: IGetResource;
    private openInNewWindow: OnOpenInNewWindow;

    private pinnedImage: HTMLImageElement;
    private pinnedWrapper: HTMLElement;
    private title: HTMLElement;

    private targetResource: RECORDING.IResource;
    private dirty = false;

    private isEnabled = false;

    constructor()
    {
        this.pinnedEntityId = null;
        this.pinnedPropertyPath = null;
        this.view = new View();
        this.targetResource = null;
        this.title = document.getElementById(`pinned-texture-title`) as HTMLElement;
    }

    setPinnedEntityId(pinnedEntityId: number, pinnedPropertyPath: string[])
    {
        this.pinnedEntityId = pinnedEntityId;
        this.pinnedPropertyPath = pinnedPropertyPath;
        this.view.reset();

        // Reset size
        this.pinnedWrapper.style.width = 300 + "px";
        this.pinnedWrapper.style.height = 300 + "px";

        // Title
        const entity = this.getEntityCallback(pinnedEntityId);
        this.title.innerText = entity ? NaiveRecordedData.getEntityName(entity) : "";

        this.isEnabled = true;
    }

    getTitle() : string
    {
        return this.title.innerText;
    }

    setEnabled()
    {
        this.isEnabled = true;
        this.dirty = true;
    }

    clear()
    {
        this.pinnedEntityId = null;
        this.pinnedPropertyPath = null;
        this.targetResource = null;
        this.dirty = true;
        this.view.reset();
        this.isEnabled = false;
    }

    clientToCanvasX(mouseX: number) : number
    {
        return mouseX - this.pinnedWrapper.getBoundingClientRect().x;
    }

    clientToCanvasY(mouseY: number) : number
    {
        return mouseY - this.pinnedWrapper.getBoundingClientRect().y;
    }

    changeSize(sizeX: number, sizeY: number)
    {
        const rectangleParent = this.pinnedWrapper.parentElement.getBoundingClientRect();
        const rectangle = this.pinnedWrapper.getBoundingClientRect();

        const wrapperW = Utils.clamp(sizeX, 40, rectangleParent.width - 20);
        const wrapperH = Utils.clamp(sizeY, 30, rectangleParent.height - 20);

        const changeScale = rectangle.width / wrapperW;

        // Update the zoom to keep scaling consistent when resizing
        const centerX = this.clientToCanvasX(rectangle.x + rectangle.width * 0.5);
        const centerY = this.clientToCanvasY(rectangle.y + rectangle.height * 0.5);

        if (changeScale < 1)
            this.view.scaleAt({x: centerX, y: centerY}, changeScale);

        // Apply changes
        this.pinnedWrapper.style.width = wrapperW + "px";
        this.pinnedWrapper.style.height = wrapperH + "px";

        this.dirty = true;
    }

    initialize(getEntityCallback: IGetEntityData, getResourceCallback: IGetResource, openInNewWindow: OnOpenInNewWindow)
    {
        this.getEntityCallback = getEntityCallback;
        this.getResourceCallback = getResourceCallback;
        this.openInNewWindow = openInNewWindow;
        
        this.pinnedWrapper = document.getElementById(`pinned-texture`) as HTMLElement;
        this.pinnedImage = <HTMLImageElement><unknown>document.getElementById('pinned-texture-img');

        // Initialize pinned texture canvas
        let closePinnedBtn = document.getElementById(`close-pinned-texture`) as HTMLElement;
        let newWindowBtn = document.getElementById(`new-window-pinned-texture`) as HTMLElement;
        let resizer = this.pinnedWrapper.querySelector('.resizer') as HTMLElement;
        this.pinnedImage.style.width = 300 + "px";
        this.pinnedImage.style.height = 300 + "px";

        // Control of panning & zooming on texture
        let zoom = (e: WheelEvent) =>
        {
            const x = this.clientToCanvasX(e.clientX);
            const y = this.clientToCanvasY(e.clientY);
            if (e.deltaY < 0)
            {
                this.view.scaleAt({x, y}, 1.1);
            }
            else
            {
                this.view.scaleAt({x, y}, 1 / 1.1)
            }
            e.preventDefault();

            this.dirty = true;
        }

        let pan = (e: MouseEvent) =>
        {
            this.mouse.oldX = this.mouse.x;
            this.mouse.oldY = this.mouse.y;
            this.mouse.x = this.clientToCanvasX(e.clientX)
            this.mouse.y = this.clientToCanvasY(e.clientY);
            this.view.pan({x: this.mouse.x - this.mouse.oldX, y: this.mouse.y - this.mouse.oldY});

            this.dirty = true;
        }
            
        let stopPan = () =>
        {
            document.removeEventListener('mousemove', pan)
        }

        this.pinnedWrapper.addEventListener('wheel', zoom);

        this.pinnedWrapper.addEventListener('mousedown', (e) => {
            if (e.target != resizer && !resizer.contains(e.target as HTMLElement))
            {
                this.mouse.oldX = this.mouse.x;
                this.mouse.oldY = this.mouse.y;
                this.mouse.x = this.clientToCanvasX(e.clientX);
                this.mouse.y = this.clientToCanvasY(e.clientY);

                e.preventDefault();
                document.addEventListener('mousemove', pan);
                document.addEventListener('mouseup', stopPan);
            }
        });

        // Close button
        closePinnedBtn.onclick = () => { this.closePinnedTexture(); };

        // New window button
        newWindowBtn.onclick = () => { this.openInNewWindow(); this.closePinnedTexture(); }

        // Control of resizer
        let resize = (e: MouseEvent) =>
        {
            const rectangle = this.pinnedWrapper.getBoundingClientRect();
            this.changeSize(rectangle.right-e.pageX, rectangle.bottom-e.pageY);
        }
            
        let stopResize = () => {
            document.removeEventListener('mousemove', resize)
        }

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });

        let resizeObserver = new ResizeObserver(entries =>
        {
            this.dirty = true;
        });
        resizeObserver.observe(this.pinnedWrapper);

        let parentResizeObserver = new ResizeObserver(entries =>
        {
            if (!this.pinnedWrapper.classList.contains("active"))
                return;

            const rectangle = this.pinnedWrapper.getBoundingClientRect();
            this.changeSize(rectangle.width - 1, rectangle.height - 1);
        });
        parentResizeObserver.observe(this.pinnedWrapper.parentElement);

        // Start rendering
        requestAnimationFrame(this.render.bind(this));
    }

    closePinnedTexture()
    {
        const pinnedElement = document.getElementById("pinned-texture");
        DOMUtils.setClass(pinnedElement, "active", false);
        this.isEnabled = false;
    }

    render()
    {
        if (this.isEnabled && this.pinnedEntityId && this.pinnedImage.naturalWidth > 0 && this.dirty)
        {
            const rectangle = this.pinnedWrapper.getBoundingClientRect();

            // Render image
            const imgRatio = this.pinnedImage.naturalHeight/this.pinnedImage.naturalWidth;

            const imgWidth = rectangle.width;
            const imgHeight = imgWidth * imgRatio;

            this.view.restrictPos(imgWidth, imgHeight, rectangle.width, rectangle.height);
            const scale = this.view.getScale();

            const x = this.view.getPosition().x;
            const y = this.view.getPosition().y;

            this.pinnedImage.style.width = `${imgWidth * scale}px`;
            this.pinnedImage.style.height = `${imgHeight * scale}px`;

            this.pinnedImage.style.marginLeft = `${x}px`;
            this.pinnedImage.style.marginTop = `${y}px`;
        }

        this.dirty = false;

        requestAnimationFrame(this.render.bind(this));
    }

    private async loadResource()
    {
        const pinnedEntity = this.getEntityCallback(this.pinnedEntityId);
        if (pinnedEntity)
        {
            const pinnedProperty = NaiveRecordedData.findPropertyPathInEntity(pinnedEntity, this.pinnedPropertyPath);
            if (pinnedProperty)
            {
                if (RECORDING.isPropertyTextured(pinnedProperty))
                {
                    const resourcePath = (pinnedProperty as RECORDING.IPropertyTextured).texture;
                    if (resourcePath)
                    {
                        const resource = this.getResourceCallback(resourcePath);

                        // The resource is already loaded
                        if (this.targetResource?.path == resource.path)
                            return;

                        // We need to load the resource
                        try
                        {
                            this.targetResource = await loadResource(resource);
                        }
                        catch(e)
                        {
                            this.targetResource = null;
                            Logger.Error("Error loading texture: " + resource?.path);
                        };
                    }
                }
            }
        }
    }

    async applyPinnedTexture(windowId: number)
    {
        const isActive = windowId != null || this.isEnabled;

        if (!isActive)
            return;

        await this.loadResource();

        if (!this.targetResource)
            return;

        // For the pinned texture panel
        if (this.isEnabled)
        {
            const pinnedElement = document.getElementById("pinned-texture");
            DOMUtils.setClass(pinnedElement, "active", true);
            this.pinnedImage.src = this.targetResource.url;
            this.dirty = true;
        }

        // For external windows
        if (windowId != null)
        {
            UserWindows.sendImageData(windowId, this.targetResource.textData, this.getTitle())
        }
    }
}