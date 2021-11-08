import { ISettings } from "../files/FileManager";
import { ListControl } from "../ui/list";
import { filterText } from "../utils/utils";

export interface ISettingsChanged
{
    () : void
}

enum ControlType
{
    Toggle
}

interface ISingleSettingLayout
{
    name: string;
    control: ControlType;
}

interface ISettingsLayout
{
    [setting: string]: ISingleSettingLayout;
}

interface SettingsBuilderGroup
{
    fragment: DocumentFragment;
    list: HTMLElement;
}

interface IBooleanSettingCallback
{
    (value: boolean) : void
}

const settingsLayout: ISettingsLayout =
{
    recordOnConnect: { control: ControlType.Toggle, name: "Record on Connect" },
    autoReconnect: { control: ControlType.Toggle, name: "Auto Re-connect" },
};

namespace SettingsBuilder
{
    export function createGroup(name: string) : SettingsBuilderGroup
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

        /*<div class="basico-title">Connections</div>
        <div class="basico-list">
            <div class="basico-list-item basico-no-hover" data-list-value="Colliders">
                <label class="basico-toggle">
                    <input type="checkbox" data-layer-name="recordOnConnect"><span class="slider round"></span>
                </label>
                <div class="basico-text-oneline">Record on connect</div>
            </div>
        </div>*/
    }

    export function addBooleanSetting(group: SettingsBuilderGroup, name: string, value: boolean, callback: IBooleanSettingCallback)
    {
        group.list.appendChild(createBooleanSetting(name, value, callback));
    }

    function createBooleanSetting(name: string, value: boolean, callback: IBooleanSettingCallback) : HTMLElement
    {
        let listItem: HTMLElement = document.createElement("div");
        listItem.className = "basico-list-item basico-no-hover";

        let toggle: HTMLElement = createToggle(value, callback);
        listItem.appendChild(toggle);

        let textItem: HTMLElement = document.createElement("div");
        textItem.className = "basico-text-oneline";
        textItem.innerText = name;

        listItem.appendChild(textItem);


        return listItem;
    }

    function createToggle(active: boolean, callback: IBooleanSettingCallback): HTMLLabelElement
    {
        let label: HTMLLabelElement = document.createElement("label");
        label.classList.add("basico-toggle");

        let input: HTMLInputElement = document.createElement("input");
        input.type = "checkbox";
        input.checked = active;
        input.addEventListener("change", (event) => {
            const checkbox = (event.target as HTMLInputElement);
            callback(checkbox.checked);
        });

        let span: HTMLSpanElement = document.createElement("span");
        span.classList.add("slider", "round");

        label.appendChild(input);
        label.appendChild(span);

        return label;
    }
}

export class SettingsList
{
    private onSettingsChanged: ISettingsChanged;
    private settingsList: HTMLElement;
    private searchFilter: HTMLInputElement;
    private filter: string;

    constructor(settingsList: HTMLElement, searchFilter: HTMLInputElement, onSettingsChanged: ISettingsChanged)
    {
        this.settingsList = settingsList;
        this.searchFilter = searchFilter;
        this.searchFilter.onkeyup = () => { this.filterElements(); };
        this.filter = "";
        this.onSettingsChanged = onSettingsChanged;
    }    

    setSettings(settings: ISettings)
    {
        this.settingsList.innerHTML = "";
        let group = SettingsBuilder.createGroup("Connection");
        SettingsBuilder.addBooleanSetting(group, "Record on connect", settings.recordOnConnect, (value) => {settings.recordOnConnect = value; this.onSettingsChanged(); })
        SettingsBuilder.addBooleanSetting(group, "Auto re-connect", settings.autoReconnect, (value) => {settings.autoReconnect = value; this.onSettingsChanged(); })
        this.settingsList.appendChild(group.fragment);

        this.filterElements();
    }

    private filterElements()
    {
        this.filter = this.searchFilter.value.toLowerCase();

        /*let listElement = this.settingsList;
        const remainingElements = listElement.childElementCount;

        for (let i=0; i<remainingElements; i++)
        {
            let element = <HTMLElement>listElement.children[i];
            let nameElement: HTMLInputElement = element.querySelector('.basico-text-oneline');
            if (nameElement)
            {
                const visible = this.filter == "" || filterText(this.filter, nameElement.innerText.toLowerCase());
                element.style.display = visible ? "block" : "none";
            }
        }*/
    }
}
