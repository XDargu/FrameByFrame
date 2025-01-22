import * as Utils from '../utils/utils';
import { createDefaultSettings, ISettings } from "../files/Settings";
import { filterText } from "../utils/utils";

export interface ISettingsChanged
{
    () : void
}

export interface IButtonCallback
{
    () : void
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

interface INumberSettingCallback
{
    (value: number) : void
}

interface IStringSettingCallback
{
    (value: string) : void
}

interface IColorSettingCallback
{
    (value: string) : void
}

interface IButtonSettingCallback
{
    () : void
}

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
    }

    export function addButtonSetting(group: SettingsBuilderGroup, name: string, tooltip: string, callback: IButtonSettingCallback)
    {
        group.list.appendChild(createButtonSetting(name, tooltip, callback));
    }

    export function addColorSetting(group: SettingsBuilderGroup, name: string, tooltip: string, value: string, defaultValue: string, callback: IColorSettingCallback)
    {
        group.list.appendChild(createColorSetting(name, tooltip, value, defaultValue, callback));
    }

    function createInput(type: string, value: string, placeholder?: string) : HTMLInputElement
    {
        let input: HTMLInputElement = document.createElement("input");
        input.className = "basico-input basico-small";
        input.type = type;
        input.value = value;
        if (input.placeholder != null) {
            input.placeholder = placeholder;
        }
        return input;
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

    function createResetButton() : HTMLButtonElement
    {
        let resetButton: HTMLButtonElement = document.createElement("button");
        resetButton.className = "basico-button basico-small setting-reset-button";
        resetButton.title = "Restore to default value";

        let icon: HTMLElement = document.createElement("i");
        icon.className = "fa fa-undo";
        resetButton.append(icon);

        return resetButton;
    }

    function createButton(text: string, tooltip: string) : HTMLButtonElement
    {
        let button: HTMLButtonElement = document.createElement("button");
        button.className = "basico-button basico-small";
        button.title = tooltip;
        button.innerText = text;

        return button;
    }

    function createButtonSetting(name: string, tooltip: string, callback: IButtonSettingCallback) : HTMLElement
    {
        let button = createButton(name, tooltip);
        button.onclick = () => { callback(); };

        return createListItem(button);
    }

    function createColorSetting(name: string, tooltip: string, value: string, defaultValue: string, callback: IColorSettingCallback) : HTMLElement
    {
        let input = createInput("color", value);
        input.oninput = () => { callback(input.value); }

        let resetButton = createResetButton();
        resetButton.onclick = () => { input.value = defaultValue; callback(defaultValue); };

        let textItem = createTextItem(name, tooltip);

        return createListItem(textItem, input, resetButton);
    }

    export function addRangeSetting(group: SettingsBuilderGroup, name: string, tooltip: string, min: number, max: number, step: number, value: number, defaultValue: number, callback: INumberSettingCallback)
    {
        group.list.appendChild(createRangeSetting(name, tooltip, min, max, step, value, defaultValue, callback));
    }

    function createRangeSetting(name: string, tooltip: string, min: number, max: number, step: number, value: number, defaultValue: number, callback: INumberSettingCallback) : HTMLElement
    {
        let input = createInput("range", value.toString());
        input.className = "basico-slider";
        input.min = min.toString();
        input.max = max.toString();
        input.step = step.toString();
        input.value = value.toString();
        input.oninput = () => { callback( Utils.clamp(Number.parseFloat(input.value), min, max)); }

        let textItem = createTextItem(name, tooltip);

        let resetButton = createResetButton();
        resetButton.onclick = () => { input.value = defaultValue.toString(); callback(defaultValue); };

        return createListItem(textItem, input, resetButton);
    }

    export function addNumberSetting(group: SettingsBuilderGroup, name: string, tooltip: string, placeholder: number, value: number, callback: IStringSettingCallback)
    {
        group.list.appendChild(createNumberSetting(name, tooltip, placeholder, value, callback));
    }

    function createNumberSetting(name: string, tooltip: string, placeholder: number, value: number, callback: IStringSettingCallback) : HTMLElement
    {
        let input = createInput("number", value.toString(), placeholder.toString());
        input.oninput = () => { callback(input.value == "" ? placeholder.toString() : input.value); }

        let textItem = createTextItem(name, tooltip);

        return createListItem(textItem, input);
    }

    export function addStringSetting(group: SettingsBuilderGroup, name: string, tooltip: string, placeholder: string, value: string, callback: IStringSettingCallback)
    {
        group.list.appendChild(createStringSetting(name, tooltip, placeholder, value, callback));
    }

    function createStringSetting(name: string, tooltip: string, placeholder: string, value: string, callback: IStringSettingCallback) : HTMLElement
    {
        let input = createInput("text", value, placeholder);
        input.oninput = () => { callback(input.value); }

        let textItem = createTextItem(name, tooltip);

        return createListItem(textItem, input);
    }

    export function addNumberOptionsSetting(group: SettingsBuilderGroup, name: string, value: number, options: number[], callback: INumberSettingCallback)
    {
        group.list.appendChild(createNumberOptionsSetting(name, value, options, callback));
    }

    function createNumberOptionsSetting(name: string, value: number, options: number[], callback: INumberSettingCallback) : HTMLElement
    {
        let dropdown = createNumberDropdown(value, options, callback);
        let textItem = createTextItem(name, "");

        return createListItem(textItem, dropdown);
    }

    export function addBooleanSetting(group: SettingsBuilderGroup, name: string, value: boolean, callback: IBooleanSettingCallback)
    {
        group.list.appendChild(createBooleanSetting(name, value, callback));
    }

    function createBooleanSetting(name: string, value: boolean, callback: IBooleanSettingCallback) : HTMLElement
    {
        let toggle = createToggle(value, callback);
        let textItem = createTextItem(name, "");

        return createListItem(textItem, toggle);
    }

    function createDropdownEntry(name: string) : HTMLElement
    {
        let entry = document.createElement("a");
        entry.textContent = name;
        return entry;
    }

    function createNumberDropdown(value: number, options: number[], callback: INumberSettingCallback): HTMLElement
    {
        const dropdown = document.createElement("div");
        dropdown.className = "basico-dropdown";

        const dropdownButton = document.createElement("button");
        dropdownButton.className = "basico-dropdown-button";
        dropdownButton.textContent = value.toString();
        dropdown.appendChild(dropdownButton);

        const dropdownContent = document.createElement("div");
        dropdownContent.className = "basico-dropdown-content basico-right-align";
        dropdown.appendChild(dropdownContent);

        const entries = options.map((value) => {
            let entry = createDropdownEntry(value.toString());
            entry.onclick = () => {
                dropdownButton.textContent = value.toString();
                callback(value);
            };
            return entry;
        });

        dropdownContent.append(...entries);
        return dropdown;
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
    private onPurgePools: IButtonCallback;
    private onRestoreContext: IButtonCallback;
    private settingsList: HTMLElement;
    private searchFilter: HTMLInputElement;
    private filter: string;

    constructor(settingsList: HTMLElement, searchFilter: HTMLInputElement, onSettingsChanged: ISettingsChanged, onPurgePools: IButtonCallback, onRestoreContext: IButtonCallback)
    {
        this.settingsList = settingsList;
        this.searchFilter = searchFilter;
        this.searchFilter.onkeyup = () => { this.filterElements(); };
        this.filter = "";
        this.onSettingsChanged = onSettingsChanged;
        this.onPurgePools = onPurgePools;
        this.onRestoreContext = onRestoreContext;
    }

    setSettings(settings: ISettings)
    {
        const defaultSettings = createDefaultSettings();

        this.settingsList.innerHTML = "";
        {
            let group = SettingsBuilder.createGroup("Connection");
            SettingsBuilder.addBooleanSetting(group, "Record on connect", settings.recordOnConnect, (value) => {settings.recordOnConnect = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Auto re-connect", settings.autoReconnect, (value) => {settings.autoReconnect = value; this.onSettingsChanged(); })
            SettingsBuilder.addNumberSetting(group,
                "Default Port",
                "",
                Number.parseInt(defaultSettings.defaultPort), Number.parseInt(settings.defaultPort),
                (value) => {
                    settings.defaultPort = value;
                    this.onSettingsChanged();
                }
            );
            this.settingsList.appendChild(group.fragment);
        }
        {
            let group = SettingsBuilder.createGroup("Viewer");
            SettingsBuilder.addBooleanSetting(group, "Move camera on selection", settings.moveToEntityOnSelection, (value) => {settings.moveToEntityOnSelection = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Open entity list on selection", settings.openEntityListOnSelection, (value) => {settings.openEntityListOnSelection = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Follow selected entity", settings.followCurrentSelection, (value) => {settings.followCurrentSelection = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Show all layers on start", settings.showAllLayersOnStart, (value) => {settings.showAllLayersOnStart = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Highlight shapes on hover", settings.highlightShapesOnHover, (value) => {settings.highlightShapesOnHover = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Show shapes line on hover", settings.showShapeLineOnHover, (value) => {settings.showShapeLineOnHover = value; this.onSettingsChanged(); })
            SettingsBuilder.addColorSetting(group, "Background Color", "Changes the background color of the viewer", settings.backgroundColor, defaultSettings.backgroundColor, (value) => {settings.backgroundColor = value; this.onSettingsChanged(); })
            SettingsBuilder.addColorSetting(group, "Selection Color", "Changes the color of the outline of selected entities of the viewer", settings.selectionColor, defaultSettings.selectionColor, (value) => {settings.selectionColor = value; this.onSettingsChanged(); })
            SettingsBuilder.addColorSetting(group, "Hover Color", "Changes color of the outline of hovered entities of the viewer", settings.hoverColor, defaultSettings.hoverColor, (value) => {settings.hoverColor = value; this.onSettingsChanged(); })
            SettingsBuilder.addColorSetting(group, "Shape Hover Color", "Changes color used for highlighting the hovered shapes entities on the viewer or the property tree", settings.shapeHoverColor, defaultSettings.shapeHoverColor, (value) => {settings.shapeHoverColor = value; this.onSettingsChanged(); })
            SettingsBuilder.addRangeSetting(group,
                "Outline width",
                "Changes the width of the selection and hover outline",
                0, 3, 0.1,
                settings.selectionOutlineWidth,
                defaultSettings.selectionOutlineWidth,
                (value) => {
                    settings.selectionOutlineWidth = value;
                    this.onSettingsChanged();
                }
            );
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Texture Pinning");
            SettingsBuilder.addBooleanSetting(group, "Auto-pin Screenshot Entity", settings.autoPinScreenshotEntity, (value) => {settings.autoPinScreenshotEntity = value; this.onSettingsChanged(); })

            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Syncing");
            SettingsBuilder.addBooleanSetting(group, "Sync Visible Shapes", settings.syncVisibleShapes, (value) => {settings.syncVisibleShapes = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Sync Camera Position", settings.syncCameraPosition, (value) => {settings.syncCameraPosition = value; this.onSettingsChanged(); })

            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Timeline");
            SettingsBuilder.addBooleanSetting(group, "Show event popup", settings.showEventPopup, (value) => {settings.showEventPopup = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Show comment popup", settings.showCommentPopup, (value) => {settings.showCommentPopup = value; this.onSettingsChanged(); })
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Grid");
            SettingsBuilder.addNumberSetting(group,
                "Grid height",
                "Changes the height of the grid on the viewer",
                defaultSettings.gridHeight,
                settings.gridHeight,
                (value) => {
                    settings.gridHeight = Number.parseFloat(value);
                    this.onSettingsChanged();
                }
            );
            SettingsBuilder.addNumberSetting(group,
                "Grid spacing",
                "Changes the spacing between the grid lines",
                defaultSettings.gridSpacing,
                settings.gridSpacing,
                (value) => {
                    settings.gridSpacing = Number.parseFloat(value);
                    this.onSettingsChanged();
                }
            );
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Graphics");
            SettingsBuilder.addNumberOptionsSetting(group, "Anti-aliasing samples", settings.antialiasingSamples, [1, 2, 4, 8, 16], (value) => {  settings.antialiasingSamples = value; this.onSettingsChanged(); });
            SettingsBuilder.addNumberSetting(group,
                "Light intensity",
                "Changes how intense is the light on the 3D viewer. Range is 0-1",
                defaultSettings.lightIntensity,
                settings.lightIntensity,
                (value) => {  settings.lightIntensity = Number.parseFloat(value); this.onSettingsChanged(); });
            SettingsBuilder.addBooleanSetting(group, "Backface culling", settings.backFaceCulling, (value) => {settings.backFaceCulling = value; this.onSettingsChanged(); })
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Exporting");
            SettingsBuilder.addStringSetting(group,
                "Exporting name format",
`Default name of a file when saving a recording.
You can use the following formatting options:
 - %h: Hour (hh)
 - %m: Minute (mm)
 - %s: Second (ss)
 - %Y: Year (YYYY)
 - %M: Month (MM)
 - %D: Day (DD)
 - %%: %
`,
                defaultSettings.exportNameFormat, settings.exportNameFormat,
                (value) => {
                    const format = value == "" ? defaultSettings.exportNameFormat : value;
                    settings.exportNameFormat = format;
                    this.onSettingsChanged();
                }
            );
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Recording");
            SettingsBuilder.addBooleanSetting(group, "Remove old frames", settings.removeOldFrames, (value) => {settings.removeOldFrames = value; this.onSettingsChanged(); })
            SettingsBuilder.addNumberSetting(group,
                "Frame removal threshold",
                "Maximum number of frames to keep while recording. If a new frame is recorded, older frames will be discarded",
                defaultSettings.removeOldFramesAmount,
                settings.removeOldFramesAmount,
                (value) => {  settings.removeOldFramesAmount = Math.max(1, Number.parseInt(value)); this.onSettingsChanged(); });
            SettingsBuilder.addBooleanSetting(group, "Update frame on removal", settings.removeOldFramesUpdate, (value) => {settings.removeOldFramesUpdate = value; this.onSettingsChanged(); })
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Comments");
            SettingsBuilder.addBooleanSetting(group, "Show comments", settings.showComments, (value) => {settings.showComments = value; this.onSettingsChanged(); })
            this.settingsList.appendChild(group.fragment);
        }

        {
            let group = SettingsBuilder.createGroup("Debug");
            SettingsBuilder.addBooleanSetting(group, "Show render debug info", settings.showRenderDebug, (value) => {settings.showRenderDebug = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Optimize property tree updates", settings.optimizePropertyTreeUpdates, (value) => {settings.optimizePropertyTreeUpdates = value; this.onSettingsChanged(); })
            SettingsBuilder.addBooleanSetting(group, "Show property tree updates", settings.showProperyTreeUpdates, (value) => {settings.showProperyTreeUpdates = value; this.onSettingsChanged(); })
            this.settingsList.appendChild(group.fragment);

            SettingsBuilder.addButtonSetting(group, "Purge pools", "Empty mesh and material pools", this.onPurgePools);
            SettingsBuilder.addButtonSetting(group, "Restore context", "Try to restore a lost WebGL context", this.onRestoreContext);
        }

        this.filterElements();
    }

    private filterElements()
    {
        this.filter = this.searchFilter.value.toLowerCase();

        // basico-text-oneline

        let settingsWrapper = this.settingsList;

        for (let i=0; i<settingsWrapper.childElementCount; i+=2)
        {
            let titleElement = <HTMLElement>settingsWrapper.children[i];
            let listElement = <HTMLElement>settingsWrapper.children[i + 1];

            let foundInTitle: boolean = false;
            let foundInGroup: boolean = false;

            if (titleElement && listElement)
            {
                foundInTitle = this.filter == "" || filterText(this.filter, titleElement.innerText.toLowerCase());
                foundInGroup = foundInTitle;
            }

            for (let j=0; j<listElement.childElementCount; ++j)
            {
                let settingElement = <HTMLElement>listElement.children[j];
                if (settingElement)
                {
                    if (foundInTitle)
                    {
                        settingElement.style.display = "flex";
                    }
                    else
                    {
                        let nameElement: HTMLInputElement = settingElement.querySelector('.basico-text-oneline');
                        if (nameElement)
                        {
                            const foundInSetting = this.filter == "" || filterText(this.filter, nameElement.innerText.toLowerCase());
                            foundInGroup = foundInGroup || foundInSetting;
                            settingElement.style.display = foundInSetting ? "flex" : "none";
                        }
                    }
                }
            }

            titleElement.style.display = foundInGroup ? "block" : "none";
            listElement.style.display = foundInGroup ? "block" : "none";
        }
    }
}
