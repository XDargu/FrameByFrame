import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';
import * as TypeSystem from "../types/typeRegistry";

export class PropertyTreeController {
    propertyTree: TREE.TreeControl;
    typeRegistry: TypeSystem.TypeRegistry;

    constructor(propertyTree: TREE.TreeControl) {
        this.propertyTree = propertyTree;
        this.typeRegistry = TypeSystem.TypeRegistry.getInstance();
    }

    getPrimitiveTypeAsString(value: any, primitiveType: TypeSystem.EPrimitiveType): string {
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

    wrapPrimitiveType(content: string): HTMLElement
    {
        let wrapper = document.createElement("div");
        wrapper.className = "basico-tag basico-big property-primitive";
        wrapper.innerText = content;
        return wrapper;
    }

    wrapPropertyGroup(content: HTMLElement[]): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-group";
        for (let i=0; i<content.length; ++i) {
            wrapper.appendChild(content[i]);
        }
        return wrapper;
    }

    wrapPropertyName(content: string): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-name";
        wrapper.innerText = content;
        return wrapper;
    }

    getLayoutOfPrimitiveType(value: any, primitiveType: TypeSystem.EPrimitiveType)
    {
        return this.wrapPrimitiveType(this.getPrimitiveTypeAsString(value, TypeSystem.EPrimitiveType.Number));
    }

    addValueToPropertyTree(parent: HTMLElement, name: string, content: HTMLElement[], propertyId: number = null)
    {
        const elements = [this.wrapPropertyName(name), this.wrapPropertyGroup(content)];
        this.propertyTree.addItem(parent, elements, {
            value:  propertyId == null ? null : propertyId.toString(),
            selectable: false,
        });
    }

    addCustomTypeToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, type: TypeSystem.IType) {
        // Complex value type
        let content = [];
        for (const [layoutId, primitiveType] of Object.entries(type.layout)) {
            const customTypeValue = property.value as RECORDING.IPropertyCustomType;
            const value = customTypeValue[layoutId];
            if (value) {
                content.push(this.getLayoutOfPrimitiveType(value, primitiveType));
            }
        }

        this.addValueToPropertyTree(parent, property.name, content, property.id);
    }

    addVec3(parent: HTMLElement, name: string, value: RECORDING.IVec3, propertyId: number = null)
    {
        const content = [
            this.getLayoutOfPrimitiveType(value.x, TypeSystem.EPrimitiveType.Number),
            this.getLayoutOfPrimitiveType(value.y, TypeSystem.EPrimitiveType.Number),
            this.getLayoutOfPrimitiveType(value.z, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId);
    }

    addColor(parent: HTMLElement, name: string, value: RECORDING.IColor, propertyId: number = null)
    {
        const content =[ 
            this.getLayoutOfPrimitiveType(value.r, TypeSystem.EPrimitiveType.Number),
            this.getLayoutOfPrimitiveType(value.g, TypeSystem.EPrimitiveType.Number),
            this.getLayoutOfPrimitiveType(value.b, TypeSystem.EPrimitiveType.Number),
            this.getLayoutOfPrimitiveType(value.a, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId);
    }

    addNumber(parent: HTMLElement, name: string, value: number, propertyId: number = null)
    {
        const content = this.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.Number)
        this.addValueToPropertyTree(parent, name, [content], propertyId);
    }

    addToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty)
    {
        const treeItemOptions = {
            text: property.name,
            value:  property.id.toString(),
            selectable: false,
        };

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
                            this.addVec3(addedItem, "Position", sphere.position);
                            this.addNumber(addedItem, "Radius", sphere.radius);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Capsule:
                        {
                            const capsule = property as RECORDING.IPropertyCapsule;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", capsule.position);
                            this.addVec3(addedItem, "Direction", capsule.direction);
                            this.addNumber(addedItem, "Radius", capsule.radius);
                            this.addNumber(addedItem, "Height", capsule.height);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.AABB:
                        {
                            const aabb = property as RECORDING.IPropertyAABB;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", aabb.position);
                            this.addVec3(addedItem, "Size", aabb.size);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.OOBB:
                        {
                            const oobb = property as RECORDING.IPropertyOOBB;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", oobb.position);
                            this.addVec3(addedItem, "Size", oobb.size);
                            this.addVec3(addedItem, "Forward", oobb.forward);
                            this.addVec3(addedItem, "Up", oobb.up);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Plane:
                        {
                            const plane = property as RECORDING.IPropertyPlane;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Position", plane.position);
                            this.addVec3(addedItem, "Normal", plane.normal);
                            this.addVec3(addedItem, "Up", plane.up);
                            this.addNumber(addedItem, "Width", plane.width);
                            this.addNumber(addedItem, "Length", plane.length);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Line:
                        {
                            const line = property as RECORDING.IPropertyLine;

                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            this.addVec3(addedItem, "Origin", line.origin);
                            this.addVec3(addedItem, "Destination", line.destination);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Mesh:
                        {
                            let addedItem = this.propertyTree.addItem(parent, [], treeItemOptions);
                            // Ignore vertices/indices
                            break;
                        }
                    }
                }
            }
            else
            {
                const primitiveType = TypeSystem.buildPrimitiveType(property.type);
                const value = primitiveType ? this.getPrimitiveTypeAsString(property.value, primitiveType) : property.value as string;
                const content = this.wrapPrimitiveType(value);
                this.addValueToPropertyTree(parent, property.name, [content], property.id);
            }
        }
    }
}
