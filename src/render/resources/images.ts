import * as RECORDING from '../../recording/RecordingData';

export interface IResourcedLoadedCallback
{
    (resource: RECORDING.IResource) : void;
}

export interface IResourceErrorCallback
{
    (resource: RECORDING.IResource) : void;
}

export function loadImageResource(resource: RECORDING.IResource)
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
                // Load resource from data, if it's there
                const parsed = JSON.parse(resource.textData);

                const response = await fetch(parsed.blob);
                const blob = await response.blob();
                resource.data = blob;
                resolve(resource);
            }
            else
            {
                // If everything else fails, try to load the texture
                const response = await fetch(resource.path);
                const blob = await response.blob();

                resource.data = blob;

                // Generate the needed data
                const reader = new FileReader();
                reader.onload = () => {
                    const b64 = reader.result;
                    const jsonString = JSON.stringify({blob: b64});
                    resource.textData = jsonString;
                    resource.type = blob.type;
                }
                reader.readAsDataURL(blob);
                resolve(resource);
            }
        } catch(e)
        {
            reject(e);
        }
    });
}