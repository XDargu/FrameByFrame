import { ListControl } from "../ui/list";

export enum LayerState
{
    Off = 0,
    Selected,
    All
}

export function getLayerStateName(state: LayerState)
{
    switch (state)
    {
        case LayerState.Off: return "Off";
        case LayerState.Selected: return "Selected";
        case LayerState.All: return "All";
    }
}

interface ILayer
{
    name: string;
    state: LayerState;
}

export interface ILayerChanged
{
    (name: string, state: LayerState) : void
}

export class LayerController
{
    private layerList: ListControl;
    private allLayerList: HTMLElement;
    private layers: Map<string, ILayer>;
    private layerChangedCallback: ILayerChanged;

    constructor(layerList: HTMLElement, allLayerList: HTMLElement, layerChangedCallback: ILayerChanged)
    {
        this.allLayerList = allLayerList;
        this.layerList = new ListControl(layerList);
        this.layers = new Map<string, ILayer>();
        this.layerChangedCallback = layerChangedCallback;

        this.initButtonsAllLayers();
    }

    private initButtonsAllLayers()
    {
        let group: HTMLElement = this.allLayerList.querySelector(".basico-button-group");

        const initButtonAll = (state: LayerState) =>
        {
            let button = this.getButtonInGroup(group, state);
            button.addEventListener("click", (event) => {
                this.layers.forEach((layer) => {
                    this.onLayerStateChanged(layer.name, state);
                });
                this.updateLayers();
            });
        }

        initButtonAll(LayerState.Off);
        initButtonAll(LayerState.Selected);
        initButtonAll(LayerState.All);
    }

    setLayers(layers: string[])
    {
        for (let layer of layers)
        {
            this.getOrCreateLayer(layer);
        }

        this.updateLayers();
    }

    private updateLayers()
    {
        let listElement = this.layerList.listWrapper;

        let counter = 0;
        for (let [layerName, layerData] of this.layers)
        {
            let element = <HTMLElement>listElement.children[counter];

            if (element) {
                let nameElement: HTMLInputElement = element.querySelector('.basico-text-oneline');
                if (nameElement)
                {
                    nameElement.innerText = layerData.name;
                }
                
                let buttonGroupElement: HTMLInputElement = element.querySelector('.basico-button-group');
                if (buttonGroupElement)
                {
                    this.selectStateInGroup(buttonGroupElement, layerData.state);
                }
                
                this.layerList.setValueOfItem(element, layerName);
            }
            else {
                let listItem = this.layerList.appendElement('', null, layerName);
                const buttons = this.createButtons(layerData.name, layerData.state);
                const name = this.createNameElement(layerData.name);
                listItem.appendChild(name);
                listItem.appendChild(buttons);
                this.layerChangedCallback(layerData.name, layerData.state);
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

    private getButtonInGroup(group: HTMLElement, state: LayerState)
    {
        const types = ['off', 'sel', 'all'];
        return group.querySelector('[data-button-type="' + types[state] + '"]');
    }

    private selectStateInGroup(group: HTMLElement, state: LayerState)
    {
        group.querySelectorAll(".basico-button").forEach(function(node){
            node.classList.remove("layer-active");
        });

        let button = this.getButtonInGroup(group, state);
        if (button)
        {
            button.classList.add("layer-active");
        }
    }

    private createButtons(name: string, state: LayerState)
    {
        let group = document.createElement("div");
        group.className = "basico-button-group basico-compact";

        let offButton = document.createElement("button");
        offButton.className = "basico-button basico-small layer-active";
        offButton.setAttribute('data-button-type', 'off');
        offButton.textContent = "Off";
        offButton.title = "Disable layer";

        let selButton = document.createElement("button");
        selButton.className = "basico-button basico-small";
        selButton.setAttribute('data-button-type', 'sel');
        selButton.textContent = "Selected";
        selButton.title = "Enable layer for selected entity";

        let allButton = document.createElement("button");
        allButton.className = "basico-button basico-small";
        allButton.setAttribute('data-button-type', 'all');
        allButton.textContent = "All";
        allButton.title = "Enable layer for all entities";

        const onButtonClicked = (state: LayerState) =>
        {
            this.selectStateInGroup(group, state);
            this.onLayerStateChanged(name, state);
        }

        offButton.addEventListener("click", (event) => { onButtonClicked(LayerState.Off); });
        selButton.addEventListener("click", (event) => { onButtonClicked(LayerState.Selected); });
        allButton.addEventListener("click", (event) => { onButtonClicked(LayerState.All); });

        group.appendChild(offButton);
        group.appendChild(selButton);
        group.appendChild(allButton);

        return group;
    }

    private createNameElement(name: string): HTMLDivElement
    {
        let div: HTMLDivElement = document.createElement("div");
        div.classList.add("basico-text-oneline");
        div.innerText = name;
        return div;
    }

    private getOrCreateLayer(name: string) : ILayer
    {
        const layer = this.layers.get(name);
        if (layer != undefined)
        {
            return layer;
        }
        
        const newLayer = { name: name, state: LayerState.Selected};
        this.layers.set(name, newLayer);
        return newLayer;
    }

    private onLayerStateChanged(name: string, state: LayerState)
    {
        let layer = this.layers.get(name);
        if (layer)
        {
            layer.state = state;
        }

        this.layerChangedCallback(name, state);
    }
}
