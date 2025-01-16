const { ipcRenderer } = require('electron');
import { initWindowControls } from "./frontend/WindowControls";
import * as Messaging from "./messaging/MessageDefinitions";
import * as DOMUtils from "./utils/DOMUtils";
import * as RECORDING from './recording/RecordingData';
import EntityPropertiesBuilder, { UI } from "./frontend/EntityPropertiesBuilder";
import { ResourcePreview } from "./frontend/ResourcePreview";

let propertiesBuilder: EntityPropertiesBuilder = new EntityPropertiesBuilder(
    {
        onPropertyHover: () => {},
        onPropertyStopHovering: () => {},
        onCreateFilterFromProperty: () => {},
        onCreateFilterFromEvent: () => {},
        onOpenInNewWindow: (propId) => {},
        onOpenResource: () => {},
        onGroupStarred: () => {},
        // Note: twe need to convert to uniqueID here, because the ids are coming from the recording
        // As an alternative, we could re-create the entityrefs when building the frame data
        onGoToEntity: (id) => {  },
        onGoToShapePos: (id) => {  },
        onPinTexture: (propId) => { 
        },
        onAddComment: (propId) => {
        },
        isEntityInFrame: (id) => { return true; },
        isPropertyVisible: (propId) => { return true; },
        onGroupLocked: (name, locked) => { isLocked = locked; applyRequest(lastRequest); }
    }
);

// Locking
let isLocked = false;
let lastRequest: Messaging.IUpdateWindowsContent = null;

async function displayImageResource(url: string)
{
    const displayElement = document.getElementById('window-content');
    DOMUtils.setClass(displayElement, "text-content", false);

    let img : HTMLImageElement = null;
    if (displayElement.children.length == 1 && displayElement.children[0].nodeName.toLocaleLowerCase() == "img")
    {
        img = displayElement.children[0] as HTMLImageElement;
    }
    else
    {
        img = document.createElement("img");
        img.style.objectFit = "contain";
        img.style.width = "100%";

        displayElement.append(img);
    }

    img.src = url;
}

async function displayTextResource(url: string)
{
    const displayElement = document.getElementById('window-content');
    displayElement.innerHTML = "";
    DOMUtils.setClass(displayElement, "text-content", true);

    const response = await fetch(url);
    const blob = await response.blob();

    let reader = new FileReader();
    reader.onload = () => {
        displayElement.innerText = reader.result as string;
    }
    reader.readAsText(blob);
}

async function displayPropertyGroup(propData: Messaging.IPropertyGroupData)
{
    const property = propData.group;

    const displayElement = document.getElementById('window-content');
    displayElement.innerHTML = "";
    DOMUtils.setClass(displayElement, "text-content", false);

    let propertySearchInput = document.getElementById("property-entity-search") as HTMLInputElement;

    if (!propertySearchInput)
    {
        const searchForm = 
        `<div class="basico-container search-container">
            <div class="basico-form-field search-form">
                <input type="text" id="property-entity-search" placeholder="Type here to filter..." class="basico-input" value="">
                <i class="fa fa-search"></i>
            </div>
        </div>`;

        const searchFormElem = document.createElement("div");
        searchFormElem.innerHTML = searchForm;

        displayElement.parentElement.insertBefore(searchFormElem, displayElement);
        propertySearchInput = document.getElementById("property-entity-search") as HTMLInputElement;
    }

    const wrapper = document.createElement("div");
    wrapper.id = "events";
    displayElement.appendChild(wrapper);

    let flags = UI.TreeFlags.CanLock;
    if (isLocked)
        flags = flags | UI.TreeFlags.IsLocked;

    const buildTree = () => {
        propertiesBuilder.buildSinglePropertyTreeBlock(wrapper, property, propData.name, -1, propertySearchInput.value, propData.tag, flags);

        // A bit hacky: remove click event from title
        const title = document.querySelector("#events > div.basico-title") as HTMLElement;
        title.onclick = null;
    };

    buildTree();

    propertySearchInput.onkeyup = () => { buildTree(); };
}

function applyRequest(request: Messaging.IUpdateWindowsContent)
{
    if (request.type == Messaging.EUserWindowType.Image)
    {
        displayImageResource(request.content as string);
    }
    else if (request.type == Messaging.EUserWindowType.PropertyGroup)
    {
        displayPropertyGroup(request.content as Messaging.IPropertyGroupData);
    }
    else
    {
        displayTextResource(request.content as string);
    }

    document.getElementById("window-title-text").innerText = request.title;
}

// Listen for the `display-text` event
ipcRenderer.on('display-content', (event: any, request: Messaging.IUpdateWindowsContent) =>
{
    lastRequest = request;
    if (isLocked) return;

    ResourcePreview.Init(document.getElementById("resourcePreview"));
    ResourcePreview.Instance().setResourceData({});
    applyRequest(request);
});

initWindowControls();