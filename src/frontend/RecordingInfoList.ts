import * as Utils from '../utils/utils';
import * as RECORDING from '../recording/RecordingData';

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

    export function addElement(group: InfoBuilderGroup, name: string, tooltip: string)
    {
        group.list.appendChild(createElement(name, tooltip));
    }

    export function addElementWithTag(group: InfoBuilderGroup, name: string, tooltip: string, tag: string)
    {
        group.list.appendChild(createElementWithTag(name, tooltip, tag));
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

    constructor(infoList: HTMLElement)
    {
        this.infoList = infoList;
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
    }
}