import { downloadResource, openResource, openResourceInNewWindow } from '../resources/resources';
import * as RECORDING from '../recording/RecordingData';
import { addContextMenu } from './ContextMenu';
import { ResourcePreview } from './ResourcePreview';

export interface ICommentClickedCallback {
	(frame: number, commentId: number) : void;
}

interface InfoBuilderGroup
{
    fragment: DocumentFragment;
    list: HTMLElement;
}

namespace InfoBuiler
{
    export function createGroup(name: string) : InfoBuilderGroup
    {
        let fragment = new DocumentFragment()

        let header: HTMLElement = document.createElement("div");
        header.classList.add("basico-title");
        header.innerText = name;
        fragment.appendChild(header);

        let list: HTMLElement = document.createElement("div");
        list.classList.add("basico-list");
        fragment.appendChild(list);

        return { fragment: fragment, list: list };
    }

    export function addElement(group: InfoBuilderGroup, name: string, tooltip: string) : HTMLElement
    {
        const element = createElement(name, tooltip);
        group.list.appendChild(element);
        return element;
    }

    export function addElementWithTag(group: InfoBuilderGroup, name: string, tooltip: string, tag: string) : HTMLElement
    {
        const element = createElementWithTag(name, tooltip, tag);
        group.list.appendChild(element);
        return element;
    }

    function createElement(name: string, tooltip: string) : HTMLElement
    {
        return createListItem(createTextItem(name, tooltip));
    }

    function createElementWithTag(name: string, tooltip: string, tag: string) : HTMLElement
    {
        return createListItem(createTextItem(name, tooltip), createTagItem(tag));
    }

    function createTagItem(name: string) : HTMLElement
    {
        let textItem: HTMLElement = document.createElement("div");
        textItem.className = "basico-tag";
        textItem.innerText = name;
        return textItem;
    }

    function createTextItem(name: string, tooltip: string) : HTMLElement
    {
        let textItem: HTMLElement = document.createElement("div");
        textItem.className = "basico-text-oneline";
        textItem.innerText = name;
        textItem.title = tooltip;
        return textItem;
    }

    function createListItem(textContent: Node, ...nodes: (Node | string)[]) : HTMLElement
    {
        let listItem: HTMLElement = document.createElement("div");
        listItem.className = "basico-list-item basico-no-hover";

        let contentWrapper = document.createElement("div");
        contentWrapper.className = "setting-value-wrapper";
        contentWrapper.append(...nodes.reverse());

        listItem.append(textContent, contentWrapper);

        return listItem;
    }
}

export class RecordingInfoList
{
    private infoList: HTMLElement;
    private onCommentClicked: ICommentClickedCallback;

    constructor(infoList: HTMLElement, onCommentClicked: ICommentClickedCallback)
    {
        this.infoList = infoList;
        this.onCommentClicked = onCommentClicked;
    }

    buildInfoList(recording: RECORDING.INaiveRecordedData)
    {
        this.infoList.innerHTML = "";

        {
            let group = InfoBuiler.createGroup("Recording");
            InfoBuiler.addElement(group, `Version: ${recording.storageVersion}`, "Version of the recorded data format");
            InfoBuiler.addElement(group, `Length (frames): ${recording.frameData.length}`, "Length of the recording in frames");
            InfoBuiler.addElement(group, `Type: ${RECORDING.RecordingFileTypeToString(recording.type)}`, "Type of recording");
            this.infoList.appendChild(group.fragment);
        }

        {
            let group = InfoBuiler.createGroup("Client IDs");
            for (let [id, clientData] of recording.clientIds)
            {
                InfoBuiler.addElement(group, `${clientData.tag} (ID: ${id})`, "");
            }
            this.infoList.appendChild(group.fragment);
        }

        {
            let group = InfoBuiler.createGroup("Scenes/Levels");
            for (let scene of recording.scenes)
            {
                InfoBuiler.addElement(group, scene, "");
            }
            this.infoList.appendChild(group.fragment);
        }

        {
            let group = InfoBuiler.createGroup("Comments");

            for (let commentId in recording.comments)
            {
                const comment = recording.comments[commentId];

                const element = InfoBuiler.addElement(group, comment.text, comment.text);
                element.classList.remove("basico-no-hover");
                
                element.onclick = (ev) => {
                    this.onCommentClicked(comment.frameId, comment.id);
                };
            }
            this.infoList.appendChild(group.fragment);
        }

        {
            let group = InfoBuiler.createGroup("Resources");
            for (let path in recording.resources)
            {
                const element = InfoBuiler.addElement(group, path, "");
                element.onmouseenter = (ev) => {
                    ResourcePreview.Instance().showAtPosition(ev.pageX, ev.pageY, path);
                };
                element.onmousemove = (ev) => {
                    ResourcePreview.Instance().setPosition(ev.pageX, ev.pageY);
                };
                element.onmouseout = () => {
                    ResourcePreview.Instance().hide();
                }

                // Context menu
                const config = [
                    { text: "Download resource", icon: "fa-download", callback: () => { 
                        downloadResource(recording.resources[path]);
                    }, },
                    { text: "Open in new Window", icon: "fa-window-restore", callback: () => { 
                        openResourceInNewWindow(recording.resources[path]);
                    }, },
                    { text: "Open resource", icon: "fa-folder-open", callback: () => { 
                        openResource(recording.resources[path]);
                    }, },
                ];
                addContextMenu(element, config);
            }
            this.infoList.appendChild(group.fragment);
        }
    }
}