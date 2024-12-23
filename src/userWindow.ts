const { ipcRenderer } = require('electron');
import { initWindowControls } from "./frontend/WindowControls";
import * as Messaging from "./messaging/MessageDefinitions";

async function displayImageResource(textData: string)
{
    const displayElement = document.getElementById('window-content');

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

    const parsed = JSON.parse(textData);

    const response = await fetch(parsed.blob);
    const blob = await response.blob();
    const data = blob;
    const url = URL.createObjectURL(data);

    img.src = url;
}

// Listen for the `display-text` event
ipcRenderer.on('display-content', (event: any, request: Messaging.IUpdateWindowsContent) =>
{
    if (request.type == Messaging.EUserWindowType.Image)
    {
        displayImageResource(request.content);
    }
    else
    {
        const displayElement = document.getElementById('window-content');
        displayElement.innerHTML = "";
        displayElement.textContent = request.content;
    }
});

initWindowControls();