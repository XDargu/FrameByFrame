export interface GitHubAsset
{
    url: string,
    name: string,
    browser_download_url: string,
    // The rest we don´t need
}

export interface GitHubRelease
{
    tag_name: string,
    name: string,
    created_at: string,
    published_at: string,
    assets: GitHubAsset[]
    body: string, // Contains the info of the release
    html_url: string, // Link to the github page
    // The rest we don´t need
}