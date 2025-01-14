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

    export function wrapPropertyIcon(icon: string, color: string = null): HTMLElement
    {
        let wrapper = document.createElement("i");
        wrapper.className = "prop-icon fas fa-" + icon;
        if (color)
            wrapper.style.color = color;
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

    addValueToPropertyTree(parent: HTMLElement, name: string, content: HTMLElement[], propertyId: number, icon: string, iconColor: string = null)
    {
        const elements = [];
        if (icon)
            elements.push(UI.wrapPropertyIcon(icon, iconColor));
        elements.push(UI.wrapPropertyName(name));
        elements.push(UI.wrapPropertyGroup(content));

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

    addTabletoPropertyTree(parent: HTMLElement, name: string, table: HTMLElement, propertyId: number)
    {
        const elements = [table];
        const listItem = this.propertyTree.addItem(parent, elements, {
            value:  propertyId == null ? null : propertyId.toString(),
            selectable: false,
            noHover: true,
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        });
    }

    addCustomTypeToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, type: TypeSystem.IType, icon: string) {
        // Complex value type
        let content = [];
        for (const [layoutId, primitiveType] of Object.entries(type.layout)) {
            const customTypeValue = property.value as RECORDING.IPropertyCustomType;
            const value = customTypeValue[layoutId];
            if (value != undefined) {
                content.push(UI.getLayoutOfPrimitiveType(value, primitiveType));
            }
        }

        this.addValueToPropertyTree(parent, property.name, content, property.id, icon);
    }

    addEntityRef(parent: HTMLElement, name: string, value: RECORDING.IEntityRef, icon: string, propertyId: number)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.name, TypeSystem.EPrimitiveType.String),
            //UI.getLayoutOfPrimitiveType(value.id, TypeSystem.EPrimitiveType.Number), // Don't display id for now, too noisy
            UI.createGoToEntityButton(value.id, this.callbacks.onGoToEntity, this.callbacks.isEntityInFrame(value.id))
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addTable(parent: HTMLElement, name: string, value: RECORDING.IPropertyTable, propertyId: number)
    {
        let gridContainerWrapper = document.createElement("div");
        gridContainerWrapper.className = "property-table-wrapper";

        let gridTitle = document.createElement("div");
        gridTitle.className = "property-table-title";
        gridTitle.innerText = name;

        let gridContainer = document.createElement("div");
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
            let rowGroup = document.createElement("div");
            rowGroup.classList.add("property-table-row-group");
            gridContainer.append(rowGroup);

            for (let item of row)
            {
                let content = UI.getLayoutOfPrimitiveType(item, TypeSystem.EPrimitiveType.String);
                content.classList.add("property-table-row");
                rowGroup.append(content);
            }
        }

        gridContainerWrapper.append(gridTitle, gridContainer);

        this.addTabletoPropertyTree(parent, name, gridContainerWrapper, propertyId);
    }

    addVec3(parent: HTMLElement, name: string, value: RECORDING.IVec3, icon: string, propertyId: number)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.x, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.y, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.z, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addColor(parent: HTMLElement, name: string, value: RECORDING.IColor, icon: string, propertyId: number)
    {
        const content =[ 
            UI.getLayoutOfPrimitiveType(value.r, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.g, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.b, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.a, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addNumber(parent: HTMLElement, name: string, value: number, icon: string, propertyId: number)
    {
        const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.Number)
        this.addValueToPropertyTree(parent, name, [content], propertyId, icon);
    }

    addOptionalResource(parent: HTMLElement, name: string, value: string, icon: string, propertyId: number)
    {
        if (value && value != "")
        {
            const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.String)
            this.addValueToPropertyTree(parent, name, [content], propertyId, icon);
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

        const iconContent = property.icon ? [UI.wrapPropertyIcon(property.icon, property.icolor)] : [];

        const isHidden = property.flags != undefined && ((property.flags & RECORDING.EPropertyFlags.Hidden) != 0);
        if (isHidden) return;

        if (property.type == TypeSystem.CorePropertyTypes.Group) {
            
            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
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
                this.addCustomTypeToPropertyTree(parent, property, type, property.icon);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.Comment)
            {
                let comment = document.createElement("div");
                comment.classList.add("property-comment");
                if (iconContent[0])
                {
                    comment.append(iconContent[0]);
                    if (property.icolor)
                    {
                        comment.style.border = "1px solid " + property.icolor;
                        // Add DOM element with background
                        const background = document.createElement("div");
                        background.classList.add("property-comment-overlay");
                        background.style.backgroundColor = property.icolor;
                        comment.prepend(background);
                    }
                }
                comment.insertAdjacentText("beforeend", property.value as string);

                this.propertyTree.addItem(parent, [comment], {
                    value:  property.id.toString(),
                    selectable: false,
                });
            }
            else if (property.type == TypeSystem.CorePropertyTypes.EntityRef)
            {
                this.addEntityRef(parent, property.name, property.value as RECORDING.IEntityRef, property.icon, property.id);
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

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", sphere.position, "map-marker", property.id);
                            this.addNumber(addedItem, "Radius", sphere.radius, "arrows-alt-h", property.id);
                            this.addOptionalResource(addedItem, "Texture", sphere.texture, "image", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Capsule:
                        {
                            const capsule = property as RECORDING.IPropertyCapsule;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", capsule.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Direction", capsule.direction, "location-arrow", property.id);
                            this.addNumber(addedItem, "Radius", capsule.radius, "arrows-alt-h", property.id);
                            this.addNumber(addedItem, "Height", capsule.height, "arrows-alt-v", property.id);
                            this.addOptionalResource(addedItem, "Texture", capsule.texture, "image", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.AABB:
                        {
                            const aabb = property as RECORDING.IPropertyAABB;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", aabb.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Size", aabb.size, "arrows-alt", property.id);
                            this.addOptionalResource(addedItem, "Texture", aabb.texture, "image", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.OOBB:
                        {
                            const oobb = property as RECORDING.IPropertyOOBB;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", oobb.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Size", oobb.size, "arrows-alt", property.id);
                            this.addVec3(addedItem, "Forward", oobb.forward, "arrow-right", property.id);
                            this.addVec3(addedItem, "Up", oobb.up, "arrow-up", property.id);
                            this.addOptionalResource(addedItem, "Texture", oobb.texture, "image", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Plane:
                        {
                            const plane = property as RECORDING.IPropertyPlane;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", plane.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Normal", plane.normal, "level-up-alt", property.id);
                            this.addVec3(addedItem, "Up", plane.up, "arrow-up", property.id);
                            this.addNumber(addedItem, "Width", plane.width, "arrows-alt-h", property.id);
                            this.addNumber(addedItem, "Length", plane.length, "arrows-alt-v", property.id);
                            this.addOptionalResource(addedItem, "Texture", plane.texture, "image", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Line:
                        {
                            const line = property as RECORDING.IPropertyLine;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Origin", line.origin, "map-marker-alt", property.id);
                            this.addVec3(addedItem, "Destination", line.destination, "flag-checkered", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Arrow:
                        {
                            const arrow = property as RECORDING.IPropertyArrow;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Origin", arrow.origin, "map-marker-alt", property.id);
                            this.addVec3(addedItem, "Destination", arrow.destination, "flag-checkered", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Vector:
                        {
                            const vector = property as RECORDING.IPropertyVector;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Vector", vector.vector, "location-arrow", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Mesh:
                        {
                            const mesh = property as RECORDING.IPropertyMesh;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            // Ignore vertices/indices
                            this.addOptionalResource(addedItem, "Texture", mesh.texture, "image", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Path:
                        {
                            const path = property as RECORDING.IPropertyPath;
                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            let idx = 0;
                            for (const point of path.points)
                            {
                                this.addVec3(addedItem, `Point ${idx}`, point, "map-marker", property.id);
                                ++idx;
                            }
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Triangle:
                        {
                            const triangle = property as RECORDING.IPropertyTriangle;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "p1", triangle.p1, "map-marker", property.id);
                            this.addVec3(addedItem, "p2", triangle.p2, "map-marker", property.id);
                            this.addVec3(addedItem, "p3", triangle.p3, "map-marker", property.id);
                            this.addOptionalResource(addedItem, "Texture", triangle.texture, "image", property.id);
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
                this.addValueToPropertyTree(parent, property.name, [content], property.id, property.icon, property.icolor);

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
