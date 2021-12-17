import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";
import { CorePropertyTypes } from "../types/typeRegistry";
import { TreeControl } from "../ui/tree";
import { ICreateFilterFromPropCallback, IPropertyHoverCallback, PropertyTreeController } from "../frontend/PropertyTreeController";
import { addContextMenu } from './ContextMenu';

interface PropertyTreeGroup
{
    propertyTree: TreeControl;
    propertyTreeController: PropertyTreeController;
}

export interface ICreateFilterFromEventCallback
{
    (name: string, tag: string) : void
}

export interface EntityPropertiesBuilderCallbacks
{
    onPropertyHover: IPropertyHoverCallback;
    onPropertyStopHovering: IPropertyHoverCallback;
    onCreateFilterFromProperty: ICreateFilterFromPropCallback;
    onCreateFilterFromEvent: ICreateFilterFromEventCallback;
}

export default class EntityPropertiesBuilder
{
    private propertyGroups: PropertyTreeGroup[];
    private callbacks: EntityPropertiesBuilderCallbacks;

    private readonly contextMenuItems = [
        { text: "Create filter from property", icon: "fa-plus-square", callback: this.onAddFilter.bind(this) },
    ];

    constructor(callbacks: EntityPropertiesBuilderCallbacks)
    {
        this.propertyGroups = [];
        this.callbacks = callbacks;
    }

    buildSinglePropertyTreeBlock(treeParent: HTMLElement, propertyGroup: RECORDING.IPropertyGroup, name: string, tag: string = null, ignoreChildren: boolean = false, shouldPrepend: boolean = false)
    {
        const propsToAdd = propertyGroup.value.filter((property) => {
            const shouldAdd = !ignoreChildren || ignoreChildren && property.type != CorePropertyTypes.Group;
            return shouldAdd;
        });

        if (propsToAdd.length > 0)
        {
            let titleElement = document.createElement("div");
            titleElement.classList.add("basico-title");

            let nameElement = document.createElement("span");
            nameElement.innerText = name;
            titleElement.append(nameElement);
            
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
                this.callbacks.onPropertyHover,
                this.callbacks.onPropertyStopHovering,
                this.callbacks.onCreateFilterFromProperty
            );

            this.propertyGroups.push({propertyTree: propertyTree, propertyTreeController: propertyTreeController});

            for (let i=0; i<propsToAdd.length; ++i)
            {
                propertyTreeController.addToPropertyTree(propertyTree.root, propsToAdd[i]);
            }

            addContextMenu(treeElement, this.contextMenuItems);
        }
    }

    buildPropertiesPropertyTrees(propertyTrees: HTMLElement, properties: RECORDING.IProperty[])
    {
        for (let i=0; i<properties.length; ++i)
        {
            if (properties[i].type == CorePropertyTypes.Group)
            {
                const currentGroup = properties[i] as RECORDING.IPropertyGroup;

                if (currentGroup.name == "special")
                {
                    this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, "Basic Information", null, false, true);
                }
                else
                {
                    this.buildSinglePropertyTreeBlock(propertyTrees, currentGroup, "Uncategorized", null, true);
                    for (let j=0; j<currentGroup.value.length; ++j)
                    {
                        if (currentGroup.value[j].type == CorePropertyTypes.Group)
                        {
                            const childGroup = currentGroup.value[j] as RECORDING.IPropertyGroup;
                            this.buildSinglePropertyTreeBlock(propertyTrees, childGroup, childGroup.name);
                        }
                    }
                }
            }
        }
    }

    buildEventsPropertyTree(eventTree: HTMLElement, events: RECORDING.IEvent[])
    {
        for (let i=0; i<events.length; ++i)
        {
            const propertyGroup = events[i].properties;
            this.buildSinglePropertyTreeBlock(eventTree, propertyGroup, events[i].name, events[i].tag);
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

    private onAddFilter(item: HTMLElement)
    {
        const treeElement = item.closest("li[data-tree-value]");
        console.log(treeElement)
        const propertyId = treeElement.getAttribute('data-tree-value');
        if (propertyId != null)
        {
            this.callbacks.onCreateFilterFromProperty(Number.parseInt(propertyId));
        }
    }
}