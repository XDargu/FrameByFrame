import { ListControl } from "../ui/list";

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
    private lastUpdate: number;

    constructor(optionsList: HTMLElement, recordingOptionChangedCallback: IRecordingOptionChanged)
    {
        this.optionsList = new ListControl(optionsList);
        this.options = new Map<string, IRecordingOption>();
        this.lastUpdate = Date.now();
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
        if (Date.now() - this.lastUpdate < 300) {return; }
        // Update entity list
        let listElement = this.optionsList.listWrapper;

        console.log("Length 1: " + listElement.children.length);

        console.log(listElement);
        let counter = 0;
        for (let i=0; i<options.length; ++i)
        {
            const option = options[i];
            const optionData: IRecordingOption = this.getOrCreateOption(option.name, option.enabled);
            let element = <HTMLElement>listElement.children[counter];
            console.log("Length checking: " + listElement.children.length);

            console.log("Checking element " + counter);
            console.log(element);

            if (element != undefined) {
                let toggleElement: HTMLInputElement = element.querySelector('input[type=checkbox]');
                let nameElement: HTMLInputElement = element.querySelector('.basico-text-oneline');

                if (toggleElement && nameElement)
                {
                    if (toggleElement.checked != optionData.enabled)
                    {
                        console.log("Updating checked");
                        toggleElement.checked = optionData.enabled;
                    }
                    if (nameElement.innerText != optionData.name)
                    {
                        console.log("Updating name");

                        nameElement.innerText = optionData.name;
                        toggleElement.setAttribute('data-layer-name', optionData.name);
                        this.optionsList.setValueOfItem(element, option.name);
                    }
                }
            }
            else {
                console.log("Creating new one");

                let listItem = this.optionsList.appendElement('', null, option.name);
                const name = this.createNameElement(option.name);
                let toggle = this.createToggle(option.name, option.enabled)
                listItem.appendChild(toggle);
                listItem.appendChild(name);
                //this.recordingOptionChangedCallback(optionData.name, optionData.enabled);
            }
            counter++;
        }

        // Remove remaining elements
        const remainingElements = listElement.childElementCount;
        console.log("Length before removal: " + listElement.children.length);
        for (let i=counter; i<remainingElements; i++)
        {
            console.log("Removing element " + i);
            let element = <HTMLElement>listElement.children[counter];
            listElement.removeChild(element);
        }
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

    private getOrCreateOption(name: string, enabled: boolean = false) : IRecordingOption
    {
        const option = this.options.get(name);
        if (option != undefined)
        {
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
}
