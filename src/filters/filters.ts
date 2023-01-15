import { filterText } from "../utils/utils";
import * as RECORDING from "../recording/RecordingData";
import { CorePropertyTypes } from "../types/typeRegistry";

export enum FilterType {
    Event,
    Property,
    PropertyChanged
}

export function filterTypeAsString(type: FilterType): string {
    switch (type) {
        case FilterType.Event: return "Event";
        case FilterType.Property: return "Property";
        case FilterType.PropertyChanged: return "Property Changed";
    }
}

export enum FilterMode {
    Contains, // String only
    Equals,
    Similar, // Number only
    Different,
    Less, // Number only
    More // Number only
}

export function filterModeAsString(mode: FilterMode): string {
    switch (mode) {
        case FilterMode.Contains: return "Contains";
        case FilterMode.Equals: return "Equals";
        case FilterMode.Similar: return "Similar";
        case FilterMode.Different: return "Different";
        case FilterMode.Less: return "Less";
        case FilterMode.More: return "More";
    }
}

// TODO: How to support complex/custom types?
export enum MemberFilterType {
    String,
    Number,
    Boolean
}

export function memberFilterTypeAsString(type: MemberFilterType): string {
    switch (type) {
        case MemberFilterType.String: return "String";
        case MemberFilterType.Number: return "Number";
        case MemberFilterType.Boolean: return "Boolean";
    }
}

export function availableModesPerMemberType(type: MemberFilterType) {
    switch (type) {
        case MemberFilterType.String: return [FilterMode.Contains, FilterMode.Equals, FilterMode.Different];
        case MemberFilterType.Number: return [FilterMode.Equals, FilterMode.Similar, FilterMode.Different, FilterMode.Less, FilterMode.More];
        case MemberFilterType.Boolean: return [FilterMode.Equals, FilterMode.Different];
    }
    return [];
}

export function getDefaultValuePerMemberType(type: MemberFilterType): string | boolean | number {
    switch (type) {
        case MemberFilterType.String: return "";
        case MemberFilterType.Number: return 0;
        case MemberFilterType.Boolean: return true;
    }
}

function createMemberFilterOfType(type: CorePropertyTypes, name: string, value: string | number | boolean | RECORDING.IVec3 | RECORDING.IEntityRef ) : MemberFilter[]
{
    switch (type) {
        case CorePropertyTypes.Bool: return [{ name: name, type: MemberFilterType.Boolean, value: value as boolean, mode: FilterMode.Equals }];
        case CorePropertyTypes.Number: return [{ name: name, type: MemberFilterType.Number, value: value as number, mode: FilterMode.Similar }];
        case CorePropertyTypes.String: return [{ name: name, type: MemberFilterType.String, value: value as string, mode: FilterMode.Equals }];
        case CorePropertyTypes.Vec3: return [
            { name: name + ".x", type: MemberFilterType.Number, value: (value as RECORDING.IVec3).x, mode: FilterMode.Similar },
            { name: name + ".y", type: MemberFilterType.Number, value: (value as RECORDING.IVec3).y, mode: FilterMode.Similar },
            { name: name + ".z", type: MemberFilterType.Number, value: (value as RECORDING.IVec3).z, mode: FilterMode.Similar }
        ];
        case CorePropertyTypes.EntityRef: return [
            { name: name + ".name", type: MemberFilterType.String, value: (value as RECORDING.IEntityRef).name, mode: FilterMode.Equals },
            { name: name + ".id", type: MemberFilterType.Number, value: (value as RECORDING.IEntityRef).id, mode: FilterMode.Equals },
        ]
        case CorePropertyTypes.Quat: return [
            { name: name + ".x", type: MemberFilterType.Number, value: (value as RECORDING.IQuat).x, mode: FilterMode.Similar },
            { name: name + ".y", type: MemberFilterType.Number, value: (value as RECORDING.IQuat).y, mode: FilterMode.Similar },
            { name: name + ".z", type: MemberFilterType.Number, value: (value as RECORDING.IQuat).z, mode: FilterMode.Similar },
            { name: name + ".w", type: MemberFilterType.Number, value: (value as RECORDING.IQuat).z, mode: FilterMode.Similar }
        ]
    }

    return [];
}

export function createMemberFilterFromProperty(property: RECORDING.IProperty): MemberFilter[]
{
    console.log(property)
    switch (property.type) {
        case CorePropertyTypes.Bool: return createMemberFilterOfType(property.type, property.name, property.value as boolean);
        case CorePropertyTypes.Number: return createMemberFilterOfType(property.type, property.name, property.value as number);
        case CorePropertyTypes.String: return createMemberFilterOfType(property.type, property.name, property.value as string);
        case CorePropertyTypes.Vec3: return createMemberFilterOfType(property.type, property.name, property.value as RECORDING.IVec3);
        case CorePropertyTypes.EntityRef: return createMemberFilterOfType(property.type, property.name, property.value as RECORDING.IEntityRef);
        case CorePropertyTypes.Quat: return createMemberFilterOfType(property.type, property.name, property.value as RECORDING.IQuat);

        // Shapes
        case CorePropertyTypes.Sphere:
        {
            const sphere = property as RECORDING.IPropertySphere;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Position", sphere.position),
                ...createMemberFilterOfType(CorePropertyTypes.Number, "Radius", sphere.radius)
            ];
        }
        case CorePropertyTypes.Capsule:
        {
            const capsule = property as RECORDING.IPropertyCapsule;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Position", capsule.position),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Direction", capsule.direction),
                ...createMemberFilterOfType(CorePropertyTypes.Number, "Radius", capsule.radius),
                ...createMemberFilterOfType(CorePropertyTypes.Number, "Height", capsule.height)
            ];
        }
        case CorePropertyTypes.AABB:
        {
            const aabb = property as RECORDING.IPropertyAABB;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Position", aabb.position),
                ...createMemberFilterOfType(CorePropertyTypes.Number, "Size", aabb.size),
            ];
        }
        case CorePropertyTypes.OOBB:
        {
            const oobb = property as RECORDING.IPropertyOOBB;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Position", oobb.position),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Size", oobb.size),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Up", oobb.up),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Forward", oobb.forward),
            ];
        }
        case CorePropertyTypes.Plane:
        {
            const plane = property as RECORDING.IPropertyPlane;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Position", plane.position),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Normal", plane.normal),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Up", plane.up),
                ...createMemberFilterOfType(CorePropertyTypes.Number, "Width", plane.width),
                ...createMemberFilterOfType(CorePropertyTypes.Number, "Length", plane.length),
            ];
        }
        case CorePropertyTypes.Line:
        {
            const line = property as RECORDING.IPropertyLine;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Origin", line.origin),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Destination", line.destination),
            ];
        }
        case CorePropertyTypes.Arrow:
        {
            const arrow = property as RECORDING.IPropertyArrow;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Origin", arrow.origin),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Destination", arrow.destination),
            ];
        }
        case CorePropertyTypes.Vector:
        {
            const vector = property as RECORDING.IPropertyVector;
            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "Vector", vector.vector)
            ];
        }
        case CorePropertyTypes.Path:
        {
            return [];
        }
        case CorePropertyTypes.Triangle:
        {
            const triangle = property as RECORDING.IPropertyTriangle;

            return [
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "p1", triangle.p1),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "p2", triangle.p2),
                ...createMemberFilterOfType(CorePropertyTypes.Vec3, "p3", triangle.p3),
            ]
        }
    }

    return [];
}

export interface MemberFilter {
    name: string;
    type: MemberFilterType;
    value: string | number | boolean;
    mode: FilterMode;
}

export interface FilteredResult {
    frameIdx: number;
    entityId: number;
}

export namespace Common {
    export function filterTextOrEmpty(filter: string, content: string): boolean {
        return filter === "" || filterText(filter, content);
    }

    export function filterBooleanWithMode(filter: boolean, content: boolean, mode: FilterMode): boolean {
        switch (mode) {
            case FilterMode.Equals: return content === filter;
            case FilterMode.Different: return content != filter;
        }

        return false;
    }

    export function filterNumberWithMode(filter: number, content: number, mode: FilterMode): boolean {
        switch (mode) {
            case FilterMode.Equals: return content === filter;
            case FilterMode.Similar: return Math.abs(content - filter) < 0.1;
            case FilterMode.Different: return content != filter;
            case FilterMode.Less: return content < filter;
            case FilterMode.More: return content > filter;
        }

        return false;
    }

    export function filterTextWithMode(filter: string, content: string, mode: FilterMode): boolean {
        switch (mode) {
            case FilterMode.Contains: return filterTextOrEmpty(filter, content);
            case FilterMode.Equals: return filter === content;
            case FilterMode.Different: return filter != content;
        }

        return false;
    }

    export function applyFilterBoolean(name: string, value: boolean, filter: MemberFilter) {
        if (filterTextOrEmpty(filter.name, name)) {
            if (filterBooleanWithMode(filter.value as boolean, value, filter.mode)) {
                return true;
            }
        }
        return false;
    }

    export function applyFilterNumber(name: string, value: number, filter: MemberFilter) {
        if (filterTextOrEmpty(filter.name, name)) {
            if (filterNumberWithMode(filter.value as number, value, filter.mode)) {
                return true;
            }
        }
        return false;
    }

    function applyFilterString(name: string, value: string, filter: MemberFilter) {
        if (filterTextOrEmpty(filter.name, name)) {
            if (filterTextWithMode(filter.value as string, value, filter.mode)) {
                return true;
            }
        }
        return false;
    }

    export function filterPropertyBoolean(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        const name = property.name.toLowerCase();
        const value = property.value == "true" ? true : false;

        for (let i = 0; i < filters.length; ++i) {
            if (applyFilterBoolean(name, value, filters[i])) {
                return true;
            }
        }
        return false;
    }

    export function filterNumber(name: string, value: number, filters: MemberFilter[]): boolean {
        for (let i = 0; i < filters.length; ++i) {
            if (applyFilterNumber(name, value, filters[i])) {
                return true;
            }
        }
        return false;
    }

    export function filterPropertyNumber(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        const name = property.name.toLowerCase();
        const value = property.value as number;

        return filterNumber(name, value, filters);
    }

    export function filterPropertyString(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        const name = property.name.toLowerCase();
        const value = (property.value as string).toLowerCase();

        for (let i = 0; i < filters.length; ++i) {
            if (applyFilterString(name, value, filters[i])) {
                return true;
            }
        }
        return false;
    }

    export function filterPropertyEntityRef(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        const name = property.name.toLowerCase();
        const value = property.value as RECORDING.IEntityRef;

        return filterEntityRef(name, value, filters);
    }

    export function filterEntityRef(name: string, ref: RECORDING.IEntityRef, filters: MemberFilter[]): boolean {
        const entityId = name + ".id";
        const entityName = name + ".name";

        for (let i = 0; i < filters.length; ++i) {
            if (applyFilterString(entityName, ref.name, filters[i]) ||
                applyFilterNumber(entityId, ref.id, filters[i])) {
                return true;
            }
        }
        return false;
    }

    export function filterQuat(name: string, value: RECORDING.IQuat, filters: MemberFilter[]): boolean {
        const nameX = name + ".x";
        const nameY = name + ".y";
        const nameZ = name + ".z";
        const nameW = name + ".w";

        for (let i = 0; i < filters.length; ++i) {
            if (applyFilterNumber(nameX, value.x, filters[i]) ||
                applyFilterNumber(nameY, value.y, filters[i]) ||
                applyFilterNumber(nameZ, value.z, filters[i]) ||
                applyFilterNumber(nameW, value.w, filters[i])) {
                return true;
            }
        }
        return false;
    }

    export function filterPropertyQuat(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        const name = property.name.toLowerCase();
        const value = property.value as RECORDING.IQuat;

        return filterQuat(name, value, filters);
    }

    export function filterVec3(name: string, value: RECORDING.IVec3, filters: MemberFilter[]): boolean {
        const nameX = name + ".x";
        const nameY = name + ".y";
        const nameZ = name + ".z";

        for (let i = 0; i < filters.length; ++i) {
            if (applyFilterNumber(nameX, value.x, filters[i]) ||
                applyFilterNumber(nameY, value.y, filters[i]) ||
                applyFilterNumber(nameZ, value.z, filters[i])) {
                return true;
            }
        }
        return false;
    }

    export function filterPropertyVec3(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        return filterVec3(property.name, property.value as RECORDING.IVec3, filters);
    }

    export function filterPropertySphere(property: RECORDING.IPropertySphere, filters: MemberFilter[]): boolean {
        return filterNumber("radius", property.radius, filters) ||
            filterVec3("position", property.position, filters);
    }

    export function filterPropertyLine(property: RECORDING.IPropertyLine, filters: MemberFilter[]): boolean {
        return filterVec3("origin", property.origin, filters) ||
            filterVec3("destination", property.destination, filters);
    }

    export function filterPropertyArrow(property: RECORDING.IPropertyArrow, filters: MemberFilter[]): boolean {
        return filterVec3("origin", property.origin, filters) ||
            filterVec3("destination", property.destination, filters);
    }

    export function filterPropertyVector(property: RECORDING.IPropertyVector, filters: MemberFilter[]): boolean {
        return filterVec3("vector", property.vector, filters);
    }

    export function filterPropertyPlane(property: RECORDING.IPropertyPlane, filters: MemberFilter[]): boolean {
        return filterNumber("length", property.length, filters) ||
            filterNumber("width", property.width, filters) ||
            filterVec3("position", property.position, filters) ||
            filterVec3("normal", property.normal, filters) ||
            filterVec3("up", property.up, filters);
    }

    export function filterPropertyAABB(property: RECORDING.IPropertyAABB, filters: MemberFilter[]): boolean {
        return filterVec3("position", property.position, filters) ||
            filterVec3("size", property.size, filters);
    }

    export function filterPropertyOOBB(property: RECORDING.IPropertyOOBB, filters: MemberFilter[]): boolean {
        return filterVec3("position", property.position, filters) ||
            filterVec3("size", property.size, filters) ||
            filterVec3("up", property.up, filters) ||
            filterVec3("forward", property.size, filters);
    }

    export function filterPropertyCapsule(property: RECORDING.IPropertyCapsule, filters: MemberFilter[]): boolean {
        return filterNumber("radius", property.radius, filters) ||
            filterNumber("height", property.height, filters) ||
            filterVec3("position", property.position, filters) ||
            filterVec3("direction", property.direction, filters);
    }

    export function filterPropertyMesh(property: RECORDING.IPropertyMesh, filters: MemberFilter[]): boolean {
        return false;
    }

    export function filterPropertyTriangle(property: RECORDING.IPropertyTriangle, filters: MemberFilter[]): boolean {
        return filterVec3("p1", property.p1, filters) ||
            filterVec3("p2", property.p2, filters) ||
            filterVec3("p3", property.p3, filters);
    }

    export function filterPropertyPath(property: RECORDING.IPropertyPath, filters: MemberFilter[]): boolean {
        // TODO: How to filter a single point? Do we want that?
        return false;
    }

    export function filterProperty(property: RECORDING.IProperty, filters: MemberFilter[]): boolean {
        const Type = CorePropertyTypes;

        switch (property.type) {
            case Type.String: return filterPropertyString(property, filters);
            case Type.Number: return filterPropertyNumber(property, filters);
            case Type.Bool: return filterPropertyBoolean(property, filters);
            case Type.EntityRef: return filterPropertyEntityRef(property, filters);
            case Type.Quat: return filterPropertyQuat(property, filters);
            case Type.Group: return filterPropertyGroup(property as RECORDING.IPropertyGroup, filters);
            case Type.Sphere: return filterPropertySphere(property as RECORDING.IPropertySphere, filters);
            case Type.Line: return filterPropertyLine(property as RECORDING.IPropertyLine, filters);
            case Type.Arrow: return filterPropertyArrow(property as RECORDING.IPropertyArrow, filters);
            case Type.Vector: return filterPropertyVector(property as RECORDING.IPropertyVector, filters);
            case Type.Plane: return filterPropertyPlane(property as RECORDING.IPropertyPlane, filters);
            case Type.AABB: return filterPropertyAABB(property as RECORDING.IPropertyAABB, filters);
            case Type.OOBB: return filterPropertyOOBB(property as RECORDING.IPropertyOOBB, filters);
            case Type.Capsule: return filterPropertyCapsule(property as RECORDING.IPropertyCapsule, filters);
            case Type.Mesh: return filterPropertyMesh(property as RECORDING.IPropertyMesh, filters);
            case Type.Vec3: return filterPropertyVec3(property, filters);
            case Type.Triangle: return filterPropertyTriangle(property as RECORDING.IPropertyTriangle, filters);
            case Type.Path: return filterPropertyPath(property as RECORDING.IPropertyPath, filters);
        }

        return false;
    }

    export function filterPropertyGroup(propertyGroup: RECORDING.IPropertyGroup, filters: MemberFilter[], visitChildGroups: boolean = true): boolean {
        let found = false;
        RECORDING.NaiveRecordedData.visitProperties(propertyGroup.value, (property: RECORDING.IProperty) => {
            if (filterProperty(property, filters)) {
                found = true;
                return RECORDING.VisitorResult.Stop;
            }
        }, visitChildGroups);
        return found;
    }

    export function filterEvent(event: RECORDING.IEvent, name: string, tag: string, members: MemberFilter[]) {
        if (filterTextOrEmpty(name, event.name.toLowerCase()) && filterTextOrEmpty(tag, event.tag.toLowerCase())) {
            if (members.length == 0) {
                return true;
            }

            let allGood = true;
            for (let i = 0; i < members.length; ++i) {
                if (!filterPropertyGroup(event.properties, members)) {
                    allGood = false;
                    break;
                }
            }

            return allGood;
        }
        return false;
    }

    export function filterEntityProperties(entity: RECORDING.IEntity, groupFilter: string, membersFilter: MemberFilter[]): boolean {
        const properties = entity.properties[0] as RECORDING.IPropertyGroup;
        const specialProperties = entity.properties[1] as RECORDING.IPropertyGroup;

        for (let i = 0; i < properties.value.length; ++i) {
            let group = properties.value[i];
            if (group.type == CorePropertyTypes.Group) {
                if (filterEntityPropertyGroup(group as RECORDING.IPropertyGroup, group.name, groupFilter, membersFilter)) {
                    return true;
                }
            }
        }

        // Filter properties as "Uncategorized", not recursively
        if (filterEntityPropertyGroup(properties, "Uncategorized", groupFilter, membersFilter, false)) {
            return true;
        }

        return filterEntityPropertyGroup(specialProperties, "Basic Information", groupFilter, membersFilter);
    }

    export function filterEntityPropertyGroup(group: RECORDING.IPropertyGroup, groupName: string, groupFilter: string, members: MemberFilter[], visitChildGroups: boolean = true): boolean {
        if (filterTextOrEmpty(groupFilter, groupName.toLowerCase())) {
            if (members.length == 0 || filterPropertyGroup(group, members, visitChildGroups)) {
                return true;
            }
        }

        return false;
    }
}

export class Filter {
    readonly type: FilterType;

    constructor(type: FilterType) {
        this.type = type;
    }

    public filter(recordedData: RECORDING.NaiveRecordedData): FilteredResult[] {
        return [];
    }
}

// Filter specific event happening
export class EventFilter extends Filter {
    name: string;
    tag: string;
    members: MemberFilter[];

    constructor(name: string, tag: string, members: MemberFilter[]) {
        super(FilterType.Event);
        this.members = members;
        this.tag = tag;
        this.name = name;
    }

    public filter(recordedData: RECORDING.NaiveRecordedData): FilteredResult[] {
        let results: FilteredResult[] = [];

        // Actual filters, so we don't override the existing ones.
        // Maybe give an option in the future to match case
        const nameFilter = this.name.toLowerCase();
        const tagFilter = this.tag.toLowerCase();
        let membersFilter: MemberFilter[] = [];
        for (let i = 0; i < this.members.length; ++i) {
            const member = this.members[i];
            membersFilter.push({
                type: member.type,
                mode: member.mode,
                value: member.type == MemberFilterType.String ? (member.value as string).toLowerCase() : member.value,
                name: member.name.toLowerCase(),
            });
        }

        for (let i = 0; i < recordedData.frameData.length; ++i) {
            const frameData = recordedData.frameData[i];
            for (let entityID in frameData.entities) {
                const entity = frameData.entities[entityID];

                RECORDING.NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
                    if (Common.filterEvent(event, nameFilter, tagFilter, membersFilter)) {
                        results.push({ frameIdx: i, entityId: entity.id });
                    }
                });
            }
        }

        return results;
    }
}

// Filter specific property happening
export class PropertyFilter extends Filter {
    group: string;
    members: MemberFilter[];

    constructor(group: string, members: MemberFilter[]) {
        super(FilterType.Property);
        this.group = group.toLowerCase();
        for (let i = 0; i < members.length; ++i) {
            members[i].name = members[i].name.toLowerCase();
        }
        this.members = members;
    }



    public filter(recordedData: RECORDING.NaiveRecordedData): FilteredResult[] {
        let results: FilteredResult[] = [];

        // Actual filters, so we don't override the existing ones.
        // Maybe give an option in the future to match case
        const groupFilter = this.group.toLowerCase();
        let membersFilter: MemberFilter[] = [];
        for (let i = 0; i < this.members.length; ++i) {
            const member = this.members[i];
            membersFilter.push({
                type: member.type,
                mode: member.mode,
                value: member.type == MemberFilterType.String ? (member.value as string).toLowerCase() : member.value,
                name: member.name.toLowerCase(),
            });
        }

        for (let i = 0; i < recordedData.frameData.length; ++i) {
            const frameData = recordedData.frameData[i];
            for (let entityID in frameData.entities) {
                const entity = frameData.entities[entityID];

                if (Common.filterEntityProperties(entity, groupFilter, [])) {
                    let allGood = true;
                    for (let i = 0; i < membersFilter.length; ++i) {
                        if (!Common.filterEntityProperties(entity, groupFilter, [membersFilter[i]])) {
                            allGood = false;
                            break;
                        }
                    }

                    if (allGood) {
                        results.push({ frameIdx: i, entityId: entity.id });
                    }
                }
            }
        }

        return results;
    }
}

// Filter specific property changing from one frame to another
class PropertyChangedFilter extends Filter {
    constructor() {
        super(FilterType.PropertyChanged);
    }
}