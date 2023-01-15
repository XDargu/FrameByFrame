import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';
import * as Utils from "../utils/utils";

const clientLabelColors = ["#D6A3FF", "#6DE080", "#EB7C2B", "#5DAEDC", "#DFC956"];

export interface IEntityCallback {
    (entityId: number) : void;
}

export interface IEntityCallbacks
{
    onEntitySelected: IEntityCallback;
    onEntityDoubleClicked: IEntityCallback;
    onEntityMouseOver: IEntityCallback;
    onEntityMouseOut: IEntityCallback;
}

interface ClientIdToTagFunction
{
    (clientId: number) : string
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
            let listItem = this.entityTree.buildItem([], { text: "PooledItem", tag: "Test", selectable: true, callbacks: this.callbacks });
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
            onItemDoubleClicked: (element: HTMLDivElement) => {
                entityCallbacks.onEntityDoubleClicked(parseInt(this.entityTree.getValueOfItem(element)));
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

    setEntities(entities: RECORDING.IFrameEntityData, recordedData: RECORDING.NaiveRecordedData)
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
                // Add all parents, from top to bottom
                let parents = [];
                let parentId = entity.parentId;
                while (parentId != 0)
                {
                    const parentEntity = entities[parentId];
                    if (parentId && !this.cachedItemsById.has(parentId) && parentEntity != undefined)
                    {
                        parents.push(parentEntity);
                    }
                    parentId = parentEntity != undefined ? parentEntity.parentId : 0;
                }

                for (let i=parents.length - 1; i>=0; --i)
                {
                    this.addEntityToTree(parents[i], wrapper, recordedData);
                }
                
                // Add entity
                this.addEntityToTree(entity, wrapper, recordedData);
            }
        }

        this.entityTree.root.innerHTML = "";
        this.entityTree.root.appendChild(ul);

        this.filterElements();
    }

    private addEntityToTree(entity: RECORDING.IEntity, wrapper: HTMLDivElement, recordedData: RECORDING.NaiveRecordedData)
    {
        let listItem = this.addEntity(this.findRoot(entity, wrapper), entity, recordedData);
        this.cachedItemsById.set(entity.id, {
            element: listItem,
            parentId: entity.parentId,
            name: RECORDING.NaiveRecordedData.getEntityName(entity)
        });
    }

    addEntity(root :HTMLElement, entity: RECORDING.IEntity, recordedData: RECORDING.NaiveRecordedData) : HTMLElement
    {
        let listItem = this.pool.get();

        // A bit of a hack, but direct access to the elements is much faster that doing a query
        let textElement = listItem.children[0].children[1];
        let tagElement = listItem.children[0].children[2] as HTMLElement;
        let rootList = root.children[1] ? root.children[1] : root.children[0];

        const isTagVisible = recordedData.clientIds.size > 1;
        tagElement.style.display = isTagVisible ? "block" : "none";
        if (isTagVisible) {
            const clientId = Utils.getClientIdUniqueId(entity.id);
            tagElement.textContent = recordedData.getTagByClientId(clientId);
            tagElement.style.backgroundColor = Utils.colorFromHash(clientId, clientLabelColors);
        }
        
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
            const visible = this.filter == "" || Utils.filterText(this.filter, cachedData.name.toLowerCase()) || this.entityTree.isItemSelected(wrapper);

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

    public scrollToEntity(entityId: number) 
    {
        this.entityTree.scrollToElementOfValue(entityId.toString());
    }
}