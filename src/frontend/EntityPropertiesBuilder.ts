import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";
import * as DOMUtils from '../utils/DOMUtils';
import { CorePropertyTypes } from "../types/typeRegistry";
import { TreeControl } from "../ui/tree";
import { ICreateFilterFromPropCallback, IGetPrevValues, ITogglePropertyHistory, IGoToEntityCallback, IIsEntityInFrame, IOpenResourceCallback, IPropertyHoverCallback, PropertyTreeController, IGetPropertyPath } from "../frontend/PropertyTreeController";
import { IContextMenuItem, addContextMenu, removeContextMenu } from './ContextMenu';
import { Filtering } from '../filters/propertyFilters';

export namespace UI
{
    export enum TreeFlags
    {
        None             = 0,
        HasStar          = 1 << 0,
        IsStarred        = 1 << 1,
        IgnoreChildren   = 1 << 2,
        AlwaysAdd        = 1 << 3,
        ShouldPrepend    = 1 << 4,
        CanOpenNewWindow = 1 << 5,
        CanLock          = 1 << 6,
        IsLocked         = 1 << 7,
    }

    export function HasFlag(flags: TreeFlags, flag: TreeFlags)
    {
        return (flags & flag) != 0;
    }

    function makeTitle(name: string)
    {
        let titleElement = document.createElement("div");
        titleElement.classList.add("basico-title");

        let iconElement = document.createElement("i");
        iconElement.className = "fa filter-arrow-icon fa-angle-down";

        let nameElement = document.createElement("span");
        nameElement.innerText = name;
        nameElement.className = "tree-group-name";
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

    function addTitleEventMenu(titleElement: HTMLElement, name: string, tag: string, propId: number, onCreateFilterFromEvent: ICreateFilterFromEventCallback, onOpenInNewWindow: IOpenNewWindowCallback)
    {
        // TODO: Maybe this can be moved to the main builder class
        const isEvent = tag != null;
        if (isEvent)
        {
            const contextMenuItems = [
                { text: "Create event filter", icon: "fa-plus-square", callback: () => { onCreateFilterFromEvent(name, tag); } },
                { text: "Open in new window", icon: "fa-window-restore", condition: ()=>{ return onOpenInNewWindow != null; }, callback: () => { onOpenInNewWindow(propId); } },
            ];
            addContextMenu(titleElement, contextMenuItems);
        }
        else
        {
            if (onOpenInNewWindow)
            {
                const contextMenuItems = [
                    { text: "Open in new window", icon: "fa-window-restore", callback: () => { onOpenInNewWindow(propId); } },
                ];
                addContextMenu(titleElement, contextMenuItems);
            }
        }
    }

    function makeTitleStar(name: string, isStarred: boolean, onGroupStarred: IGroupStarredCallback)
    {
        let starElement = document.createElement("div");
        starElement.classList.add("basico-star", "star");

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

    function makeTitleIcon(icon: string, color: string)
    {
        let iconElem = document.createElement("i");
        iconElem.classList.add("fas", "fa-" + icon, "title-user-icon", "prop-icon");
        if (color)
            iconElem.style.color = color;
        return iconElem;
    }

    function setTitleIcon(iconElement: HTMLElement, icon: string, color: string)
    {
        iconElement.className = '';
        iconElement.classList.add("fas", "fa-" + icon, "title-user-icon", "prop-icon");
        if (color)
            iconElement.style.color = color;
    }

    function makeTitleLock(name: string, isLocked: boolean, onGroupLocked: IGroupLockedCallback)
    {
        let starElement = document.createElement("div");
        starElement.classList.add("basico-star", "lock");

        let icon = document.createElement("i");
        icon.classList.add("fas", "fa-lock");
        starElement.append(icon);

        setTitleStar(starElement, name, isLocked, onGroupLocked);

        return starElement;
    }

    function setTitleLock(lockElement: HTMLElement, name: string, isLocked: boolean, onGroupLocked: IGroupLockedCallback)
    {
        if (isLocked) {
            if (!lockElement.classList.contains("active")) {
                lockElement.classList.add("active");
            }
        }
        else {
            lockElement.classList.remove("active");
        }

        lockElement.onclick = (e) => {
            lockElement.classList.toggle("active");
            const isStarred = lockElement.classList.contains("active");                
            onGroupLocked(name, isStarred);
            e.stopPropagation();
        }
    }

    function setTitleHeaderColor(titleElement: HTMLElement, nameElement: HTMLElement, color: string)
    {
        const colRGB = Utils.hexToRgb(color);
        const colHSL = Utils.rgbToHsl(colRGB);
        
        // Update header color
        titleElement.style.backgroundColor = `hsl(${colHSL.h}, ${colHSL.s}%, ${12}%)`;

        // Update text color
        nameElement.style.color = `hsl(${colHSL.h}, ${colHSL.s}%, ${90}%)`;
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
        icon: string,
        iconColor: string,
        propId: number,
        flags: UI.TreeFlags,
        onCreateFilterFromEvent: ICreateFilterFromEventCallback,
        onOpenInNewWindow: IOpenNewWindowCallback,
        onGroupStarred: IGroupStarredCallback,
        onGroupLocked: IGroupLockedCallback
    )
    {
        const hasStar = UI.HasFlag(flags, UI.TreeFlags.HasStar);
        const isStarred = UI.HasFlag(flags, UI.TreeFlags.IsStarred);
        const canLock = UI.HasFlag(flags, UI.TreeFlags.CanLock);
        const isLocked = UI.HasFlag(flags, UI.TreeFlags.IsLocked);
        const canOpenNewWindow = UI.HasFlag(flags, UI.TreeFlags.CanOpenNewWindow);

        // Update name
        let nameElement = titleElement.querySelector(".tree-group-name") as HTMLElement;
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
        removeContextMenu(titleElement);
        addTitleEventMenu(titleElement, name, tag, propId, onCreateFilterFromEvent, canOpenNewWindow ? onOpenInNewWindow : null);

        // Update star
        let starElement = titleElement.querySelector(".basico-star.star") as HTMLElement;
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

        // Update lock
        let lockElement = titleElement.querySelector(".basico-star.lock") as HTMLElement;
        if (canLock)
        {
            if (lockElement)
            {
                setTitleLock(lockElement, name, isLocked, onGroupLocked);
            }
            else
            {
                let lockElement = makeTitleLock(name, isLocked, onGroupLocked);
                titleElement.append(lockElement);
            }
            
        }
        else if (lockElement)
        {
            lockElement.remove();
        }

        // Update icon
        let iconElement = titleElement.querySelector(".title-user-icon") as HTMLElement;
        if (icon)
        {
            if (iconElement)
            {
                // Update icon
                setTitleIcon(iconElement, icon, iconColor);
            }
            else
            {
                const arrowIcon = titleElement.querySelector('.filter-arrow-icon');
                const iconElement = makeTitleIcon(icon, iconColor);
                arrowIcon.after(iconElement)
            }
            
        }
        else if (iconElement)
        {
            iconElement.remove();
        }

        // Header color
        if (iconColor)
        {
            setTitleHeaderColor(titleElement, nameElement, iconColor);
        }
        else
        {
            titleElement.style.backgroundColor = ``;
            nameElement.style.color = ``;
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
            DOMUtils.toggleClasses(iconElement, "fa-angle-down", "fa-angle-right");
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
        icon: string,
        iconColor: string,
        propId: number,
        flags: UI.TreeFlags,
        collapsedGroups: CollapsedGroupIDsTracker,
        onCreateFilterFromEvent: ICreateFilterFromEventCallback,
        onOpenNewWindow: IOpenNewWindowCallback,
        onGroupStarred: IGroupStarredCallback,
        onGroupLocked: IGroupLockedCallback,
        contextMenuItems: IContextMenuItem[],
        propertiesWithHistory: string[][])
    {
        const hasStar = UI.HasFlag(flags, UI.TreeFlags.HasStar);
        const isStarred = UI.HasFlag(flags, UI.TreeFlags.IsStarred);
        const canLock = UI.HasFlag(flags, UI.TreeFlags.CanLock);
        const isLocked = UI.HasFlag(flags, UI.TreeFlags.IsLocked);
        const canOpenNewWindow = UI.HasFlag(flags, UI.TreeFlags.CanOpenNewWindow);

        let titleElement = makeTitle(name);
        let iconElement = titleElement.children[0] as HTMLElement;

        if (tag)
        {
            let TagElement = makeTitleTag(name, tag);
            titleElement.append(TagElement);
        }

        addTitleEventMenu(titleElement, name, tag, propId, onCreateFilterFromEvent, canOpenNewWindow ? onOpenNewWindow : null);

        if (hasStar)
        {
            let starElement = makeTitleStar(name, isStarred, onGroupStarred);
            titleElement.append(starElement);
        }

        if (canLock)
        {
            let lockElement = makeTitleLock(name, isLocked, onGroupLocked);
            titleElement.append(lockElement);
        }

        if (icon)
        {
            const arrowIcon = titleElement.querySelector('.filter-arrow-icon');
            const iconElement = makeTitleIcon(icon, iconColor);
            arrowIcon.after(iconElement)
        }

        // Header color
        if (iconColor)
        {
            let nameElement = titleElement.querySelector(".tree-group-name") as HTMLElement;
            setTitleHeaderColor(titleElement, nameElement, iconColor);
        }

        let treeElement = makeTreeElement();
        setPropertyTree(treeElement, name, nameIndex, titleElement, collapsedGroups);

        addContextMenu(treeElement, contextMenuItems);

        return { title: titleElement, tree: new TreeControl(treeElement, propId + "") };
    }
}

interface PropertyTreeGroup
{
    title: HTMLElement;
    propertyTree: TreeControl;
    propertyTreeController: PropertyTreeController;
    order: number;
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

export interface IOpenNewWindowCallback
{
    (propertyId: number) : void
}

export interface IGroupStarredCallback
{
    (name: string, starred: boolean) : void
}

export interface IGroupLockedCallback
{
    (name: string, locked: boolean) : void
}

export interface IGoToShapeCallback {
    (entityId: number) : void;
}

export interface IIsPropertyVisible
{
    (propertyId: number) : boolean
}

export interface IPinTexture {
    (propertyId: number) : void;
}

export interface IAddComment {
    (propertyId: number) : void;
}

export interface EntityPropertiesBuilderCallbacks
{
    onPropertyHover: IPropertyHoverCallback;
    onPropertyStopHovering: IPropertyHoverCallback;
    onCreateFilterFromProperty: ICreateFilterFromPropCallback;
    onCreateFilterFromEvent: ICreateFilterFromEventCallback;
    onOpenInNewWindow: IOpenNewWindowCallback;
    onGroupStarred: IGroupStarredCallback;
    onGoToEntity: IGoToEntityCallback;
    onOpenResource: IOpenResourceCallback;
    onGoToShapePos: IGoToShapeCallback;
    onPinTexture: IPinTexture;
    onAddComment: IAddComment;
    isEntityInFrame: IIsEntityInFrame;
    isPropertyVisible: IIsPropertyVisible;
    onGroupLocked: IGroupLockedCallback;
    onTogglePropertyHistory: ITogglePropertyHistory;
    getPrevValues: IGetPrevValues;
    getPropertyPath: IGetPropertyPath;
}

export default class EntityPropertiesBuilder
{
    private propertyGroups: PropertyTreeGroup[];
    private activePropertyGroups: PropertyTreeGroup[];
    private callbacks: EntityPropertiesBuilderCallbacks;
    collapsedGroups: CollapsedGroupIDsTracker;
    starredGroups: string[];
    private propertyGroupsById: Map<string, PropertyTreeGroup>;
    private isDebuggingEnabled: boolean = false;
    private areOptimizationsEnabled: boolean = false;

    private readonly contextMenuItems: IContextMenuItem[] = [
        { text: "Copy value", icon: "fa-copy", callback: this.onCopyValue.bind(this) },
        { text: "Create filter from property", icon: "fa-plus-square", callback: this.onAddFilter.bind(this) },
        { text: "Go to Shape", icon: "fa-arrow-circle-right", callback: this.onGoToShape.bind(this), condition: this.isPropertyVisible.bind(this) },
        { text: "Pin Texture", icon: "fa-image", callback: this.onPinTexture.bind(this), condition: this.isPropertyTexture.bind(this) },
        { text: "Add Comment", icon: "fa-comment", callback: this.onAddComment.bind(this) },
    ];

    constructor(callbacks: EntityPropertiesBuilderCallbacks)
    {
        this.propertyGroups = [];
        this.activePropertyGroups = [];
        this.callbacks = callbacks;
        this.collapsedGroups = new CollapsedGroupIDsTracker();
        this.starredGroups = [];
        this.propertyGroupsById = new Map<string, PropertyTreeGroup>();
    }

    setDebugEnabled(enabled: boolean)
    {
        this.isDebuggingEnabled = enabled;
    }

    setOptimizationsEnabled(enabled: boolean)
    {
        this.areOptimizationsEnabled = enabled;
    }

    buildSinglePropertyTreeBlock(
        treeParent: HTMLElement,
        propertyGroup: RECORDING.IPropertyGroup,
        name: string,
        nameIndex: number,
        filter: string,
        propertiesWithHistory: string[][],
        tag: string = null,
        flags: UI.TreeFlags = UI.TreeFlags.None,
        order: number)
    {
        const ignoreChildren = UI.HasFlag(flags, UI.TreeFlags.IgnoreChildren);
        const alwaysAdd = UI.HasFlag(flags, UI.TreeFlags.AlwaysAdd);
        const shouldPrepend = UI.HasFlag(flags, UI.TreeFlags.ShouldPrepend);
        
        const propsToAdd = propertyGroup.value.filter((property) => {
            const shouldAdd = !ignoreChildren || ignoreChildren && property.type != CorePropertyTypes.Group;
            return shouldAdd;
        });

        const shouldAdd = propsToAdd.length > 0 || alwaysAdd;
        if (!shouldAdd) return false;

        const propsFiltered = propsToAdd.filter((property) => {
            return Filtering.filterProperty(filter, property);
        });

        if (propsFiltered.length == 0) return false;

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

        const extraFlags = isStarred ? UI.TreeFlags.IsStarred : UI.TreeFlags.None;

        if (storedGroup)
        {
            // For now, clear and re-build tree
            //storedGroup.propertyTree.clear();
            storedGroup.propertyTree.rootValue = propertyGroup.id + "";

            UI.updatePropertyTreeTitle(
                storedGroup.title,
                name,
                tag,
                propertyGroup.icon,
                propertyGroup.icolor,
                propertyGroup.id,
                flags | extraFlags,
                this.callbacks.onCreateFilterFromEvent,
                this.callbacks.onOpenInNewWindow,
                onStarredCallback,
                this.callbacks.onGroupLocked);
            UI.setPropertyTree(storedGroup.propertyTree.root, name, nameIndex, storedGroup.title, this.collapsedGroups);
        }
        else
        {
            let propertyTree = UI.makePropertyTree(
                name,
                nameIndex,
                tag,
                propertyGroup.icon,
                propertyGroup.icolor,
                propertyGroup.id,
                flags | extraFlags,
                this.collapsedGroups,
                this.callbacks.onCreateFilterFromEvent,
                this.callbacks.onOpenInNewWindow,
                onStarredCallback,
                this.callbacks.onGroupLocked,
                this.contextMenuItems,
                propertiesWithHistory
            );

            let propertyTreeController = new PropertyTreeController(propertyTree.tree,
                {
                    onPropertyHover: this.callbacks.onPropertyHover,
                    onPropertyStopHovering: this.callbacks.onPropertyStopHovering,
                    onGoToEntity: this.callbacks.onGoToEntity,
                    onOpenResource: this.callbacks.onOpenResource,
                    isEntityInFrame: this.callbacks.isEntityInFrame,
                    onTogglePropertyHistory: this.callbacks.onTogglePropertyHistory,
                    getPrevValues: this.callbacks.getPrevValues,
                    getPropertyPath: this.callbacks.getPropertyPath,
                }
            );
            
            let newPropertyGroup = { 
                title: propertyTree.title,
                propertyTree: propertyTree.tree,
                propertyTreeController: propertyTreeController,
                order: order
            };
    
            this.propertyGroups.push(newPropertyGroup);
            this.propertyGroupsById.set(name + nameIndex, newPropertyGroup);
        }
        
        // Fill group now that is stored
        {
            let storedGroup = this.propertyGroupsById.get(name + nameIndex);
            storedGroup.order = order;

            let sortedElements: HTMLElement[] = [];

            for (let i=0; i<propsToAdd.length; ++i)
            {
                const child = storedGroup.propertyTreeController.addToPropertyTree(storedGroup.propertyTree.root, propsToAdd[i], filter, propertiesWithHistory, false, this.areOptimizationsEnabled, this.isDebuggingEnabled);

                if (child)
                {
                    sortedElements.push(child);
                }
            }

            // Delete all non-visited nodes, mark all visited as non-visited
            storedGroup.propertyTreeController.clearVisited();

            if (!this.areOptimizationsEnabled)
            {
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

            this.activePropertyGroups.push(storedGroup);

            // Sort properties
            if (this.areOptimizationsEnabled)
            {
                let targetList = storedGroup.propertyTree.root.querySelector("ul");
                DOMUtils.ensureElementsCorrectOrder(targetList, sortedElements);
            }
        }

        return true;
    }

    buildPropertiesPropertyTrees(propertyTrees: HTMLElement, properties: RECORDING.IProperty[], filter: string, propertiesWithHistory: string[][])
    {
        let groupsWithName = new Map<string, number>();

        let order = 2; // 0 is global data, 1 is basic information

        for (let i=0; i<properties.length; ++i)
        {
            if (properties[i].type == CorePropertyTypes.Group)
            {
                const currentGroup = properties[i] as RECORDING.IPropertyGroup;

                if (currentGroup.name == "special")
                {
                    // Temporary icon assignment
                    if (currentGroup.value[0])
                        currentGroup.value[0].icon = "address-card";
                    if (currentGroup.value[1])
                        currentGroup.value[1].icon = "map-marker";
                    if (currentGroup.value[2])
                        currentGroup.value[2].icon = "arrow-up";
                    if (currentGroup.value[3])
                        currentGroup.value[3].icon = "arrow-right";
                    if (currentGroup.value[4])
                        currentGroup.value[4].icon = "fingerprint";

                    const name = "Basic Information";
                    this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, name, increaseNameId(groupsWithName, name), filter, propertiesWithHistory, null, UI.TreeFlags.ShouldPrepend | UI.TreeFlags.CanOpenNewWindow, 1);

                    if (currentGroup.value[0])
                        delete currentGroup.value[0].icon;
                    if (currentGroup.value[1])
                        delete currentGroup.value[1].icon;
                    if (currentGroup.value[2])
                        delete currentGroup.value[2].icon;
                    if (currentGroup.value[3])
                        delete currentGroup.value[3].icon;
                    if (currentGroup.value[4])
                        delete currentGroup.value[4].icon;
                }
                else
                {
                    const name = "Uncategorized";

                    if (this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, name, increaseNameId(groupsWithName, name), filter, propertiesWithHistory, null, UI.TreeFlags.IgnoreChildren, order))
                        order++;

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
                            if (this.buildSinglePropertyTreeBlock(propertyTrees, childGroup, childGroup.name, increaseNameId(groupsWithName, childGroup.name), filter, propertiesWithHistory, null, UI.TreeFlags.HasStar | UI.TreeFlags.CanOpenNewWindow, order))
                                order++;
                        }
                    }
                }
            }
        }
    }

    buildEventsPropertyTree(eventTree: HTMLElement, events: RECORDING.IEvent[], filter: string, propertiesWithHistory: string[][])
    {
        let groupsWithName = new Map<string, number>();
        for (let i=0; i<events.length; ++i)
        {
            const propertyGroup = events[i].properties;
            const name = events[i].name;

            this.buildSinglePropertyTreeBlock(eventTree, propertyGroup, name, increaseNameId(groupsWithName, name), filter, propertiesWithHistory, events[i].tag, UI.TreeFlags.AlwaysAdd | UI.TreeFlags.CanOpenNewWindow, i);
        }
    }

    buildGlobalData(propertyTrees: HTMLElement, globalData: PropertyTreeGlobalData, filter: string, propertiesWithHistory: string[][])
    {
        let groupsWithName = new Map<string, number>();

        const globalDataGroup : RECORDING.IPropertyGroup = {
            type: CorePropertyTypes.Group,
            name: "Frame Data",
            value: [
                {
                    type: CorePropertyTypes.Number,
                    name: "Elapsed Time",
                    value: globalData.elapsedTime,
                    id: Number.MAX_SAFE_INTEGER - 2,
                    icon: "clock"
                },
                {
                    type: CorePropertyTypes.Number,
                    name: "Server Time",
                    value: globalData.serverTime,
                    id: Number.MAX_SAFE_INTEGER - 3,
                    icon: "clock"
                }
            ],
            id: Number.MAX_SAFE_INTEGER - 1
        };

        this.buildSinglePropertyTreeBlock(propertyTrees, globalDataGroup, "Frame Data", increaseNameId(groupsWithName, "Frame Data"), filter, propertiesWithHistory, null, UI.TreeFlags.ShouldPrepend, 0);
    }


    buildPropertyTree(entity: RECORDING.IEntity, globalData: PropertyTreeGlobalData, filter: string, propertiesWithHistory: string[][])
    {
        // TODO: Instead of destroying everything, reuse/pool the already existing ones!
        let propertyTree = document.getElementById('properties');
        let eventTree = document.getElementById('events');

        const oldActiveGroups = this.activePropertyGroups.slice();
        this.activePropertyGroups = [];

        this.buildGlobalData(propertyTree, globalData, filter, propertiesWithHistory);

        if (entity)
        {
            this.buildPropertiesPropertyTrees(propertyTree, entity.properties, filter, propertiesWithHistory);

            const propertyGroups = this.activePropertyGroups.slice();
            let pairsWithIndices: { first: HTMLElement, second: HTMLElement, index: number }[] = [];
            for (let activeGroup of propertyGroups)
            {
                pairsWithIndices.push({
                    first: activeGroup.title,
                    second: activeGroup.propertyTree.root,
                    index: activeGroup.order
                });
            }
            DOMUtils.ensurePairsCorrectOrder(propertyTree, pairsWithIndices);

            this.buildEventsPropertyTree(eventTree, entity.events, filter, propertiesWithHistory);

            const eventGroups = this.activePropertyGroups.filter((group) => { 
                return !propertyGroups.find((propGroup) => { return propGroup == group; });
            });
            pairsWithIndices = [];
            for (let activeGroup of eventGroups)
            {
                pairsWithIndices.push({
                    first: activeGroup.title,
                    second: activeGroup.propertyTree.root,
                    index: activeGroup.order
                });
            }
            DOMUtils.ensurePairsCorrectOrder(eventTree, pairsWithIndices);
        }

        for (let oldActiveGroup of oldActiveGroups)
        {
            const found = this.activePropertyGroups.find((group) => { return oldActiveGroup == group; });
            if (!found)
            {
                oldActiveGroup.title.remove();
                oldActiveGroup.propertyTree.root.remove();
            }
        }
    }

    findItemWithValue(value: string)
    {
        for (let i=0; i<this.activePropertyGroups.length; ++i)
        {
            const tree = this.activePropertyGroups[i].propertyTree;

            if (tree.rootValue == value)
                return tree.root;

            const item = tree.getItemWithValue(value);
            if (item)
            {
                return item;
            }
        }

        return null;
    }

    private onAddFilter(item: HTMLElement)
    {
        const subIndexElement = item.closest("div[data-tree-subvalue]");
        const treeElement = item.closest("li[data-tree-value]");
        const propertyId = treeElement.getAttribute('data-tree-value');
        const subIndex = subIndexElement?.getAttribute('data-tree-subvalue');
        if (propertyId != null)
        {
            this.callbacks.onCreateFilterFromProperty(Number.parseInt(propertyId), subIndex ? Number.parseInt(subIndex) : null);
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

    private onPinTexture(item: HTMLElement)
    {
        const treeElement = item.closest("li[data-tree-value]");
        if (treeElement)
        {
            const propertyId = treeElement.getAttribute('data-tree-value');
            if (propertyId != null)
            {
                this.callbacks.onPinTexture(Number.parseInt(propertyId));
            }
        }
    }

    private onAddComment(item: HTMLElement)
    {
        const treeElement = item.closest("li[data-tree-value]");
        if (treeElement)
        {
            const propertyId = treeElement.getAttribute('data-tree-value');
            if (propertyId != null)
            {
                this.callbacks.onAddComment(Number.parseInt(propertyId));
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

    private isPropertyTexture(item: HTMLElement)
    {
        // Mega hack, fix!
        const treeElement = item.closest("li[data-tree-value]");
        if (treeElement)
        {
            console.log(treeElement);
            const propName = treeElement.querySelector(".property-name");
            if (propName)
            {
                return propName.innerHTML == "Texture";
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