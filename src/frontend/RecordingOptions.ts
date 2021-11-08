import { ListControl } from "../ui/list";
import { filterText } from "../utils/utils";

interface IRecordingOption
{
    name: string;
    enabled: boolean;
}

export interface IRecordingOptionChanged
{
    (name: string, enabled: boolean) : void
}

export class RecordingOptions
{
    private optionsList: ListControl;
    private options: Map<string, IRecordingOption>;
    private recordingOptionChangedCallback: IRecordingOptionChanged;
    private searchFilter: HTMLInputElement;
    private filter: string;

    constructor(optionsList: HTMLElement, searchFilter: HTMLInputElement, recordingOptionChangedCallback: IRecordingOptionChanged)
    {
        this.optionsList = new ListControl(optionsList);
        this.searchFilter = searchFilter;
        this.searchFilter.onkeyup = () => { this.filterElements(); };
        this.filter = "";
        this.options = new Map<string, IRecordingOption>();
        this.recordingOptionChangedCallback = recordingOptionChangedCallback;
    }

    getActiveOptions(): string[]
    {
        let options: string[] = [];

        this.options.forEach((value: IRecordingOption) => {
            if (value.enabled)
            options.push(value.name);
        });

        return options;
    }

    setOptions(options: IRecordingOption[])
    {
        let listElement = this.optionsList.listWrapper;

        let counter = 0;
        for (let i=0; i<options.length; ++i)
        {
            const option = options[i];
            const optionData: IRecordingOption = this.getOrCreateOption(option.name, option.enabled);
            let element = <HTMLElement>listElement.children[counter];

            if (element != undefined) {
                let toggleElement: HTMLInputElement = element.querySelector('input[type=checkbox]');
                let nameElement: HTMLInputElement = element.querySelector('.basico-text-oneline');

                if (toggleElement && nameElement)
                {
                    if (toggleElement.checked != optionData.enabled)
                    {
                        toggleElement.checked = optionData.enabled;
                    }
                    if (nameElement.innerText != optionData.name)
                    {
                        nameElement.innerText = optionData.name;
                        toggleElement.setAttribute('data-layer-name', optionData.name);
                        this.optionsList.setValueOfItem(element, option.name);
                    }
                }
            }
            else {
                let listItem = this.optionsList.appendElement('', null, option.name);
                const name = this.createNameElement(option.name);
                let toggle = this.createToggle(option.name, option.enabled)
                listItem.appendChild(toggle);
                listItem.appendChild(name);
            }
            counter++;
        }

        // Remove remaining elements
        const remainingElements = listElement.childElementCount;
        for (let i=counter; i<remainingElements; i++)
        {
            let element = <HTMLElement>listElement.children[counter];
            listElement.removeChild(element);
        }

        this.filterElements();
    }

    private createToggle(name: string, active: boolean): HTMLLabelElement
    {
        let label: HTMLLabelElement = document.createElement("label");
        label.classList.add("basico-toggle");

        let input: HTMLInputElement = document.createElement("input");
        input.type = "checkbox";
        input.checked = active;
        input.setAttribute('data-layer-name', name);
        input.addEventListener("change", (event) => {
            const layerName = input.getAttribute('data-layer-name');
            const checkbox = (event.target as HTMLInputElement);
            this.onOptionToggled(layerName, checkbox.checked);
        });

        let span: HTMLSpanElement = document.createElement("span");
        span.classList.add("slider", "round");

        label.appendChild(input);
        label.appendChild(span);

        return label;
    }

    private createNameElement(name: string): HTMLDivElement
    {
        let div: HTMLDivElement = document.createElement("div");
        div.classList.add("basico-text-oneline");
        div.innerText = name;
        return div;
    }

    private getOrCreateOption(name: string, enabled: boolean) : IRecordingOption
    {
        const option = this.options.get(name);
        if (option != undefined)
        {
            option.enabled = enabled;
            return option;
        }
        
        const newOption = { name: name, enabled: enabled};
        this.options.set(name, newOption);
        return newOption;
    }

    private onOptionToggled(name: string, enabled: boolean)
    {
        let option = this.options.get(name);
        if (option)
        {
            option.enabled = enabled;
        }

        this.recordingOptionChangedCallback(name, enabled);
    }

    private filterElements()
    {
        this.filter = this.searchFilter.value.toLowerCase();

        let listElement = this.optionsList.listWrapper;
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
        }
    }
}
