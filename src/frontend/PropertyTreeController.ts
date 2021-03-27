import * as RECORDING from '../recording/RecordingData';
import * as BASICO from '../ui/ui';
import * as TypeSystem from "../types/typeRegistry";

export class PropertyTreeController {
    propertyTree: BASICO.TreeControl;
    typeRegistry: TypeSystem.TypeRegistry;

    constructor(propertyTree: BASICO.TreeControl) {
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

    wrapPrimitiveType(content: string): string {
        return `<div class="basico-tag basico-big">${content}</div> `;
    }

    addCustomTypeToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, type: TypeSystem.IType) {
        // Complex value type
        let layout = `${property.name}: `;
        for (const [layoutId, primitiveType] of Object.entries(type.layout)) {
            const customTypeValue = property.value as RECORDING.IPropertyCustomType;
            const value = customTypeValue[layoutId];
            if (value) {
                const valueAsString = this.getPrimitiveTypeAsString(value, primitiveType);
                layout += this.wrapPrimitiveType(valueAsString);
            }
        }

        this.propertyTree.addItem(parent, layout, false, property.id.toString());
    }

    addToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty) {
        if (property.type == "group") {
            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            const propertyGroup = property as RECORDING.IPropertyGroup;

            for (let i = 0; i < propertyGroup.value.length; ++i) {
                this.addToPropertyTree(addedItem, propertyGroup.value[i]);
            }
        }


        // Find type
        else {
            const type = this.typeRegistry.findType(property.type);
            if (type) {
                this.addCustomTypeToPropertyTree(parent, property, type);
            }
            else if (property.type == "sphere") {
                const sphere = property as RECORDING.IPropertySphere;

                let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
                this.propertyTree.addItem(addedItem, "Position: " + sphere.position.x + ", " + sphere.position.y + ", " + +sphere.position.z);
                this.propertyTree.addItem(addedItem, "Radius: " + sphere.radius);
            }
            else if (property.type == "aabb") {
                const aabb = property as RECORDING.IPropertyAABB;

                let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
                this.propertyTree.addItem(addedItem, "Position: " + aabb.position.x + ", " + aabb.position.y + ", " + +aabb.position.z);
                this.propertyTree.addItem(addedItem, "Size: " + aabb.size.x + ", " + aabb.size.y + ", " + +aabb.size.z);
            }
            else if (property.type == "oobb") {
                const oobb = property as RECORDING.IPropertyOOBB;

                let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
                this.propertyTree.addItem(addedItem, "Position: " + oobb.position.x + ", " + oobb.position.y + ", " + +oobb.position.z);
                this.propertyTree.addItem(addedItem, "Size: " + oobb.size.x + ", " + oobb.size.y + ", " + +oobb.size.z);
                this.propertyTree.addItem(addedItem, "Forward: " + oobb.forward.x + ", " + oobb.forward.y + ", " + +oobb.forward.z);
                this.propertyTree.addItem(addedItem, "Up: " + oobb.up.x + ", " + oobb.up.y + ", " + +oobb.up.z);
            }
            else if (property.type == "plane") {
                const plane = property as RECORDING.IPropertyPlane;

                let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
                this.propertyTree.addItem(addedItem, "Position: " + plane.position.x + ", " + plane.position.y + ", " + +plane.position.z);
                this.propertyTree.addItem(addedItem, "Normal: " + plane.normal.x + ", " + plane.normal.y + ", " + +plane.normal.z);
                this.propertyTree.addItem(addedItem, "Up: " + plane.up.x + ", " + plane.up.y + ", " + +plane.up.z);
                this.propertyTree.addItem(addedItem, "Width: " + plane.width);
                this.propertyTree.addItem(addedItem, "Length: " + plane.length);
            }
            else if (property.type == "line") {
                const line = property as RECORDING.IPropertyLine;

                let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
                this.propertyTree.addItem(addedItem, "Origin: " + line.origin.x + ", " + line.origin.y + ", " + +line.origin.z);
                this.propertyTree.addItem(addedItem, "Destination: " + line.destination.x + ", " + line.destination.y + ", " + +line.destination.z);
            }

            else {
                const primitiveType = TypeSystem.buildPrimitiveType(property.type);
                const value = primitiveType ? this.getPrimitiveTypeAsString(property.value, primitiveType) : property.value as string;
                const layout = `${property.name}: ${this.wrapPrimitiveType(value)}`;
                this.propertyTree.addItem(parent, layout, false, property.id.toString());
            }
        }
    }
}
