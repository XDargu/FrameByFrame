import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { loadResource } from '../resources/resources';
import { getResourceContent, isImageResource } from '../resources/resources';

export class ResourcePreview
{
    private static resourcePreview: ResourcePreview;

    static Init(popup: HTMLElement)
    {
        this.resourcePreview = new ResourcePreview(popup);
    }

    static Instance() { return this.resourcePreview; }

    private popup: HTMLElement;
    private hideTimeout: NodeJS.Timeout;
    private resourceData: RECORDING.IResourcesData;
    private isActive: boolean;

    constructor(popup: HTMLElement)
    {
        this.popup = popup;
        this.hideTimeout = null;
        this.resourceData = null;
        this.isActive = true;
    }

    setResourceData(resourceData: RECORDING.IResourcesData)
    {
        this.resourceData = resourceData;
    }

    async showAtPosition(x: number, y: number, resourcePath: string)
    {
        if (!this.isActive) { return; }
        if (!this.resourceData) { return; }

        const resource = this.resourceData[resourcePath];
        if (!resource) { return; }

        DOMUtils.setClass(this.popup, "hidden", false);

        this.popup.innerHTML = "";
        

        const result = await loadResource(resource);

        if (isImageResource(result))
        {
            let img = document.createElement("img");
            this.popup.appendChild(img);
            img.src = result.url;
        }
        else
        {
            let div = document.createElement("div");
            this.popup.appendChild(div);
            
            console.log(result);
            const content = getResourceContent(result);
            // Decode from base64 to text
            const buffer = Buffer.from(content, 'base64')
            const decoded = buffer.toString();
            div.innerText = decoded.substring(0, 60);
        }

        this.setPosition(x, y);
    }

    setPosition(x: number, y: number)
    {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;

        const clampedPos = DOMUtils.clampElementToScreen(x, y, this.popup, 20, 20);

        this.popup.style.left = (clampedPos.x) + "px";
        this.popup.style.top = (clampedPos.y) + "px";
    }

    hide()
    {
        if (this.hideTimeout == null)
        {
            this.hideTimeout = setTimeout(() => {
                DOMUtils.setClass(this.popup, "hidden", true);
            }, 5);
        }
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