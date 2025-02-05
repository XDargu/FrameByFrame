import * as Utils from "../utils/utils";
import * as RECORDING from '../recording/RecordingData';
import * as TypeSystem from "../types/typeRegistry";

export namespace Filtering
{
    export function filterText(filter: string, content: string)
    {
        return filter == "" || Utils.filterText(filter, content.toLowerCase());
    }

    export function filterNumber(filter: string, content: number)
    {
        return filterText(filter, content.toString().toLowerCase());
    }

    export function filterVec2(filter: string, value: RECORDING.IVec2)
    {
        if (filterNumber(filter, value.x)) return true;
        if (filterNumber(filter, value.y)) return true;
        return false;
    }

    export function filterVec3(filter: string, value: RECORDING.IVec3)
    {
        if (filterNumber(filter, value.x)) return true;
        if (filterNumber(filter, value.y)) return true;
        if (filterNumber(filter, value.z)) return true;
        return false;
    }

    export function filterQuat(filter: string, value: RECORDING.IQuat)
    {
        if (filterNumber(filter, value.x)) return true;
        if (filterNumber(filter, value.y)) return true;
        if (filterNumber(filter, value.z)) return true;
        if (filterNumber(filter, value.w)) return true;
        return false;
    }

    export function filterTableRow(filter: string, value: RECORDING.TableRow)
    {
        for (let cell of value)
        {
            if (filterText(filter, cell)) return true;
        }
        return false;
    }

    export function filterPropertyName(filter: string, property: RECORDING.IProperty)
    {
        return filterText(filter, property.name);
    }

    export function filterProperty(filter: string, property: RECORDING.IProperty, recursive: boolean = true)
    {
        if (filter == "") return true;
        if (property.name && filterPropertyName(filter, property)) return true;

        const Type = TypeSystem.CorePropertyTypes;
        switch (property.type) {
            case Type.String: return filterText(filter, property.value as string);
            case Type.Number: return filterNumber(filter, (property.value as number));
            case Type.Bool: return filterText(filter, (property.value as boolean ? "true" : "false"));
            case Type.EntityRef: return filterText(filter, (property.value as RECORDING.IEntityRef).name);
            case Type.Comment: return filterText(filter, property.value as string);
            case Type.Table:
                {
                    const table = property.value as RECORDING.IPropertyTable;
                    for (let item of table.header)
                    {
                        if (filterText(filter, item))
                            return true;
                    }
                    for (let row of table.rows)
                    {
                        for (let item of row)
                        {
                            if (filterText(filter, item))
                                return true;
                        }
                    }
                    return false;
                }
            case Type.Quat: return filterQuat(filter, (property.value as RECORDING.IQuat));
            case Type.Vec2: return filterVec2(filter, (property.value as RECORDING.IVec2));
            case Type.Vec3: return filterVec3(filter, (property.value as RECORDING.IVec3));
            case Type.Group:
                {
                    if (recursive)
                    {
                        const group = property as RECORDING.IPropertyGroup;
                        for (let child of group.value)
                        {
                            if (filterProperty(filter, child))
                                return true;
                        }
                    }
                    return false;
                }
            case Type.Sphere:
                {
                    const sphere = property as RECORDING.IPropertySphere;
                    if (filterText(filter, "Position")) return true;
                    if (filterVec3(filter, sphere.position)) return true;
                    if (filterText(filter, "Radius")) return true;
                    if (filterNumber(filter, sphere.radius)) return true;
                    if (sphere.texture && filterText(filter, "Texture")) return true;
                    if (sphere.texture && filterText(filter, sphere.texture)) return true;
                    return false;
                }
            case Type.Line:
                {
                    const line = property as RECORDING.IPropertyLine;
                    if (filterText(filter, "Origin")) return true;
                    if (filterVec3(filter, line.origin)) return true;
                    if (filterText(filter, "Destination")) return true;
                    if (filterVec3(filter, line.destination)) return true;
                    return false;
                }
            case Type.Arrow:
                {
                    const arrow = property as RECORDING.IPropertyArrow;
                    if (filterText(filter, "Origin")) return true;
                    if (filterVec3(filter, arrow.origin)) return true;
                    if (filterText(filter, "Destination")) return true;
                    if (filterVec3(filter, arrow.destination)) return true;
                    return false;
                }
            case Type.Vector:
                {
                    const vector = property as RECORDING.IPropertyVector;
                    if (filterText(filter, "Vector")) return true;
                    if (filterVec3(filter, vector.vector)) return true;
                    return false;
                }
            case Type.Plane:
                {
                    const plane = property as RECORDING.IPropertyPlane;
                    if (filterText(filter, "Position")) return true;
                    if (filterVec3(filter, plane.position)) return true;
                    if (filterText(filter, "Normal")) return true;
                    if (filterVec3(filter, plane.normal)) return true;
                    if (filterText(filter, "Up")) return true;
                    if (filterVec3(filter, plane.up)) return true;
                    if (filterText(filter, "Width")) return true;
                    if (filterNumber(filter, plane.width)) return true;
                    if (filterText(filter, "Length")) return true;
                    if (filterNumber(filter, plane.length)) return true;
                    if (plane.texture && filterText(filter, "Texture")) return true;
                    if (plane.texture && filterText(filter, plane.texture)) return true;
                    return false;
                }
            case Type.AABB:
                {
                    const aabb = property as RECORDING.IPropertyAABB;
                    if (filterText(filter, "Position")) return true;
                    if (filterVec3(filter, aabb.position)) return true;
                    if (filterText(filter, "Size")) return true;
                    if (filterVec3(filter, aabb.size)) return true;
                    if (aabb.texture && filterText(filter, aabb.texture)) return true;
                    if (aabb.texture && filterText(filter, "Texture")) return true;
                    return false;
                }
            case Type.OOBB:
                {
                    const oobb = property as RECORDING.IPropertyOOBB;
                    if (filterText(filter, "Position")) return true;
                    if (filterVec3(filter, oobb.position)) return true;
                    if (filterText(filter, "Size")) return true;
                    if (filterVec3(filter, oobb.size)) return true;
                    if (filterText(filter, "Up")) return true;
                    if (filterVec3(filter, oobb.up)) return true;
                    if (filterText(filter, "Forward")) return true;
                    if (filterVec3(filter, oobb.forward)) return true;
                    if (oobb.texture && filterText(filter, "Texture")) return true;
                    if (oobb.texture && filterText(filter, oobb.texture)) return true;
                    return false;
                }
            case Type.Capsule:
                {
                    const capsule = property as RECORDING.IPropertyCapsule;
                    if (filterText(filter, "Position")) return true;
                    if (filterVec3(filter, capsule.position)) return true;
                    if (filterText(filter, "Direction")) return true;
                    if (filterVec3(filter, capsule.direction)) return true;
                    if (filterText(filter, "Radius")) return true;
                    if (filterNumber(filter, capsule.radius)) return true;
                    if (filterText(filter, "Height")) return true;
                    if (filterNumber(filter, capsule.height)) return true;
                    if (capsule.texture && filterText(filter, "Texture")) return true;
                    if (capsule.texture && filterText(filter, capsule.texture)) return true;
                    return false;
                }
            case Type.Cylinder:
                {
                    const cylinder = property as RECORDING.IPropertyCylinder;
                    if (filterText(filter, "Position")) return true;
                    if (filterVec3(filter, cylinder.position)) return true;
                    if (filterText(filter, "Direction")) return true;
                    if (filterVec3(filter, cylinder.direction)) return true;
                    if (filterText(filter, "Radius")) return true;
                    if (filterNumber(filter, cylinder.radius)) return true;
                    if (filterText(filter, "Height")) return true;
                    if (filterNumber(filter, cylinder.height)) return true;
                    if (cylinder.texture && filterText(filter, "Texture")) return true;
                    if (cylinder.texture && filterText(filter, cylinder.texture)) return true;
                    return false;
                }
            case Type.Mesh: return false;
            case Type.Triangle:
                {
                    const triangle = property as RECORDING.IPropertyTriangle;
                    if (filterText(filter, "p1")) return true;
                    if (filterVec3(filter, triangle.p1)) return true;
                    if (filterText(filter, "p2")) return true;
                    if (filterVec3(filter, triangle.p2)) return true;
                    if (filterText(filter, "p3")) return true;
                    if (filterVec3(filter, triangle.p3)) return true;
                    if (triangle.texture && filterText(filter, "Texture")) return true;
                    if (triangle.texture && filterText(filter, triangle.texture)) return true;
                    return false;
                }
            case Type.Path:
                {
                    const path = property as RECORDING.IPropertyPath;
                    for (let i=0; i<path.points.length; ++i)
                    {
                        const point = path.points[i];
                        if (filterText(filter, `Point ${i}`)) return true;
                        if (filterVec3(filter, point)) return true;
                    }
                    return false;
                }
        }

        return false;
    }
}