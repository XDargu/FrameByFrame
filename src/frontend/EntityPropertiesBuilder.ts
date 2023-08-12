import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";
import { CorePropertyTypes } from "../types/typeRegistry";
import { TreeControl } from "../ui/tree";
import { ICreateFilterFromPropCallback, IGoToEntityCallback, IIsEntityInFrame, IPropertyHoverCallback, PropertyTreeController } from "../frontend/PropertyTreeController";
import { IContextMenuItem, addContextMenu, removeContextMenu } from './ContextMenu';

namespace UI
{
    export enum TreeFlags
    {
        None = 1 << 0,
        IgnoreChildren = 1 << 1,
        HasStar = 1 << 2,
        AlwaysAdd = 1 << 3,
        UsePools = 1 << 4
    }

    export function insertAt(parent: HTMLElement, child: HTMLElement, index: number)
    {
        if (index >= parent.children.length) {
            parent.appendChild(child)
        } else {
            parent.insertBefore(child, parent.children[index])
        }
    }

    export function hasFlag(flags: TreeFlags, test: TreeFlags)
    {
        return (flags & test) === test
    }

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
    usedThisFrame: boolean;
    props: RECORDING.IProperty[];
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

export interface EntityPropertiesBuilderCallbacks
{
    onPropertyHover: IPropertyHoverCallback;
    onPropertyStopHovering: IPropertyHoverCallback;
    onCreateFilterFromProperty: ICreateFilterFromPropCallback;
    onCreateFilterFromEvent: ICreateFilterFromEventCallback;
    onGroupStarred: IGroupStarredCallback;
    onGoToEntity: IGoToEntityCallback;
    isEntityInFrame: IIsEntityInFrame;
}

function havePropGroupsSameLayout(props1: RECORDING.IProperty[], props2: RECORDING.IProperty[])
{
    if (props1.length != props2.length)
        return false;

    let amount = props1.length;
    for (let i=0; i<amount; ++i)
    {
        let prop1 = props1[i];
        let prop2 = props2[i];

        if (prop1.type != prop2.type)
            return false;
        
        if (prop1.flags != prop2.flags)
            return false;

        if (prop1.type == CorePropertyTypes.EntityRef)
        {
            return false;
            let ref1 = prop1 as RECORDING.IEntityRef;
            let ref2 = prop2 as RECORDING.IEntityRef;

            if (ref1.id != ref2.id)
                return false;

            if (ref1.name != ref2.name)
                return false;
        }
        
        if (prop1.type == CorePropertyTypes.Group)
        {
            let group1 = prop1 as RECORDING.IPropertyGroup;
            let group2 = prop2 as RECORDING.IPropertyGroup;

            if (!havePropGroupsSameLayout(group1.value, group2.value))
                return false;
        }

        if (prop1.type == CorePropertyTypes.Path)
        {
            let path1 = prop1 as RECORDING.IPropertyPath;
            let path2 = prop2 as RECORDING.IPropertyPath;

            if (path1.points.length != path2.points.length)
                return false;
        }

        if (RECORDING.isPropertyShape(prop1))
        {
            const emptyName1 = prop1.name.length == 0;
            const emptyName2 = prop2.name.length == 0;

            if (emptyName1 != emptyName2)
                return;
        }
    }

    return true;
}

export default class EntityPropertiesBuilder
{
    private propertyGroups: PropertyTreeGroup[];
    private callbacks: EntityPropertiesBuilderCallbacks;
    collapsedGroups: CollapsedGroupIDsTracker;
    starredGroups: string[];
    private propertyGroupsById: Map<string, PropertyTreeGroup>;
    private areUIPoolsEnabled: boolean;

    private readonly contextMenuItems = [
        { text: "Copy value", icon: "fa-copy", callback: this.onCopyValue.bind(this) },
        { text: "Create filter from property", icon: "fa-plus-square", callback: this.onAddFilter.bind(this) },
    ];

    constructor(callbacks: EntityPropertiesBuilderCallbacks)
    {
        this.propertyGroups = [];
        this.callbacks = callbacks;
        this.collapsedGroups = new CollapsedGroupIDsTracker();
        this.starredGroups = [];
        this.propertyGroupsById = new Map<string, PropertyTreeGroup>();
    }

    setUIPoolsEnabled(areEnabled: boolean)
    {
        this.areUIPoolsEnabled = areEnabled;

        for (let i=0; i<this.propertyGroups.length; ++i)
        {
            this.propertyGroups[i].propertyTreeController.setUIPoolsEnabled(areEnabled);
        }
    }

    buildSinglePropertyTreeBlock(
        treeParent: HTMLElement,
        propertyGroup: RECORDING.IPropertyGroup,
        name: string,
        nameIndex: number,
        treeIndex: number,
        tag: string = null,
        flags: UI.TreeFlags = UI.TreeFlags.None)
    {
        const ignoreChildren = UI.hasFlag(flags, UI.TreeFlags.IgnoreChildren);
        const hasStar = UI.hasFlag(flags, UI.TreeFlags.HasStar);
        const alwaysAdd = UI.hasFlag(flags, UI.TreeFlags.AlwaysAdd);
        const usePools = UI.hasFlag(flags, UI.TreeFlags.UsePools);

        let propsToAdd = propertyGroup.value.filter((property) => {
            const shouldAdd = !ignoreChildren || ignoreChildren && property.type != CorePropertyTypes.Group;
            return shouldAdd;
        });

        const shouldAdd = propsToAdd.length > 0 || alwaysAdd;
        if (!shouldAdd) return false;

        // Further filtering
        propsToAdd = propertyGroup.value.filter((property) => { return !RECORDING.isPropertyHidden(property); });

        // Starring
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

        // TODO: Replace with two maps, otherwise there might be name collision
        const storedGroupID = name + "#%#%" + nameIndex;
        let storedGroup = this.propertyGroupsById.get(storedGroupID);

        if (storedGroup)
        {
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

            propertyTreeController.setUIPoolsEnabled(this.areUIPoolsEnabled);
            
            let newPropertyGroup : PropertyTreeGroup = { 
                title: propertyTree.title,
                propertyTree: propertyTree.tree,
                propertyTreeController: propertyTreeController,
                usedThisFrame: false,
                props: [],
            };
    
            this.propertyGroups.push(newPropertyGroup);
            this.propertyGroupsById.set(storedGroupID, newPropertyGroup);
        }
        
        // Fill group now that is stored
        {
            let storedGroup = this.propertyGroupsById.get(storedGroupID);
            storedGroup.usedThisFrame = true;

            if (!usePools)
                this.propertyGroupsById.clear();

            const sameLayout = havePropGroupsSameLayout(propsToAdd, storedGroup.props);
            storedGroup.props = propsToAdd;

            if (sameLayout && usePools)
            {
                storedGroup.propertyTreeController.setInPropertyTree(storedGroup.propertyTree.root, propsToAdd);
            }
            else
            {
                storedGroup.propertyTreeController.clear();
                storedGroup.propertyTree.clear();

                for (let i=0; i<propsToAdd.length; ++i)
                {
                    storedGroup.propertyTreeController.addToPropertyTree(storedGroup.propertyTree.root, propsToAdd[i]);
                }
            }

            // Check if it is on the correct index
            // Indices are doubled, since we always add title + propertyTree
            let titleIndex = treeIndex * 2;
            let propertyTreeIndex = titleIndex + 1;

            const isInCorrectIndex = treeParent.childElementCount > propertyTreeIndex &&
                treeParent.children[titleIndex] === storedGroup.title &&
                treeParent.children[propertyTreeIndex] === storedGroup.propertyTree.root;

            if (!isInCorrectIndex)
            {
                UI.insertAt(treeParent, storedGroup.title, titleIndex);
                UI.insertAt(treeParent, storedGroup.propertyTree.root, propertyTreeIndex);
            }
        }

        return true;
    }

    buildPropertiesPropertyTrees(propertyTrees: HTMLElement, properties: RECORDING.IProperty[], shouldUsePools: boolean)
    {
        let groupsWithName = new Map<string, number>();
        let treeIndex = 1;
        const extraFlags = shouldUsePools ? UI.TreeFlags.UsePools : UI.TreeFlags.None;

        for (let i=0; i<properties.length; ++i)
        {
            if (properties[i].type == CorePropertyTypes.Group)
            {
                const currentGroup = properties[i] as RECORDING.IPropertyGroup;

                if (currentGroup.name == "special")
                {
                    const name = "Basic Information";
                    const flags = UI.TreeFlags.None | extraFlags;

                    this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, name, increaseNameId(groupsWithName, name), 0, null, flags);
                }
                else
                {
                    const name = "Uncategorized";
                    const flags = UI.TreeFlags.IgnoreChildren | extraFlags;

                    if (this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, name, increaseNameId(groupsWithName, name), treeIndex, null, flags))
                        ++treeIndex
                    
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
                            const flags = UI.TreeFlags.HasStar | extraFlags;

                            if (this.buildSinglePropertyTreeBlock(propertyTrees, childGroup, childGroup.name, increaseNameId(groupsWithName, childGroup.name), treeIndex, null, flags))
                                ++treeIndex;
                        }
                    }
                }
            }
        }
    }

    buildEventsPropertyTree(eventTree: HTMLElement, events: RECORDING.IEvent[], shouldUsePools: boolean)
    {
        const extraFlags = shouldUsePools ? UI.TreeFlags.UsePools : UI.TreeFlags.None;

        let groupsWithName = new Map<string, number>();
        for (let i=0; i<events.length; ++i)
        {
            const propertyGroup = events[i].properties;
            const name = events[i].name;
            const flags = UI.TreeFlags.AlwaysAdd | extraFlags;

            this.buildSinglePropertyTreeBlock(eventTree, propertyGroup, name, increaseNameId(groupsWithName, name), i, events[i].tag, flags);
        }

        // TODO: Clear pending trees
    }

    buildPropertyTree(entity: RECORDING.IEntity, shouldUsePools: boolean)
    {
        // TODO: Instead of destroying everything, reuse/pool the already existing ones!
        let propertyTree = document.getElementById('properties');
        let eventTree = document.getElementById('events');

        for (let group of this.propertyGroups)
        {
            group.usedThisFrame = false;
        }

        if (entity)
        {
            this.buildPropertiesPropertyTrees(propertyTree, entity.properties, shouldUsePools);
            this.buildEventsPropertyTree(eventTree, entity.events, shouldUsePools);
        }

        for (let group of this.propertyGroups)
        {
            if (!group.usedThisFrame)
            {
                group.title.remove();
                group.propertyTree.root.remove();
            }
        }
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

    private onCopyValue(item: HTMLElement)
    {
        const { clipboard } = require('electron');

        const treeElement = item.closest("li[data-tree-value]");
        
        const groups = treeElement.querySelectorAll(".property-group");

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