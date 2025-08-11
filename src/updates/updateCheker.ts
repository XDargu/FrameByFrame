
import * as Utils from "../utils/utils";
import { LIB_VERSION } from "../version";
import { GitHubRelease } from './gitHub';

export interface ICheckUpdateResult
{
    available: boolean;
    error?: string;
    version: string;
    release?: GitHubRelease,
    downloadUrl?: string,
}

const currentVersion = LIB_VERSION;

const repoOwner = 'XDargu';
const repoName = 'FrameByFrame';

// Runs on the renderer!
export async function findLatestUpdate() : Promise<ICheckUpdateResult>
{
    try
    {
        const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

        const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'FrameByFrame' }
        });

        if (!response.ok) {
            throw new Error(`Request Failed. Status Code: ${response.status}`);
        }

        const release = await response.json() as GitHubRelease;
        const latestVersion = release.tag_name.replace(/^v/, '');

        if (Utils.compareVersions(latestVersion, currentVersion))
        {
            for (let asset of release.assets)
            {
                if (!asset.name.includes("Portable")) // Ignore portable version
                {
                    return {
                        available: true,
                        version: latestVersion,
                        release: release,
                        downloadUrl: asset.browser_download_url,
                    };
                }
            }
        }

        return {
            available: false,
            version: latestVersion,
            release: release
        };
    }
    catch(error)
    {
        return {
            available: false,
            version: 'Unknown',
            error: error.message
        };
    }
}

export async function downloadUpdate(downloadUrl: string)
{
    try
    {
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`Download failed. Status Code: ${response.status}`);
        }

        const blob = await response.blob();

        // Convert blob to ArrayBuffer using FileReader
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
        
        const buffer = Buffer.from(arrayBuffer);

        return buffer;
    }
    catch (err)
    {
        console.error('Download error:', err);
        return null;
    }
}