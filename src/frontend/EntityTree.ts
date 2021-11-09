import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';

export interface IEntityCallback {
    (entityId: number) : void;
}

export interface IEntityCallbacks
{
    onEntitySelected: IEntityCallback;
    onEntityMouseOver: IEntityCallback;
    onEntityMouseOut: IEntityCallback;
}

export class EntityTree {
    entityTree: TREE.TreeControl;
    private searchFilter: HTMLInputElement;
    private filter: string;
    private callbacks: TREE.ITreeCallbacks;

    constructor(propertyTree: HTMLElement, searchFilter: HTMLInputElement, entityCallbacks: IEntityCallbacks) {
        this.entityTree = new TREE.TreeControl(propertyTree);
        this.searchFilter = searchFilter;
        this.searchFilter.onkeyup = () => { this.filterElements(); };
        this.callbacks = {
            onItemSelected: (element: HTMLDivElement) => {
                entityCallbacks.onEntitySelected(parseInt(this.entityTree.getValueOfItem(element)));
            },
            onItemMouseOver: (element: HTMLDivElement) => {
                entityCallbacks.onEntityMouseOver(parseInt(this.entityTree.getValueOfItem(element)));
            },
            onItemMouseOut: (element: HTMLDivElement) => {
                entityCallbacks.onEntityMouseOut(parseInt(this.entityTree.getValueOfItem(element)));
            }
        }

        this.filter = "";
    }

    setEntities(entities: RECORDING.IFrameEntityData)
    {
        this.entityTree.clear();
        for (const entityID in entities) {
            const entity = entities[entityID];
            const entityName = RECORDING.NaiveRecordedData.getEntityName(entity);
            
            this.entityTree.addItem(this.findEntityRoot(entity) as HTMLElement, [], entityName, false, entityID, this.callbacks);
        }
    }

    findElementById(entityID: number) : Element
    {
        return this.entityTree.getItemWithValue(entityID.toString());
    }

    private findEntityRoot(entity: RECORDING.IEntity) : Element
    {
        if (entity.parentId > 0)
        {
            const parentElement = this.findElementById(entity.parentId)
            if (parentElement)
            {
                return parentElement;
            }
        }

        return this.entityTree.root;
    }

    private filterElements()
    {

    }

    public selectEntity(entityId: number)
    {
        console.log("Selecting: " + entityId);
        this.entityTree.selectElementOfValue(entityId.toString(), true);
    }
}