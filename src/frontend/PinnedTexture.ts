import { NaiveRecordedData } from "../recording/RecordingData";
import { loadImageResource } from "../render/resources/images";
import { ResizeObserver } from 'resize-observer';
import * as Utils from "../utils/utils";
import * as TypeSystem from "../types/typeRegistry";
import * as RECORDING from '../recording/RecordingData';

export interface IGetEntityData
{
    (entityId: number) : RECORDING.IEntity
}

export interface IGetResource
{
    (name: string) : RECORDING.IResource
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

    update()
    {
        this.m[3] = this.m[0] = this.scale;
        this.m[2] = this.m[1] = 0;
        this.m[4] = this.pos.x;
        this.m[5] = this.pos.y;
    }

    restrictPos(imgWidth: number, imgHeight: number)
    {
        const realImgWidth = imgWidth * this.scale;
        const realImgHeight = imgHeight * this.scale;
        this.pos.x = Utils.clamp(this.pos.x, this.ctx.canvas.width - realImgWidth, 0);
        this.pos.y = Utils.clamp(this.pos.y, this.ctx.canvas.height - realImgHeight, 0);
    }

    pan(amount: Point)
    {
        this.pos.x += amount.x;
        this.pos.y += amount.y;
    }

    scaleAt(at: Point, amount: number) // at in canvas pixel coords 
    {
        const prevScale = this.scale;
        this.scale = Utils.clamp(this.scale * amount, 1, 5);
        const realAmount = this.scale / prevScale;

        this.pos.x = at.x - (at.x - this.pos.x) * realAmount;
        this.pos.y = at.y - (at.y - this.pos.y) * realAmount;
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

    private pinnedCanvas: HTMLCanvasElement;
    private pinnedWrapper: HTMLElement;

    constructor()
    {
        this.pinnedEntityId = null;
        this.pinnedPropertyPath = null;
        this.view = new View();
    }

    setPinnedEntityId(pinnedEntityId: number, pinnedPropertyPath: string[])
    {
        this.pinnedEntityId = pinnedEntityId;
        this.pinnedPropertyPath = pinnedPropertyPath;
        this.view.reset();

        // Reset size
        this.pinnedWrapper.style.width = 300 + "px";
        this.pinnedWrapper.style.height = 300 + "px";
    }

    clear()
    {
        this.pinnedEntityId = null;
        this.pinnedPropertyPath = null;
        this.view.reset();
    }

    clientToCanvasX(mouseX: number) : number
    {
        return mouseX - this.pinnedCanvas.getBoundingClientRect().x;
    }

    clientToCanvasY(mouseY: number) : number
    {
        return mouseY - this.pinnedCanvas.getBoundingClientRect().y;
    }

    changeSize(sizeX: number, sizeY: number)
    {
        const rectangleParent = this.pinnedWrapper.parentElement.getBoundingClientRect();

        const wrapperW = Utils.clamp(sizeX, 40, rectangleParent.width - 20);
        const wrapperH = Utils.clamp(sizeY, 30, rectangleParent.height - 20);

        this.pinnedWrapper.style.width = wrapperW + "px";
        this.pinnedWrapper.style.height = wrapperH + "px";
    }

    initialize(getEntityCallback: IGetEntityData, getResourceCallback: IGetResource)
    {
        this.getEntityCallback = getEntityCallback;
        this.getResourceCallback = getResourceCallback;
        
        this.pinnedWrapper = document.getElementById(`pinned-texture`) as HTMLElement;
        this.pinnedCanvas = <HTMLCanvasElement><unknown>document.getElementById('pinned-texture-canvas');
        this.view.setContext(this.pinnedCanvas.getContext('2d'));

        // Initialize pinned texture canvas
        let closePinnedBtn = document.getElementById(`close-pinned-texture`) as HTMLElement;
        let resizer = this.pinnedWrapper.querySelector('.resizer') as HTMLElement;
        this.pinnedCanvas.width = 300;
        this.pinnedCanvas.height = 300;

        // Control of panning & zooming on texture
        let zoom = (e: WheelEvent) => {
            const sensitivity = 0.001;

            //this.zoom = Utils.clamp(this.zoom - e.deltaY * sensitivity, 1, 5);
            //const newZoom = 0.2 * Math.exp(0.0161 * this.zoom * 100);

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

            this.applyPinnedTexture();
        }

        let pan = (e: MouseEvent) => {
            
            this.mouse.oldX = this.mouse.x;
            this.mouse.oldY = this.mouse.y;
            this.mouse.x = this.clientToCanvasX(e.clientX)
            this.mouse.y = this.clientToCanvasY(e.clientY);
            this.view.pan({x: this.mouse.x - this.mouse.oldX, y: this.mouse.y - this.mouse.oldY});

            this.applyPinnedTexture();
        }
            
        let stopPan = () => {
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


        // Control of resizer
        let resize = (e: MouseEvent) => {

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

        let resizeObserver = new ResizeObserver(entries => {

            if (!this.pinnedWrapper.classList.contains("active"))
                return;

            // Workaround to prevent flickering
            //Create temp canvas and context
            let tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.pinnedCanvas.width;
            tempCanvas.height = this.pinnedCanvas.height;
            let tempContext = tempCanvas.getContext("2d");

            //Draw current canvas to temp canvas
            tempContext.drawImage(this.pinnedCanvas, 0, 0);

            const prevW = this.pinnedCanvas.width;

            this.pinnedCanvas.width = entries[0].contentRect.width * window.devicePixelRatio;
            this.pinnedCanvas.height = entries[0].contentRect.height * window.devicePixelRatio;

            //Draw temp canvas back to the current canvas
            this.pinnedCanvas.getContext("2d").drawImage(tempContext.canvas, 0, 0);

            // Update zoom
            const change = prevW / this.pinnedCanvas.width;
            const changePan = prevW - this.pinnedCanvas.width;
            this.view.scaleAt(this.view.getPosition(), change);
            //this.view.scaleAt({ x: this.pinnedCanvas.width * 0.5, y: this.pinnedCanvas.height * 0.5 }, change);
            this.view.pan({ x: changePan / this.view.getScale(), y: 0 });

            this.applyPinnedTexture();
        });
        resizeObserver.observe(this.pinnedWrapper);

        let parentResizeObserver = new ResizeObserver(entries => {

            if (!this.pinnedWrapper.classList.contains("active"))
                return;

            const rectangle = this.pinnedWrapper.getBoundingClientRect();
            this.changeSize(rectangle.width - 1, rectangle.height - 1);
        });
        parentResizeObserver.observe(this.pinnedWrapper.parentElement);
    }

    closePinnedTexture()
    {
        const pinnedElement = document.getElementById("pinned-texture");
        Utils.setClass(pinnedElement, "active", false);
    }

    applyPinnedTexture()
    {
        const pinnedElement = document.getElementById("pinned-texture");
        Utils.setClass(pinnedElement, "active", false);

        const pinnedEntity = this.getEntityCallback(this.pinnedEntityId);
        if (pinnedEntity)
        {
            const pinnedProperty = NaiveRecordedData.findPropertyPathInEntity(pinnedEntity, this.pinnedPropertyPath);
            if (pinnedProperty)
            {
                Utils.setClass(pinnedElement, "active", true);
                const ctx = this.pinnedCanvas.getContext('2d', { alpha: false });

                if (pinnedProperty.type == TypeSystem.CorePropertyTypes.Plane)
                {
                    const plane = pinnedProperty as RECORDING.IPropertyPlane;

                    const resource = this.getResourceCallback(plane.texture);
                    loadImageResource(resource).then((result) => {
                        createImageBitmap(result.data).then((bitmap)=>{

                            ctx.setTransform(1, 0, 0, 1, 0, 0); 
                            ctx.clearRect(0, 0, this.pinnedCanvas.width, this.pinnedCanvas.height);
                            ctx.fillStyle = "black";
                            ctx.fillRect(0, 0, this.pinnedCanvas.width, this.pinnedCanvas.height);

                            // Render image
                            const imgRatio = bitmap.height/bitmap.width;

                            //const zoom = 0.2 * Math.exp(0.0161 * this.zoom * 100);

                            const imgWidth = this.pinnedCanvas.width;
                            const imgHeight = imgWidth * imgRatio;

                            this.view.restrictPos(imgWidth, imgHeight);
                            this.view.apply(); // set the 2D context transform to the view

                            // (this.pinnedCanvas.height - imgHeight) * 0.5
                            ctx.drawImage(bitmap, 0, 0, imgWidth, imgHeight);
                            //ctx.drawImage(bitmap, 0, 0);
                        });
                    });
                }
            }
        }
    }
}