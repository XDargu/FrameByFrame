import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";
import { CorePropertyTypes } from "../types/typeRegistry";
import { TreeControl } from "../ui/tree";
import { ICreateFilterFromPropCallback, IGoToEntityCallback, IIsEntityInFrame, IPropertyHoverCallback, PropertyTreeController } from "../frontend/PropertyTreeController";
import { IContextMenuItem, addContextMenu, removeContextMenu } from './ContextMenu';

namespace UI
{
    function makeTitle(name: string)
    {
        let titleElement = document.createElement("div");
        titleElement.classList.add("basico-title");

        let iconElement = document.createElement("i");
        iconElement.className = "fa filter-arrow-icon fa-angle-down";

        let nameElement = document.createElement("span");
        nameElement.innerText = name;
        titleElement.append(iconElement, nameElement);

        return titleElement;
    }

    function makeTitleTag(name: string, tag: string)
    {
        let tagElement = document.createElement("div");
        setTitleTag(tagElement, name, tag);

        return tagElement;
    }

    function setTitleTag(tagElement: HTMLElement, name: string, tag: string)
    {
        tagElement.innerText = tag;
        tagElement.classList.add("basico-tag");
        tagElement.style.background = Utils.colorFromHash(Utils.hashCode(tag));
    }

    function addTitleEventMenu(titleElement: HTMLElement, name: string, tag: string, onCreateFilterFromEvent: ICreateFilterFromEventCallback)
    {
        // TODO: Maybe this can be moved to the main builder class
        const contextMenuItems = [
            { text: "Create event filter", icon: "fa-plus-square", callback: () => { onCreateFilterFromEvent(name, tag); } },
        ];
        addContextMenu(titleElement, contextMenuItems);
    }

    function makeTitleStar(name: string, isStarred: boolean, onGroupStarred: IGroupStarredCallback)
    {
        let starElement = document.createElement("div");
        starElement.classList.add("basico-star");

        let icon = document.createElement("i");
        icon.classList.add("fas", "fa-star");
        starElement.append(icon);

        setTitleStar(starElement, name, isStarred, onGroupStarred);

        return starElement;
    }

    function setTitleStar(starElement: HTMLElement, name: string, isStarred: boolean, onGroupStarred: IGroupStarredCallback)
    {
        if (isStarred) {
            if (!starElement.classList.contains("active")) {
                starElement.classList.add("active");
            }
        }
        else {
            starElement.classList.remove("active");
        }

        starElement.onclick = (e) => {
            starElement.classList.toggle("active");
            const isStarred = starElement.classList.contains("active");                
            onGroupStarred(name, isStarred);
            e.stopPropagation();
        }
    }

    function makeTreeElement()
    {
        let treeElement = document.createElement("div");
        treeElement.classList.add("basico-tree");
        let ul = document.createElement("ul");
        treeElement.appendChild(ul);

        return treeElement;
    }

    export function updatePropertyTreeTitle(
        titleElement: HTMLElement,
        name: string,
        tag: string,
        hasStar: boolean,
        isStarred: boolean,
        onCreateFilterFromEvent: ICreateFilterFromEventCallback,
        onGroupStarred: IGroupStarredCallback
    )
    {
        // Update name
        // Hacky but fast way of accessing the title
        let nameElement = titleElement.children[1] as HTMLElement;
        nameElement.innerText = name;

        // Update tag
        let tagElement = titleElement.querySelector(".basico-tag") as HTMLElement;
        if (tag)
        {
            if (tagElement)
            {
                setTitleTag(tagElement, name, tag);
            }
            else
            {
                let newTagElement = makeTitleTag(name, tag);
                titleElement.append(newTagElement);
            }
        }
        else if (tagElement)
        {
            tagElement.remove();
        }

        // Update context menu
        const isEvent = tag != null;
        if (isEvent)
        {
            addTitleEventMenu(titleElement, name, tag, onCreateFilterFromEvent);
        }
        else
        {
            removeContextMenu(titleElement);
        }

        // Update star
        let starElement = titleElement.querySelector(".basico-star") as HTMLElement;
        if (hasStar)
        {
            if (starElement)
            {
                setTitleStar(starElement, name, isStarred, onGroupStarred);
            }
            else
            {
                let starElement = makeTitleStar(name, isStarred, onGroupStarred);
                titleElement.append(starElement);
            }
            
        }
        else if (starElement)
        {
            starElement.remove();
        }
    }

    export function setPropertyTree(
        treeElement: HTMLElement,
        name: string,
        nameIndex: number,
        titleElement: HTMLElement,
        collapsedGroups: CollapsedGroupIDsTracker)
    {
        let iconElement = titleElement.children[0] as HTMLElement;

        const toggleCollapse = () => {
            treeElement.classList.toggle("hidden");
            titleElement.classList.toggle("collapsed");
            Utils.toggleClasses(iconElement, "fa-angle-down", "fa-angle-right");
        };

        titleElement.onclick = () => {
            toggleCollapse();
            const isCollapsed = treeElement.classList.contains("hidden");
            collapsedGroups.setGroupCollapsed(name, nameIndex, isCollapsed);
        };

        const isCollapsed = treeElement.classList.contains("hidden");
        if (collapsedGroups.isGroupCollapsed(name, nameIndex) && !isCollapsed)
        {
            toggleCollapse();
        }
    }

    export function makePropertyTree(
        name: string,
        nameIndex: number,
        tag: string = null,
        hasStar: boolean = false,
        isStarred: boolean,
        collapsedGroups: CollapsedGroupIDsTracker,
        onCreateFilterFromEvent: ICreateFilterFromEventCallback,
        onGroupStarred: IGroupStarredCallback,
        contextMenuItems: IContextMenuItem[])
    {        
        let titleElement = makeTitle(name);
        let iconElement = titleElement.children[0] as HTMLElement;

        if (tag)
        {
            let TagElement = makeTitleTag(name, tag);
            titleElement.append(TagElement);
        }

        const isEvent = tag != null;
        if (isEvent)
        {
            addTitleEventMenu(titleElement, name, tag, onCreateFilterFromEvent);
        }

        if (hasStar)
        {
            let starElement = makeTitleStar(name, isStarred, onGroupStarred);
            titleElement.append(starElement);
        }

        let treeElement = makeTreeElement();
        setPropertyTree(treeElement, name, nameIndex, titleElement, collapsedGroups);

        addContextMenu(treeElement, contextMenuItems);

        return { title: titleElement, tree: new TreeControl(treeElement) };
    }
}

interface PropertyTreeGroup
{
    title: HTMLElement;
    propertyTree: TreeControl;
    propertyTreeController: PropertyTreeController;
}

interface PropertyTreeGlobalData
{
    elapsedTime: number,
    serverTime: number
}

class PropertyPathCache<Data>
{
    cache: Map<string, Map<number, Data>>;

    constructor()
    {
        this.cache = new Map<string, Map<number, Data>>();
    }

    setValue(path: string, index: number, data: Data)
    {
        let storedIndexMap = this.cache.get(path);
        if (storedIndexMap == undefined)
        {
            this.cache.set(path, new Map<number, Data>());
        }

        let indexMap = this.cache.get(path);
        indexMap.set(index, data);
    }

    getValue(path: string, index: number)
    {
        let storedIndexMap = this.cache.get(path);
        if (storedIndexMap != undefined)
        {
            return storedIndexMap.get(index);
        }
        return undefined;
    }
}

class CollapsedGroupIDsTracker
{
    private collapsedGroups: Map<string, boolean>;

    constructor()
    {
        this.collapsedGroups = new Map<string, boolean>();
    }

    isGroupCollapsed(name: string, nameIdx: number) : boolean
    {
        return this.collapsedGroups.has(this.hash(name, nameIdx));
    }

    setGroupCollapsed(name: string, nameIdx: number, isCollapsed: boolean)
    {
        if (isCollapsed)
        {
            this.collapsedGroups.set(this.hash(name, nameIdx), true);
        }
        else
        {
            this.collapsedGroups.delete(this.hash(name, nameIdx));
        }
    }

    private hash(name: string, nameIdx: number)
    {
        return name + "###" + nameIdx;
    }
}

function increaseNameId(groupsWithName: Map<string, number>, name: string) : number
{
    const amountWithName = groupsWithName.get(name) || 0;
    groupsWithName.set(name, amountWithName + 1);
    return amountWithName;
}

export interface ICreateFilterFromEventCallback
{
    (name: string, tag: string) : void
}

export interface IGroupStarredCallback
{
    (name: string, starred: boolean) : void
}

export interface IGoToShapeCallback {
    (entityId: number) : void;
}

export interface IIsPropertyVisible
{
    (propertyId: number) : boolean
}

export interface EntityPropertiesBuilderCallbacks
{
    onPropertyHover: IPropertyHoverCallback;
    onPropertyStopHovering: IPropertyHoverCallback;
    onCreateFilterFromProperty: ICreateFilterFromPropCallback;
    onCreateFilterFromEvent: ICreateFilterFromEventCallback;
    onGroupStarred: IGroupStarredCallback;
    onGoToEntity: IGoToEntityCallback;
    onGoToShapePos: IGoToShapeCallback;
    isEntityInFrame: IIsEntityInFrame;
    isPropertyVisible: IIsPropertyVisible;
}

export default class EntityPropertiesBuilder
{
    private propertyGroups: PropertyTreeGroup[];
    private callbacks: EntityPropertiesBuilderCallbacks;
    collapsedGroups: CollapsedGroupIDsTracker;
    starredGroups: string[];
    private propertyGroupsById: Map<string, PropertyTreeGroup>;

    private readonly contextMenuItems: IContextMenuItem[] = [
        { text: "Copy value", icon: "fa-copy", callback: this.onCopyValue.bind(this) },
        { text: "Create filter from property", icon: "fa-plus-square", callback: this.onAddFilter.bind(this) },
        { text: "Go to Shape", icon: "fa-arrow-circle-right", callback: this.onGoToShape.bind(this), condition: this.isPropertyVisible.bind(this) },
    ];

    constructor(callbacks: EntityPropertiesBuilderCallbacks)
    {
        this.propertyGroups = [];
        this.callbacks = callbacks;
        this.collapsedGroups = new CollapsedGroupIDsTracker();
        this.starredGroups = [];
        this.propertyGroupsById = new Map<string, PropertyTreeGroup>();
    }

    buildSinglePropertyTreeBlock(
        treeParent: HTMLElement,
        propertyGroup: RECORDING.IPropertyGroup,
        name: string,
        nameIndex: number,
        tag: string = null,
        ignoreChildren: boolean = false,
        shouldPrepend: boolean = false,
        hasStar: boolean = false,
        alwaysAdd: boolean = false)
    {
        const propsToAdd = propertyGroup.value.filter((property) => {
            const shouldAdd = !ignoreChildren || ignoreChildren && property.type != CorePropertyTypes.Group;
            return shouldAdd;
        });

        const shouldAdd = propsToAdd.length > 0 || alwaysAdd;
        if (!shouldAdd) return;

        // TODO: Replace with two maps
        let storedGroup = this.propertyGroupsById.get(name + nameIndex);

        const isStarred = this.starredGroups.includes(name);
        const onStarredCallback = (name: string, starred: boolean) => {
            if (starred) {
                Utils.pushUnique(this.starredGroups, name);
            }
            else {
                this.starredGroups = this.starredGroups.filter(arrayItem => arrayItem !== name);
            }
            this.callbacks.onGroupStarred(name, starred);
        };

        if (storedGroup)
        {
            // For now, clear and re-build tree
            storedGroup.propertyTree.clear();

            UI.updatePropertyTreeTitle(
                storedGroup.title,
                name,
                tag,
                hasStar,
                isStarred,
                this.callbacks.onCreateFilterFromEvent,
                onStarredCallback);
            UI.setPropertyTree(storedGroup.propertyTree.root, name, nameIndex, storedGroup.title, this.collapsedGroups);
        }
        else
        {
            let propertyTree = UI.makePropertyTree(
                name,
                nameIndex,
                tag,
                hasStar,
                isStarred,
                this.collapsedGroups,
                this.callbacks.onCreateFilterFromEvent,
                onStarredCallback,
                this.contextMenuItems
            );

            let propertyTreeController = new PropertyTreeController(propertyTree.tree,
                {
                    onPropertyHover: this.callbacks.onPropertyHover,
                    onPropertyStopHovering: this.callbacks.onPropertyStopHovering,
                    onGoToEntity: this.callbacks.onGoToEntity,
                    isEntityInFrame: this.callbacks.isEntityInFrame
                }
            );
            
            let newPropertyGroup = { 
                title: propertyTree.title,
                propertyTree: propertyTree.tree,
                propertyTreeController: propertyTreeController
            };
    
            this.propertyGroups.push(newPropertyGroup);
            this.propertyGroupsById.set(name + nameIndex, newPropertyGroup);
        }
        
        // Fill group now that is stored
        {
            let storedGroup = this.propertyGroupsById.get(name + nameIndex);

            for (let i=0; i<propsToAdd.length; ++i)
            {
                storedGroup.propertyTreeController.addToPropertyTree(storedGroup.propertyTree.root, propsToAdd[i]);
            }

            // Add to parent
            if (shouldPrepend)
            {
                treeParent.prepend(storedGroup.title, storedGroup.propertyTree.root);
            }
            else
            {
                treeParent.append(storedGroup.title, storedGroup.propertyTree.root);
            }
        }
    }

    buildPropertiesPropertyTrees(propertyTrees: HTMLElement, properties: RECORDING.IProperty[])
    {
        let groupsWithName = new Map<string, number>();

        for (let i=0; i<properties.length; ++i)
        {
            if (properties[i].type == CorePropertyTypes.Group)
            {
                const currentGroup = properties[i] as RECORDING.IPropertyGroup;

                if (currentGroup.name == "special")
                {
                    const name = "Basic Information";
                    this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, name, increaseNameId(groupsWithName, name), null, false, true);
                }
                else
                {
                    const name = "Uncategorized";

                    this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, name, increaseNameId(groupsWithName, name), null, true);
                    
                    let indices = [];
                    for (let j=0; j<currentGroup.value.length; ++j)
                    {
                        if (this.starredGroups.includes(currentGroup.value[j].name))
                            indices.unshift(j);
                        else
                            indices.push(j);
                    }

                    // Sort indices based on the names

                    for (let j=0; j<currentGroup.value.length; ++j)
                    {
                        let groupData = currentGroup.value[indices[j]];
                        if (groupData.type == CorePropertyTypes.Group)
                        {
                            const childGroup = groupData as RECORDING.IPropertyGroup;
                            this.buildSinglePropertyTreeBlock(propertyTrees, childGroup, childGroup.name, increaseNameId(groupsWithName, childGroup.name), null, false, false, true);
                        }
                    }
                }
            }
        }
    }

    buildEventsPropertyTree(eventTree: HTMLElement, events: RECORDING.IEvent[])
    {
        let groupsWithName = new Map<string, number>();
        for (let i=0; i<events.length; ++i)
        {
            const propertyGroup = events[i].properties;
            const name = events[i].name;

            this.buildSinglePropertyTreeBlock(eventTree, propertyGroup, name, increaseNameId(groupsWithName, name), events[i].tag, false, false, false, true);
        }
    }

    buildGlobalData(propertyTrees: HTMLElement, globalData: PropertyTreeGlobalData)
    {
        let groupsWithName = new Map<string, number>();

        const globalDataGroup = {
            type: CorePropertyTypes.Group,
            name: "Frame Data",
            value: [
                {
                    type: CorePropertyTypes.Number,
                    name: "Elapsed Time",
                    value: globalData.elapsedTime,
                    id: Number.MAX_SAFE_INTEGER - 2
                },
                {
                    type: CorePropertyTypes.Number,
                    name: "Server Time",
                    value: globalData.serverTime,
                    id: Number.MAX_SAFE_INTEGER - 3
                }
            ],
            id: Number.MAX_SAFE_INTEGER - 1
        };

        this.buildSinglePropertyTreeBlock(propertyTrees, globalDataGroup, "Frame Data", increaseNameId(groupsWithName, "Frame Data"), null, false, true);
    }

    buildPropertyTree(entity: RECORDING.IEntity, globalData: PropertyTreeGlobalData)
    {
        // TODO: Instead of destroying everything, reuse/pool the already existing ones!
        let propertyTree = document.getElementById('properties');
        let eventTree = document.getElementById('events');

        propertyTree.innerHTML = "";
        eventTree.innerHTML = "";

        if (entity)
        {
            this.buildPropertiesPropertyTrees(propertyTree, entity.properties);
            this.buildEventsPropertyTree(eventTree, entity.events);
        }

        this.buildGlobalData(propertyTree, globalData);
    }

    findItemWithValue(value: string)
    {
        for (let i=0; i<this.propertyGroups.length; ++i)
        {
            const item = this.propertyGroups[i].propertyTree.getItemWithValue(value);
            if (item)
            {
                return item;
            }
        }

        return null;
    }

    private onAddFilter(item: HTMLElement)
    {
        const treeElement = item.closest("li[data-tree-value]");
        const propertyId = treeElement.getAttribute('data-tree-value');
        if (propertyId != null)
        {
            this.callbacks.onCreateFilterFromProperty(Number.parseInt(propertyId));
        }
    }

    private onGoToShape(item: HTMLElement)
    {
        const treeElement = item.closest("li[data-tree-value]");
        if (treeElement)
        {
            const propertyId = treeElement.getAttribute('data-tree-value');
            if (propertyId != null)
            {
                this.callbacks.onGoToShapePos(Number.parseInt(propertyId));
            }
        }
    }

    private isPropertyVisible(item: HTMLElement)
    {
        const treeElement = item.closest("li[data-tree-value]");
        if (treeElement)
        {
            const propertyId = treeElement.getAttribute('data-tree-value');
            if (propertyId != null)
            {
                return this.callbacks.isPropertyVisible(Number.parseInt(propertyId));
            }
        }

        return false;
    }

    private onCopyValue(item: HTMLElement)
    {
        const { clipboard } = require('electron');

        const treeElement = item.closest("li[data-tree-value]");
        
        let groups = treeElement.querySelectorAll(".property-group");
        if (groups.length == 0)
            groups = treeElement.querySelectorAll(".property-table");

        let text = "";
        groups.forEach((group) => {

            const primitives = group.querySelectorAll(".property-primitive");
            primitives.forEach((primitive) => {
                text += primitive.textContent;
                if (primitive.nextSibling)
                    text += ", ";
            });
            if (group.nextSibling)
                text += "\n";
        });

        clipboard.writeText(text);
    }
}