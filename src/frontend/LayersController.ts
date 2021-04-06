import * as BASICO from '../ui/ui';

interface ILayer
{
    name: string;
    active: boolean;
}

export interface ILayerChanged
{
    (name: string, active: boolean) : void
}

export class LayerController
{
    private layerList: BASICO.ListControl;
    private layers: Map<string, ILayer>;
    private layerChangedCallback: ILayerChanged;

    constructor(layerList: HTMLElement, layerChangedCallback: ILayerChanged)
    {
        this.layerList = new BASICO.ListControl(layerList);
        this.layers = new Map<string, ILayer>();
        this.layerChangedCallback = layerChangedCallback;
    }

    getActiveLayers(): string[]
    {
        let layers: string[] = [];

        this.layers.forEach((value: ILayer) => {
            if (value.active)
                layers.push(value.name);
        });

        return layers;
    }

    setLayers(layers: string[])
    {
        // Update entity list
        let listElement = this.layerList.listWrapper;

        let counter = 0;
        for (let layer of layers)
        {
            const layerData: ILayer = this.getLayer(layer);
            let element = <HTMLElement>listElement.children[counter];

            if (element) {
                let toggleElement: HTMLInputElement = element.querySelector('input[type=checkbox]');
                if (toggleElement)
                {
                    toggleElement.checked = layerData.active;
                }
                let nameElement: HTMLInputElement = element.querySelector('.basico-text-oneline');
                if (nameElement)
                {
                    nameElement.innerText = layerData.name;
                }
                this.layerList.setValueOfItem(element, layer);
            }
            else {
                let listItem = this.layerList.appendElement('', null, layer);
                const name = this.createNameElement(layerData.name);
                let toggle = this.createToggle(layerData.name, layerData.active)
                listItem.appendChild(toggle);
                listItem.appendChild(name);
                this.layerChangedCallback(layerData.name, layerData.active);
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
    }

    private createToggle(name: string, active: boolean): HTMLLabelElement
    {
        let label: HTMLLabelElement = document.createElement("label");
        label.classList.add("basico-toggle");

        let input: HTMLInputElement = document.createElement("input");
        input.type = "checkbox";
        input.checked = active;
        input.addEventListener("change", (event) => {
            const checkbox = (event.target as HTMLInputElement);
            this.onLayerToggled(name, checkbox.checked);
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

    private getLayer(name: string) : ILayer
    {
        const layer = this.layers.get(name);
        if (layer != undefined)
        {
            return layer;
        }
        
        const newLayer = { name: name, active: true};
        this.layers.set(name, newLayer);
        return newLayer;
    }

    private onLayerToggled(name: string, active: boolean)
    {
        let layer = this.layers.get(name);
        if (layer)
        {
            layer.active = active;
        }

        this.layerChangedCallback(name, active);
    }
}
