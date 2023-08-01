import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";
import { CorePropertyTypes } from "../types/typeRegistry";
import { TreeControl } from "../ui/tree";
import { ICreateFilterFromPropCallback, IGoToEntityCallback, IIsEntityInFrame, IPropertyHoverCallback, PropertyTreeController } from "../frontend/PropertyTreeController";
import { addContextMenu } from './ContextMenu';

interface PropertyTreeGroup
{
    propertyTree: TreeControl;
    propertyTreeController: PropertyTreeController;
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

export default class EntityPropertiesBuilder
{
    private propertyGroups: PropertyTreeGroup[];
    private callbacks: EntityPropertiesBuilderCallbacks;
    private collapsedGroups: CollapsedGroupIDsTracker;
    private starredGroups: string[];

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

        if (propsToAdd.length > 0 || alwaysAdd)
        {
            let titleElement = document.createElement("div");
            titleElement.classList.add("basico-title");

            let iconElement = document.createElement("i");
            iconElement.className = "fa filter-arrow-icon fa-angle-down";

            let nameElement = document.createElement("span");
            nameElement.innerText = name;
            titleElement.append(iconElement, nameElement);
            
            if (tag)
            {
                let tagElement = document.createElement("div");
                tagElement.innerText = tag;
                tagElement.classList.add("basico-tag");
                tagElement.style.background = Utils.colorFromHash(Utils.hashCode(tag));
                titleElement.append(tagElement);

                const contextMenuItems = [
                    { text: "Create event filter", icon: "fa-plus-square", callback: () => {this.callbacks.onCreateFilterFromEvent(name, tag); } },
                ];
                addContextMenu(titleElement, contextMenuItems);
            }
            
            if (hasStar)
            {
                let starElement = document.createElement("div");
                starElement.classList.add("basico-star");
                let icon = document.createElement("i");
                icon.classList.add("fas", "fa-star");
                if (this.starredGroups.includes(name)) {
                    starElement.classList.add("active");
                }
                starElement.append(icon);
                titleElement.append(starElement);

                starElement.onclick = (e) => {
                    starElement.classList.toggle("active");
                    let isStarred = starElement.classList.contains("active");
                    if (isStarred)
                    {
                        Utils.pushUnique(this.starredGroups, name);
                    }
                    else
                    {
                        this.starredGroups = this.starredGroups.filter(arrayItem => arrayItem !== name);
                    }
                    this.callbacks.onGroupStarred(name, isStarred);
                    e.stopPropagation();
                }
            }

            let treeElement = document.createElement("div");
            treeElement.classList.add("basico-tree");
            let ul = document.createElement("ul");
            treeElement.appendChild(ul);

            if (shouldPrepend)
            {
                treeParent.prepend(titleElement, treeElement);
            }
            else
            {
                treeParent.append(titleElement, treeElement);
            }

            let propertyTree = new TreeControl(treeElement);
            let propertyTreeController = new PropertyTreeController(propertyTree,
                {
                    onPropertyHover: this.callbacks.onPropertyHover,
                    onPropertyStopHovering: this.callbacks.onPropertyStopHovering,
                    onGoToEntity: this.callbacks.onGoToEntity,
                    isEntityInFrame: this.callbacks.isEntityInFrame
                }
            );

            this.propertyGroups.push({propertyTree: propertyTree, propertyTreeController: propertyTreeController});

            for (let i=0; i<propsToAdd.length; ++i)
            {
                propertyTreeController.addToPropertyTree(propertyTree.root, propsToAdd[i]);
            }

            addContextMenu(treeElement, this.contextMenuItems);

            const toggleCollapse = () => {
                treeElement.classList.toggle("hidden");
                titleElement.classList.toggle("collapsed");
                Utils.toggleClasses(iconElement, "fa-angle-down", "fa-angle-right");
            };
            
            if (this.collapsedGroups.isGroupCollapsed(name, nameIndex))
            {
                toggleCollapse();
            }

            titleElement.onclick = () => {
                toggleCollapse();
                const isCollapsed = treeElement.classList.contains("hidden");
                this.collapsedGroups.setGroupCollapsed(name, nameIndex, isCollapsed);
            };
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

    buildPropertyTree(entity: RECORDING.IEntity)
    {
        // TODO: Instead of destroying everything, reuse/pool the already existing ones!
        let propertyTree = document.getElementById('properties');
        let eventTree = document.getElementById('events');

        propertyTree.innerHTML = "";
        eventTree.innerHTML = "";
        this.propertyGroups = [];

        if (entity)
        {
            this.buildPropertiesPropertyTrees(propertyTree, entity.properties);
            this.buildEventsPropertyTree(eventTree, entity.events);
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