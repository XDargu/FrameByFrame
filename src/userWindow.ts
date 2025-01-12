const { ipcRenderer } = require('electron');
import { initWindowControls } from "./frontend/WindowControls";
import * as Messaging from "./messaging/MessageDefinitions";
import * as DOMUtils from "./utils/DOMUtils";
import * as RECORDING from './recording/RecordingData';
import EntityPropertiesBuilder from "./frontend/EntityPropertiesBuilder";

let propertiesBuilder: EntityPropertiesBuilder = new EntityPropertiesBuilder(
    {
        onPropertyHover: () => {},
        onPropertyStopHovering: () => {},
        onCreateFilterFromProperty: () => {},
        onCreateFilterFromEvent: () => {},
        onOpenInNewWindow: (propId) => {},
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
        isPropertyVisible: (propId) => { return true; }
    }
);

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

async function displayPropertyGroup(propData: string)
{
    const property = JSON.parse(propData) as RECORDING.IPropertyGroup;

    const displayElement = document.getElementById('window-content');
    displayElement.innerHTML = "";
    DOMUtils.setClass(displayElement, "text-content", false);

    propertiesBuilder.buildSinglePropertyTreeBlock(displayElement, property, property.name, -1);
}

// Listen for the `display-text` event
ipcRenderer.on('display-content', (event: any, request: Messaging.IUpdateWindowsContent) =>
{
    if (request.type == Messaging.EUserWindowType.Image)
    {
        displayImageResource(request.content);
    }
    else if (request.type == Messaging.EUserWindowType.PropertyGroup)
    {
        displayPropertyGroup(request.content);
    }
    else
    {
        displayTextResource(request.content);
    }

    document.getElementById("window-title-text").innerText = request.title;
});

initWindowControls();