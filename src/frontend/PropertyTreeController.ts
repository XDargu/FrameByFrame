import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';
import * as TypeSystem from "../types/typeRegistry";
import { Console, LogChannel, LogLevel } from './ConsoleController';
import { ResourcePreview } from './ResourcePreview';

export interface IGoToEntityCallback {
    (entityId: number) : void;
}

export interface IIsEntityInFrame
{
    (id: number) : boolean
}

export interface IPropertyHoverCallback {
    (propertyId: number, subIndex: number) : void;
}

export interface ICreateFilterFromPropCallback {
    (propertyId: number) : void;
}

interface PropertyTreeControllerCallbacks {
    onPropertyHover: IPropertyHoverCallback;
    onPropertyStopHovering: IPropertyHoverCallback;
    onGoToEntity: IGoToEntityCallback;
    isEntityInFrame: IIsEntityInFrame;
}

namespace UI
{
    export function getPrimitiveTypeAsString(value: any, primitiveType: TypeSystem.EPrimitiveType): string {
        switch (primitiveType) {
            case TypeSystem.EPrimitiveType.Number:
                {
                    // TODO: Either check type here, or validate incomming data so this is always valid data
                    return (+value.toFixed(2)).toString();
                }
            case TypeSystem.EPrimitiveType.String:
                {
                    return value;
                }
            case TypeSystem.EPrimitiveType.Boolean:
                {
                    return value;
                }
        }
    }

    export function wrapPrimitiveType(content: string): HTMLElement
    {
        let wrapper = document.createElement("div");
        wrapper.className = "basico-tag basico-big property-primitive";
        wrapper.innerText = content;
        return wrapper;
    }

    export function wrapPropertyGroup(content: HTMLElement[]): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-group";
        for (let i=0; i<content.length; ++i) {
            wrapper.appendChild(content[i]);
        }
        return wrapper;
    }

    export function wrapPropertyName(content: string): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-name";
        wrapper.innerText = content;
        return wrapper;
    }

    export function getLayoutOfPrimitiveType(value: any, primitiveType: TypeSystem.EPrimitiveType)
    {
        return wrapPrimitiveType(getPrimitiveTypeAsString(value, primitiveType));
    }

    export function createGoToEntityButton(id: number, callback: IGoToEntityCallback, isEnabled: boolean) : HTMLButtonElement
    {
        let resetButton: HTMLButtonElement = document.createElement("button");
        resetButton.className = "basico-button basico-small";

        let icon: HTMLElement = document.createElement("i");
        icon.className = "fa fa-arrow-circle-right";
        resetButton.append(icon);

        if (isEnabled) {
            resetButton.title = "Go to entity";
            resetButton.onclick = () => { callback(id); };
        }
        else {
            resetButton.title = "Entity unavailable";
            resetButton.disabled = true;
        }

        return resetButton;
    }
}

export class PropertyTreeController {
    propertyTree: TREE.TreeControl;
    typeRegistry: TypeSystem.TypeRegistry;

    callbacks: PropertyTreeControllerCallbacks;

    constructor(propertyTree: TREE.TreeControl, callbacks: PropertyTreeControllerCallbacks) {
        this.propertyTree = propertyTree;
        this.typeRegistry = TypeSystem.TypeRegistry.getInstance();
        this.callbacks = callbacks;
    }

    addValueToPropertyTree(parent: HTMLElement, name: string, content: HTMLElement[], propertyId: number = null)
    {
        const elements = [UI.wrapPropertyName(name), UI.wrapPropertyGroup(content)];
        const listItem = this.propertyTree.addItem(parent, elements, {
            value:  propertyId == null ? null : propertyId.toString(),
            selectable: false,
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        });
    }

    addTabletoPropertyTree(parent: HTMLElement, name: string, table: HTMLElement, propertyId: number = null)
    {
        const elements = [table];
        const listItem = this.propertyTree.addItem(parent, elements, {
            value:  propertyId == null ? null : propertyId.toString(),
            selectable: false,
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        });
    }

    addCustomTypeToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, type: TypeSystem.IType) {
        // Complex value type
        let content = [];
        for (const [layoutId, primitiveType] of Object.entries(type.layout)) {
            const customTypeValue = property.value as RECORDING.IPropertyCustomType;
            const value = customTypeValue[layoutId];
            if (value != undefined) {
                content.push(UI.getLayoutOfPrimitiveType(value, primitiveType));
            }
        }

        this.addValueToPropertyTree(parent, property.name, content, property.id);
    }

    addEntityRef(parent: HTMLElement, name: string, value: RECORDING.IEntityRef, propertyId: number = null)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.name, TypeSystem.EPrimitiveType.String),
            //UI.getLayoutOfPrimitiveType(value.id, TypeSystem.EPrimitiveType.Number), // Don't display id for now, too noisy
            UI.createGoToEntityButton(value.id, this.callbacks.onGoToEntity, this.callbacks.isEntityInFrame(value.id))
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId);
    }

    addTable(parent: HTMLElement, name: string, value: RECORDING.IPropertyTable, propertyId: number = null)
    {
        let gridContainer = document.createElement("table");
        gridContainer.className = "property-table";

        gridContainer.style.gridTemplateColumns = "auto ".repeat(value.header.length);

        for (let item of value.header)
        {
            let content = UI.getLayoutOfPrimitiveType(item, TypeSystem.EPrimitiveType.String);
            content.classList.add("property-table-row", "property-table-header");
            gridContainer.append(content);
        }
        for (let row of value.rows)
        {
            for (let item of row)
            {
                let content = UI.getLayoutOfPrimitiveType(item, TypeSystem.EPrimitiveType.String);
                content.classList.add("property-table-row");
                gridContainer.append(content);
            }
        }

        this.addTabletoPropertyTree(parent, name, gridContainer, propertyId);
    }

    addVec3(parent: HTMLElement, name: string, value: RECORDING.IVec3, propertyId: number = null)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.x, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.y, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.z, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId);
    }

    addColor(parent: HTMLElement, name: string, value: RECORDING.IColor, propertyId: number = null)
    {
        const content =[ 
            UI.getLayoutOfPrimitiveType(value.r, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.g, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.b, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.a, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId);
    }

    addNumber(parent: HTMLElement, name: string, value: number, propertyId: number = null)
    {
        const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.Number)
        this.addValueToPropertyTree(parent, name, [content], propertyId);
    }

    addOptionalResource(parent: HTMLElement, name: string, value: string, propertyId: number = null)
    {
        if (value && value != "")
        {
            const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.String)
            this.addValueToPropertyTree(parent, name, [content], propertyId);
            content.onmouseenter = (ev) => {
                ResourcePreview.Instance().showAtPosition(ev.pageX, ev.pageY, value);
            };
            content.onmousemove = (ev) => {
                ResourcePreview.Instance().setPosition(ev.pageX, ev.pageY);
            };
            content.onmouseout = () => {
                ResourcePreview.Instance().hide();
            }
        }
    }

    addToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty)
    {
        const treeItemOptions : TREE.ITreeItemOptions = {
            text: property.name,
            value:  property.id.toString(),
            selectable: false,
            collapsed: property.flags != undefined && ((property.flags & RECORDING.EPropertyFlags.Collapsed) != 0),
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        };

        const isHidden = property.flags != undefined && ((property.flags & RECORDING.EPropertyFlags.Hidden) != 0);
        if (isHidden) return;

        if (property.type == TypeSystem.CorePropertyTypes.Group) {
            
            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
            const propertyGroup = property as RECORDING.IPropertyGroup;

            for (let i = 0; i < propertyGroup.value.length; ++i) {
                this.addToPropertyTree(addedItem, propertyGroup.value[i]);
            }
        }
        // Find type
        else {
            const type = this.typeRegistry.findType(property.type);
            if (type)
            {
                this.addCustomTypeToPropertyTree(parent, property, type);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.Comment)
            {
                let comment = document.createElement("div");
                comment.classList.add("property-comment");
                comment.textContent = property.value as string;

                this.propertyTree.addItem(parent, [comment], {
                    value:  property.id.toString(),
                    selectable: false,
                });
            }
            else if (property.type == TypeSystem.CorePropertyTypes.EntityRef)
            {
                this.addEntityRef(parent, property.name, property.value as RECORDING.IEntityRef, property.id);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.Table)
            {
                this.addTable(parent, property.name, property.value as RECORDING.IPropertyTable, property.id);
            }
            else if (RECORDING.isPropertyShape(property))
            {
                if (property.name.length > 0)
                {
                    switch(property.type)
                    {
                        case TypeSystem.CorePropertyTypes.Sphere:
                        {
                            const sphere = property as RECORDING.IPropertySphere;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", sphere.position, property.id);
                            this.addNumber(addedItem, "Radius", sphere.radius, property.id);
                            this.addOptionalResource(addedItem, "Texture", sphere.texture, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Capsule:
                        {
                            const capsule = property as RECORDING.IPropertyCapsule;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", capsule.position, property.id);
                            this.addVec3(addedItem, "Direction", capsule.direction, property.id);
                            this.addNumber(addedItem, "Radius", capsule.radius, property.id);
                            this.addNumber(addedItem, "Height", capsule.height, property.id);
                            this.addOptionalResource(addedItem, "Texture", capsule.texture, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.AABB:
                        {
                            const aabb = property as RECORDING.IPropertyAABB;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", aabb.position, property.id);
                            this.addVec3(addedItem, "Size", aabb.size, property.id);
                            this.addOptionalResource(addedItem, "Texture", aabb.texture, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.OOBB:
                        {
                            const oobb = property as RECORDING.IPropertyOOBB;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", oobb.position, property.id);
                            this.addVec3(addedItem, "Size", oobb.size, property.id);
                            this.addVec3(addedItem, "Forward", oobb.forward, property.id);
                            this.addVec3(addedItem, "Up", oobb.up, property.id);
                            this.addOptionalResource(addedItem, "Texture", oobb.texture, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Plane:
                        {
                            const plane = property as RECORDING.IPropertyPlane;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", plane.position, property.id);
                            this.addVec3(addedItem, "Normal", plane.normal, property.id);
                            this.addVec3(addedItem, "Up", plane.up, property.id);
                            this.addNumber(addedItem, "Width", plane.width, property.id);
                            this.addNumber(addedItem, "Length", plane.length, property.id);
                            this.addOptionalResource(addedItem, "Texture", plane.texture, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Line:
                        {
                            const line = property as RECORDING.IPropertyLine;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Origin", line.origin, property.id);
                            this.addVec3(addedItem, "Destination", line.destination, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Arrow:
                        {
                            const arrow = property as RECORDING.IPropertyArrow;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Origin", arrow.origin, property.id);
                            this.addVec3(addedItem, "Destination", arrow.destination, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Vector:
                        {
                            const vector = property as RECORDING.IPropertyVector;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Vector", vector.vector, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Mesh:
                        {
                            const mesh = property as RECORDING.IPropertyMesh;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            // Ignore vertices/indices
                            this.addOptionalResource(addedItem, "Texture", mesh.texture, property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Path:
                        {
                            const path = property as RECORDING.IPropertyPath;
                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            let idx = 0;
                            for (const point of path.points)
                            {
                                this.addVec3(addedItem, `Point ${idx}`, point, property.id);
                                ++idx;
                            }
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Triangle:
                        {
                            const triangle = property as RECORDING.IPropertyTriangle;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "p1", triangle.p1, property.id);
                            this.addVec3(addedItem, "p2", triangle.p2, property.id);
                            this.addVec3(addedItem, "p3", triangle.p3, property.id);
                            this.addOptionalResource(addedItem, "Texture", triangle.texture, property.id);
                            break;
                        }
                    }
                }
            }
            else
            {
                const primitiveType = TypeSystem.buildPrimitiveType(property.type);
                const value = primitiveType ? UI.getPrimitiveTypeAsString(property.value, primitiveType) : property.value as string;
                const content = UI.wrapPrimitiveType(value);
                this.addValueToPropertyTree(parent, property.name, [content], property.id);

                if (primitiveType == undefined)
                {
                    Console.log(LogLevel.Error, LogChannel.Default, `Unknown property type: ${property.type} in property ${property.name}`);
                }
            }
        }
    }

    onPropertyMouseEnter(item: HTMLElement) {
        const propertyId = this.propertyTree.getValueOfItem(item);
        if (propertyId != null)
        {
            const propertyElement = this.propertyTree.getItemWithValue(propertyId);
            let subIndex = -1;

            if (item != propertyElement)
            {
                let current = item;
                while (current.parentElement?.parentElement != propertyElement && current.parentElement != null)
                {
                    current = current.parentElement;
                }

                if (current.parentElement?.parentElement == propertyElement)
                {
                    for (let i=0; i<current.parentElement.children.length; ++i)
                    {
                        if (current.parentElement.children[i] == current)
                        {
                            subIndex = i;
                            break;
                        }
                    }
                }
            }

            this.callbacks.onPropertyHover(Number.parseInt(propertyId), subIndex);
        }
    }

    onPropertyMouseLeave(item: HTMLElement) {
        const propertyId = this.propertyTree.getValueOfItem(item);
        if (propertyId != null)
        {
            this.callbacks.onPropertyStopHovering(Number.parseInt(propertyId), -1);
        }
    }

    
}
