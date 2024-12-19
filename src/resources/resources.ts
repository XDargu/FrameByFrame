import { ipcRenderer } from 'electron';
import * as RECORDING from '../recording/RecordingData';
import * as Messaging from "../messaging/MessageDefinitions";

export function resourceExtensionFromType(type: string) : string
{
    const slash = type.indexOf("/");
    if (slash != -1)
    {
        const specificType = type.substring(slash + 1);

        // Special cases
        if (specificType == "text")
            return "txt";

        return specificType;
    }

    return null;
}

export function isImageResource(resource: RECORDING.IResource)
{
    const type = resource.data.type;
    return type.indexOf("image/") != -1;
}

export function getResourceContent(resource: RECORDING.IResource)
{
    // Hack to get the content without anything else
    const blobJson = JSON.parse(resource.textData)

    const separator = blobJson.blob.indexOf(",");
    const content = blobJson.blob.substring(separator + 1);

    return content;
}


export interface IResourcedLoadedCallback
{
    (resource: RECORDING.IResource) : void;
}

export interface IResourceErrorCallback
{
    (resource: RECORDING.IResource) : void;
}

function decodeHex(string: string)
{
    const uint8array = new Uint8ClampedArray(Math.ceil(string.length / 2));
    for (let i = 0; i < string.length;)
        uint8array[i / 2] = Number.parseInt(string.slice(i, i += 2), 16);
    return uint8array;
}

export async function downloadResource(resource: RECORDING.IResource)
{
    const result = await loadResource(resource);
    const content = getResourceContent(resource);

    const request : Messaging.IDownloadResource = 
    {
        name: resource.path,
        type: result.data.type,
        content: content,
    }

    console.log(resource)
    console.log(request)

    ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.DownloadResource, request));
}

export function loadResource(resource: RECORDING.IResource)
{
    return new Promise<RECORDING.IResource>(async function(resolve, reject)
    {
        try
        {
            const hasValidData = resource.data && resource.data instanceof Blob;
            if (hasValidData)
            {
                resolve(resource);
            }
            else if (resource.textData && resource.type)
            {
                if (resource.type == "image/raw")
                {
                    // The data contains raw pixels
                    const parsed = JSON.parse(resource.textData);

                    let canvas = document.createElement('canvas');
                    let imageData = canvas.getContext('2d').createImageData(parsed.width, parsed.height);
                    imageData.data.set(decodeHex(parsed.data));

                    resource.data = await new Promise((resolve) => {
                        canvas.toBlob(resolve); // implied image/png format
                    });

                    resource.url = URL.createObjectURL(resource.data);
                    resolve(resource);
                }
                else
                {
                    // The data contains serialized blob with an image
                    // Load resource from data, if it's there
                    const parsed = JSON.parse(resource.textData);

                    const response = await fetch(parsed.blob);
                    const blob = await response.blob();
                    resource.data = blob;
                    resource.url = URL.createObjectURL(resource.data);
                    resolve(resource);
                }
            }
            else
            {
                // If everything else fails, try to load the texture
                const response = await fetch(resource.path);
                const blob = await response.blob();

                resource.data = blob;
                resource.url = URL.createObjectURL(resource.data);

                // Generate the needed data
                const reader = new FileReader();
                reader.onload = () => {
                    const b64 = reader.result;
                    const jsonString = JSON.stringify({blob: b64});
                    resource.textData = jsonString;
                    resource.type = blob.type;
                    resolve(resource);
                }
                reader.readAsDataURL(blob);
            }
        } catch(e)
        {
            reject(e);
        }
    });
}