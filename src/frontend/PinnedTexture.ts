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

export class PinnedTexture
{
    private pinnedEntityId: number;
    private pinnedPropertyPath: string[];
    private zoom: number;
    private offsetX: number;
    private offsetY: number;

    private getEntityCallback: IGetEntityData;
    private getResourceCallback: IGetResource;

    constructor()
    {
        this.pinnedEntityId = null;
        this.pinnedPropertyPath = null;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    setPinnedEntityId(pinnedEntityId: number, pinnedPropertyPath: string[])
    {
        this.offsetX = 0;
        this.offsetY = 0;
        this.pinnedEntityId = pinnedEntityId;
        this.pinnedPropertyPath = pinnedPropertyPath;
        this.zoom = 1;

        // Reset size
        let pinnedWrapper = document.getElementById(`pinned-texture`) as HTMLElement;
        pinnedWrapper.style.width = 300 + "px";
        pinnedWrapper.style.height = 300 + "px";
    }

    clear()
    {
        this.offsetX = 0;
        this.offsetY = 0;
        this.pinnedEntityId = null;
        this.pinnedPropertyPath = null;
        this.zoom = 1;
    }

    initialize(getEntityCallback: IGetEntityData, getResourceCallback: IGetResource)
    {
        this.getEntityCallback = getEntityCallback;
        this.getResourceCallback = getResourceCallback;

        // Initialize pinned texture canvas
        let pinnedWrapper = document.getElementById(`pinned-texture`) as HTMLElement;
        let closePinnedBtn = document.getElementById(`close-pinned-texture`) as HTMLElement;
        let resizer = pinnedWrapper.querySelector('.resizer') as HTMLElement;
        let pinnedCanvas: HTMLCanvasElement = <HTMLCanvasElement><unknown>document.getElementById('pinned-texture-canvas');
        pinnedCanvas.width = 300;
        pinnedCanvas.height = 300;

        // Control of panning & zooming on texture
        let zoom = (e: WheelEvent) => {
            const sensitivity = 0.001;
            this.zoom = Utils.clamp(this.zoom - e.deltaY * sensitivity, 1, 5);
            
            this.applyPinnedTexture();
        }

        let pan = (e: MouseEvent) => {
            this.offsetX += e.movementX;
            this.offsetY += e.movementY;

            this.applyPinnedTexture();
        }
            
        let stopPan = () => {
            document.removeEventListener('mousemove', pan)
        }

        pinnedWrapper.addEventListener('wheel', zoom);

        pinnedWrapper.addEventListener('mousedown', (e) => {
            if (e.target != resizer)
            {
                e.preventDefault();
                document.addEventListener('mousemove', pan);
                document.addEventListener('mouseup', stopPan);
            }
        });

        // Close button
        closePinnedBtn.onclick = () => { this.closePinnedTexture(); };


        // Control of resizer
        let resize = (e: MouseEvent) => {
            const rectangle = pinnedWrapper.getBoundingClientRect();

            pinnedWrapper.style.width = (rectangle.right - e.pageX) + "px";
            pinnedWrapper.style.height = (rectangle.bottom - e.pageY) + "px";
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

            if (!pinnedWrapper.classList.contains("active"))
                return;

            // Workaround to prevent flickering
            //Create temp canvas and context
            let tempCanvas = document.createElement('canvas');
            tempCanvas.width = pinnedCanvas.width;
            tempCanvas.height = pinnedCanvas.height;
            let tempContext = tempCanvas.getContext("2d");

            //Draw current canvas to temp canvas
            tempContext.drawImage(pinnedCanvas, 0, 0);

            pinnedCanvas.width = entries[0].contentRect.width * window.devicePixelRatio;
            pinnedCanvas.height = entries[0].contentRect.height * window.devicePixelRatio;

            //Draw temp canvas back to the current canvas
            pinnedCanvas.getContext("2d").drawImage(tempContext.canvas, 0, 0);

            this.applyPinnedTexture();
        });
        resizeObserver.observe(pinnedWrapper);
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
                const pinnedCanvas: HTMLCanvasElement = <HTMLCanvasElement><unknown>document.getElementById('pinned-texture-canvas');
                const ctx = pinnedCanvas.getContext('2d', { alpha: false });

                if (pinnedProperty.type == TypeSystem.CorePropertyTypes.Plane)
                {
                    const plane = pinnedProperty as RECORDING.IPropertyPlane;

                    const resource = this.getResourceCallback(plane.texture);
                    loadImageResource(resource).then((result) => {
                        createImageBitmap(result.data).then((bitmap)=>{
                            ctx.fillStyle = "black";
                            ctx.fillRect(0, 0, pinnedCanvas.width, pinnedCanvas.height);

                            // Render image
                            const imgRatio = bitmap.height/bitmap.width;

                            const zoom = 0.2 * Math.exp(0.0161 * this.zoom * 100)

                            const imgWidth = pinnedCanvas.width * zoom;
                            const imgHeight = imgWidth * imgRatio;
                            const startingX = this.offsetX + pinnedCanvas.width - imgWidth;
                            const startingY = this.offsetY + pinnedCanvas.height - imgHeight;

                            ctx.drawImage(bitmap, startingX, startingY * 0.5, imgWidth, imgHeight);
                        });
                    });
                }
            }
        }
    }
}