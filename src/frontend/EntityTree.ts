import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';
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

interface CachedTreeItem
{
    element: HTMLElement;
    parentId: number;
    name: string;
}

// Pool test
class TreePool
{
    entityTree: TREE.TreeControl;
    callbacks: TREE.ITreeCallbacks;
    pool: HTMLElement[];

    constructor(entityTree: TREE.TreeControl, callbacks: TREE.ITreeCallbacks)
    {
        this.pool = [];
        this.entityTree = entityTree;
        this.callbacks = callbacks;
    }

    public get()
    {
        if (this.pool.length == 0) {
            let listItem = this.entityTree.buildItem([], { text: "PooledItem", selectable: true, callbacks: this.callbacks });
            return listItem;
        }

        return this.pool.pop();
    }

    public free(element: HTMLElement)
    {
        this.pool.push(element);
    }
}

export class EntityTree {
    entityTree: TREE.TreeControl;
    private searchFilter: HTMLInputElement;
    private filter: string;
    private callbacks: TREE.ITreeCallbacks;
    private pool: TreePool;
    private cachedItemsById: Map<number, CachedTreeItem>;

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

        this.pool = new TreePool(this.entityTree, this.callbacks);
        this.cachedItemsById = new Map<number, CachedTreeItem>();

        this.filter = "";
    }

    areEntitiesEqual(entities: RECORDING.IFrameEntityData, cachedData: Map<number, CachedTreeItem>) : boolean
    {
        for (const [entityID, listItem] of this.cachedItemsById)
        {
            let entity = entities[entityID];
            if (entity == undefined) {
                return false;
            }

            if (entity.parentId != listItem.parentId) {
                return false;
            }

            if (RECORDING.NaiveRecordedData.getEntityName(entity) != listItem.name) {
                return false;
            }
        }

        for (const entityID in entities)
        {
            let entity = entities[entityID];

            let cachedItem = cachedData.get(Number.parseInt(entityID));
            if (cachedItem == undefined)
            {
                return false;
            }

            if (entity.parentId != cachedItem.parentId) {
                return false;
            }

            if (RECORDING.NaiveRecordedData.getEntityName(entity) != cachedItem.name) {
                return false;
            }
        }

        return true;
    }

    findRoot(entity: RECORDING.IEntity, defaultRoot: HTMLElement) : HTMLElement
    {
        if (entity.parentId > 0)
        {
            const parentElement = this.cachedItemsById.get(entity.parentId)
            if (parentElement)
            {
                return parentElement.element;
            }
        }
        return defaultRoot;
    }

    setEntities(entities: RECORDING.IFrameEntityData)
    {
        // The wrapper will be used as the placeholder element to add new items
        let wrapper = document.createElement("div");
        let ul = document.createElement("ul");
        wrapper.appendChild(ul);

        if (this.areEntitiesEqual(entities, this.cachedItemsById))
        {
            return;
        }

        // Remove old items
        for (const [entityID, listItem] of this.cachedItemsById)
        {
            this.pool.free(listItem.element);
        }

        this.cachedItemsById.clear();

        for (const entityID in entities)
        {
            const entity = entities[entityID];
            if (!this.cachedItemsById.has(entity.id))
            {
                // Add all parents
                let parentId = entity.parentId;
                while (parentId != 0)
                {
                    const parentEntity = entities[parentId];
                    if (parentId && !this.cachedItemsById.has(parentId) && parentEntity != undefined)
                    {
                        this.addEntityToTree(parentEntity, wrapper);
                    }
                    parentId = parentEntity != undefined ? parentEntity.parentId : 0;
                }
                
                // Add entity
                this.addEntityToTree(entity, wrapper);
            }
        }

        this.entityTree.root.innerHTML = "";
        this.entityTree.root.appendChild(ul);

        this.filterElements();
    }

    private addEntityToTree(entity: RECORDING.IEntity, wrapper: HTMLDivElement)
    {
        let listItem = this.addEntity(this.findRoot(entity, wrapper), entity);
        this.cachedItemsById.set(entity.id, {
            element: listItem,
            parentId: entity.parentId,
            name: RECORDING.NaiveRecordedData.getEntityName(entity)
        });
    }

    addEntity(root :HTMLElement, entity: RECORDING.IEntity) : HTMLElement
    {
        let listItem = this.pool.get();

        // A bit of a hack, but direct access to the elements is much faster that doing a query
        let textElement = listItem.children[0].children[1];
        let rootList = root.children[1] ? root.children[1] : root.children[0];

        textElement.textContent = RECORDING.NaiveRecordedData.getEntityName(entity);
        listItem.setAttribute("data-tree-value", entity.id.toString());

        if (!listItem.classList.contains("basico-tree-leaf"))
            listItem.classList.add("basico-tree-leaf");

        rootList.appendChild(listItem);

        root.classList.remove("basico-tree-leaf");
        return listItem;
    }

    private filterElements()
    {
        this.filter = this.searchFilter.value.toLowerCase();

        let visibleItemParents = new Map<number, CachedTreeItem>();
        for (const [entityID, cachedData] of this.cachedItemsById)
        {
            const wrapper = cachedData.element.children[0] as HTMLElement;
            const visible = this.filter == "" || filterText(this.filter, cachedData.name.toLowerCase()) || this.entityTree.isItemSelected(wrapper);

            cachedData.element.style.display = visible ? "block" : "none";

            if (visible)
            {
                visibleItemParents.set(cachedData.parentId, cachedData);
            }
        }

        // Make sure parents are visible
        for (const [entityID, cachedData] of visibleItemParents)
        {
            cachedData.element.style.display = "block";

            let nextParentId = cachedData.parentId;
            while (nextParentId != 0)
            {
                const nextParentData = this.cachedItemsById.get(nextParentId);
                if (nextParentData)
                {
                    nextParentData.element.style.display = "block";
                }

                nextParentId = nextParentData ? nextParentData.parentId : 0;
            }
        }
    }

    public selectEntity(entityId: number)
    {
        this.entityTree.selectElementOfValue(entityId.toString(), true);
    }
}