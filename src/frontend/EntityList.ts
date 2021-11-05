import * as RECORDING from "../recording/RecordingData";
import { IListCallbacks, ListControl } from "../ui/list";
import { filterText } from "../utils/utils";

export interface IEntityCallback {
    (entityId: number) : void;
}

export interface IEntityCallbacks
{
    onEntitySelected: IEntityCallback;
    onEntityMouseOver: IEntityCallback;
    onEntityMouseOut: IEntityCallback;
}

export class EntityList
{
    private entityList: ListControl;
    private searchFilter: HTMLInputElement;
    private filter: string;
    private callbacks: IListCallbacks;

    constructor(entityList: HTMLElement, searchFilter: HTMLInputElement, entityCallbacks: IEntityCallbacks)
    {
        this.entityList = new ListControl(entityList);
        this.searchFilter = searchFilter;
        this.searchFilter.onkeyup = () => { this.filterElements(); };
        this.callbacks = {
            onItemSelected: (element: HTMLDivElement) => {
                entityCallbacks.onEntitySelected(parseInt(this.entityList.getValueOfItem(element)));
            },
            onItemMouseOver: (element: HTMLDivElement) => {
                entityCallbacks.onEntityMouseOver(parseInt(this.entityList.getValueOfItem(element)));
            },
            onItemMouseOut: (element: HTMLDivElement) => {
                entityCallbacks.onEntityMouseOut(parseInt(this.entityList.getValueOfItem(element)));
            }
        }

        this.filter = "";
    }

    setEntities(entities: RECORDING.IFrameEntityData)
    {
        let listElement = this.entityList.listWrapper;

        let counter = 0;
        for (let entityID in entities) {
            let element = <HTMLElement>listElement.children[counter];

            const entity = entities[entityID];
            const entityName = RECORDING.NaiveRecordedData.getEntityName(entity);

            if (element) {
                element.innerText = entityName;
                this.entityList.setValueOfItem(element, entityID);
            }
            else {
                this.entityList.appendElement(entityName, this.callbacks, entityID);
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

    private filterElements()
    {
        this.filter = this.searchFilter.value.toLowerCase();

        let listElement = this.entityList.listWrapper;
        const remainingElements = listElement.childElementCount;

        for (let i=0; i<remainingElements; i++)
        {
            let element = <HTMLElement>listElement.children[i];
            const visible = this.filter == "" || filterText(this.filter, element.innerText.toLowerCase());
            element.style.display = visible ? "block" : "none";
        }
    }

    public selectEntity(entityId: number)
    {
        this.entityList.selectElementOfValue(entityId.toString(), true);
    }
}
