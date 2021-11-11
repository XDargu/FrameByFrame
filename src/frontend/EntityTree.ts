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
        let addedEntities = new Map<number, boolean>();
        for (const entityID in entities) {
            const entity = entities[entityID];
            if (!addedEntities.has(entity.id))
            {
                // Add parents recursively
                let parentId = entity.parentId;
                while (parentId != 0)
                {
                    let parentEntity = entities[parentId];
                    if (parentId && !addedEntities.has(parentId) && parentEntity != undefined)
                    {
                        this.addEntity(parentEntity);
                        addedEntities.set(parentId, true);
                    }
                    parentId = parentEntity != undefined ? parentEntity.parentId : 0;
                }
                
                this.addEntity(entity);
                addedEntities.set(entity.id, true);
            }
        }
    }

    addEntity(entity: RECORDING.IEntity)
    {
        const entityName = RECORDING.NaiveRecordedData.getEntityName(entity);            
        this.entityTree.addItem(this.findEntityRoot(entity) as HTMLElement, [], {
            text: entityName,
            value:  entity.id.toString(),
            hidden: false,
            selectable: true,
            callbacks: this.callbacks
        });
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
        this.entityTree.selectElementOfValue(entityId.toString(), true);
    }
}