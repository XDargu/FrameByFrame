import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';
import * as TypeSystem from "../types/typeRegistry";
import { Console, LogChannel, LogLevel } from './ConsoleController';

export interface IGoToEntityCallback {
    (entityId: number) : void;
}

export interface IIsEntityInFrame
{
    (id: number) : boolean
}

export interface IPropertyHoverCallback {
    (propertyId: number) : void;
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

export interface IWrapperBuilderFunc
{
    () : HTMLElement
}

class WrapperPool
{
    pool: HTMLElement[];
    used: HTMLElement[];
    isEnabled: boolean;
    builderfunction: IWrapperBuilderFunc;

    constructor(builderfunction: IWrapperBuilderFunc)
    {
        this.pool = [];
        this.used = [];
        this.isEnabled = true;
        this.builderfunction = builderfunction;
    }

    public get()
    {
        if (!this.isEnabled)
        {
            return this.builderfunction();
        }

        if (this.pool.length == 0)
        {
            let wrapper = this.builderfunction();
            this.used.push(wrapper);
            return wrapper;
        }

        let wrapper = this.pool.pop();
        this.used.push(wrapper);
        return wrapper;
    }

    public freeAll()
    {
        for (let i=0; i<this.used.length; ++i)
        {
            this.pool.push(this.used[i]);
        }
        this.used = [];
    }
}

interface WrapperPools
{
    primitives: WrapperPool,
    groups: WrapperPool,
    names: WrapperPool
}

namespace UI
{
    export function getPrimitiveTypeAsString(value: any, primitiveType: TypeSystem.EPrimitiveType): string {
        switch (primitiveType) {
            case TypeSystem.EPrimitiveType.Number:
                {
                    // TODO: Either check type here, or validate incomming data so this is always valid data
                    return (Math.round(value*100)/100).toString();
                    //return (+value.toFixed(2)).toString();
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

    export function setPrimitiveTypeWrapper(wrapper: HTMLElement, content: string)
    {
        wrapper.innerText = content;
    }

    export function makePrimitiveTypeWrapper(): HTMLElement
    {
        let wrapper = document.createElement("div");
        wrapper.className = "basico-tag basico-big property-primitive";
        return wrapper;
    }

    export function setPropertyGroupWrapper(wrapper: HTMLElement, content: HTMLElement[])
    {
        wrapper.innerHTML = "";
        for (let i=0; i<content.length; ++i) {
            wrapper.appendChild(content[i]);
        }
    }

    export function makePropertyGroupWrapper(): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-group";
        return wrapper;
    }

    export function setPropertyNameWrapper(wrapper: HTMLElement, content: string)
    {
        wrapper.innerText = content;
    }

    export function makePropertyNameWrapper(): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-name";
        return wrapper;
    }

    export function getLayoutOfPrimitiveType(value: any, primitiveType: TypeSystem.EPrimitiveType, uiPools: WrapperPools)
    {
        let wrapper = uiPools.primitives.get();
        UI.setPrimitiveTypeWrapper(wrapper, getPrimitiveTypeAsString(value, primitiveType));
        return wrapper;
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

    wrapperPools: WrapperPools;

    constructor(propertyTree: TREE.TreeControl, callbacks: PropertyTreeControllerCallbacks) {
        this.propertyTree = propertyTree;
        this.typeRegistry = TypeSystem.TypeRegistry.getInstance();
        this.callbacks = callbacks;
        this.wrapperPools = {
            primitives: new WrapperPool(UI.makePrimitiveTypeWrapper),
            groups: new WrapperPool(UI.makePropertyGroupWrapper),
            names: new WrapperPool(UI.makePropertyNameWrapper),
        };
    }

    setUIPoolsEnabled(isEnabled: boolean)
    {
        this.propertyTree.setPoolEnabled(isEnabled);
        this.wrapperPools.primitives.isEnabled = isEnabled;
        this.wrapperPools.groups.isEnabled = isEnabled;
        this.wrapperPools.names.isEnabled = isEnabled;
    }

    addValueToPropertyTree(parent: HTMLElement, name: string, content: HTMLElement[], propertyId: number, uiPools: WrapperPools)
    {
        const nameItem = uiPools.names.get();
        UI.setPropertyNameWrapper(nameItem, name);

        const groupItem = uiPools.groups.get();
        UI.setPropertyGroupWrapper(groupItem, content);

        const elements = [nameItem, groupItem];
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

    addCustomTypeToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, type: TypeSystem.IType, uiPools: WrapperPools) {
        // Complex value type
        let content = [];
        for (const [layoutId, primitiveType] of Object.entries(type.layout)) {
            const customTypeValue = property.value as RECORDING.IPropertyCustomType;
            const value = customTypeValue[layoutId];
            if (value != undefined) {
                content.push(UI.getLayoutOfPrimitiveType(value, primitiveType, uiPools));
            }
        }

        this.addValueToPropertyTree(parent, property.name, content, property.id, uiPools);
    }

    addEntityRef(parent: HTMLElement, name: string, value: RECORDING.IEntityRef, propertyId: number, uiPools: WrapperPools)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.name, TypeSystem.EPrimitiveType.String, uiPools),
            //UI.getLayoutOfPrimitiveType(value.id, TypeSystem.EPrimitiveType.Number), // Don't display id for now, too noisy
            UI.createGoToEntityButton(value.id, this.callbacks.onGoToEntity, this.callbacks.isEntityInFrame(value.id))
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, uiPools);
    }

    addVec3(parent: HTMLElement, name: string, value: RECORDING.IVec3, propertyId: number, uiPools: WrapperPools)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.x, TypeSystem.EPrimitiveType.Number, uiPools),
            UI.getLayoutOfPrimitiveType(value.y, TypeSystem.EPrimitiveType.Number, uiPools),
            UI.getLayoutOfPrimitiveType(value.z, TypeSystem.EPrimitiveType.Number, uiPools)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, uiPools);
    }

    addColor(parent: HTMLElement, name: string, value: RECORDING.IColor, propertyId: number, uiPools: WrapperPools)
    {
        const content =[ 
            UI.getLayoutOfPrimitiveType(value.r, TypeSystem.EPrimitiveType.Number, uiPools),
            UI.getLayoutOfPrimitiveType(value.g, TypeSystem.EPrimitiveType.Number, uiPools),
            UI.getLayoutOfPrimitiveType(value.b, TypeSystem.EPrimitiveType.Number, uiPools),
            UI.getLayoutOfPrimitiveType(value.a, TypeSystem.EPrimitiveType.Number, uiPools)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, uiPools);
    }

    addNumber(parent: HTMLElement, name: string, value: number, propertyId: number, uiPools: WrapperPools)
    {
        const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.Number, uiPools)
        this.addValueToPropertyTree(parent, name, [content], propertyId, uiPools);
    }

    clear()
    {
        this.wrapperPools.primitives.freeAll();
        this.wrapperPools.groups.freeAll();
        this.wrapperPools.names.freeAll();
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
                this.addCustomTypeToPropertyTree(parent, property, type, this.wrapperPools);
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
                this.addEntityRef(parent, property.name, property.value as RECORDING.IEntityRef, property.id, this.wrapperPools);
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
                            this.addVec3(addedItem, "Position", sphere.position, property.id, this.wrapperPools);
                            this.addNumber(addedItem, "Radius", sphere.radius, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Capsule:
                        {
                            const capsule = property as RECORDING.IPropertyCapsule;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", capsule.position, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Direction", capsule.direction, property.id, this.wrapperPools);
                            this.addNumber(addedItem, "Radius", capsule.radius, property.id, this.wrapperPools);
                            this.addNumber(addedItem, "Height", capsule.height, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.AABB:
                        {
                            const aabb = property as RECORDING.IPropertyAABB;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", aabb.position, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Size", aabb.size, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.OOBB:
                        {
                            const oobb = property as RECORDING.IPropertyOOBB;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", oobb.position, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Size", oobb.size, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Forward", oobb.forward, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Up", oobb.up, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Plane:
                        {
                            const plane = property as RECORDING.IPropertyPlane;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", plane.position, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Normal", plane.normal, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Up", plane.up, property.id, this.wrapperPools);
                            this.addNumber(addedItem, "Width", plane.width, property.id, this.wrapperPools);
                            this.addNumber(addedItem, "Length", plane.length, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Line:
                        {
                            const line = property as RECORDING.IPropertyLine;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Origin", line.origin, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Destination", line.destination, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Arrow:
                        {
                            const arrow = property as RECORDING.IPropertyArrow;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Origin", arrow.origin, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "Destination", arrow.destination, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Vector:
                        {
                            const vector = property as RECORDING.IPropertyVector;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Vector", vector.vector, property.id, this.wrapperPools);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Mesh:
                        {
                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            // Ignore vertices/indices
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Path:
                        {
                            const path = property as RECORDING.IPropertyPath;
                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            let idx = 0;
                            for (const point of path.points)
                            {
                                this.addVec3(addedItem, `Point ${idx}`, point, property.id, this.wrapperPools);
                                ++idx;
                            }
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Triangle:
                        {
                            const triangle = property as RECORDING.IPropertyTriangle;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "p1", triangle.p1, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "p2", triangle.p2, property.id, this.wrapperPools);
                            this.addVec3(addedItem, "p3", triangle.p3, property.id, this.wrapperPools);
                            break;
                        }
                    }
                }
            }
            else
            {
                const primitiveType = TypeSystem.buildPrimitiveType(property.type);
                const value = primitiveType ? UI.getPrimitiveTypeAsString(property.value, primitiveType) : property.value as string;
                let wrapper = this.wrapperPools.primitives.get();
                UI.setPrimitiveTypeWrapper(wrapper, value);
                this.addValueToPropertyTree(parent, property.name, [wrapper], property.id, this.wrapperPools);

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
            this.callbacks.onPropertyHover(Number.parseInt(propertyId));
        }
    }

    onPropertyMouseLeave(item: HTMLElement) {
        const propertyId = this.propertyTree.getValueOfItem(item);
        if (propertyId != null)
        {
            this.callbacks.onPropertyStopHovering(Number.parseInt(propertyId));
        }
    }
}
