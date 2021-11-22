import { filterText } from "../utils/utils";
import * as RECORDING from "../recording/RecordingData";

export enum FilterType
{
    Event,
    Property,
    PropertyChanged
}

export function filterTypeAsString(type: FilterType) : string
{
    switch(type)
    {
        case FilterType.Event: return "Event";
        case FilterType.Property: return "Property";
        case FilterType.PropertyChanged: return "Property Changed";
    }
}

export enum FilterMode
{
    Contains, // String only
    Equals,
    Similar, // Number only
    Different,
    Less, // Number only
    More // Number only
}

export function filterModeAsString(mode: FilterMode) : string
{
    switch(mode)
    {
        case FilterMode.Contains: return "Contains";
        case FilterMode.Equals: return "Equals";
        case FilterMode.Similar: return "Similar";
        case FilterMode.Different: return "Different";
        case FilterMode.Less: return "Less";
        case FilterMode.More: return "More";
    }
}

// TODO: How to support complex/custom types?
export enum MemberFilterType
{
    String,
    Number,
    Boolean
}

export function memberFilterTypeAsString(type: MemberFilterType) : string
{
    switch(type)
    {
        case MemberFilterType.String: return "String";
        case MemberFilterType.Number: return "Number";
        case MemberFilterType.Boolean: return "Boolean";
    }
}

export function availableModesPerMemberType(type: MemberFilterType)
{
    switch(type)
    {
        case MemberFilterType.String: return [FilterMode.Contains, FilterMode.Equals, FilterMode.Different];
        case MemberFilterType.Number: return [FilterMode.Equals, FilterMode.Similar, FilterMode.Different, FilterMode.Less, FilterMode.More];
        case MemberFilterType.Boolean: return [FilterMode.Equals, FilterMode.Different];
    }
    return [];
}

export function getDefaultValuePerMemberType(type: MemberFilterType) : string | boolean | number
{
    switch(type)
    {
        case MemberFilterType.String: return "";
        case MemberFilterType.Number: return 0;
        case MemberFilterType.Boolean: return true;
    }
}

export interface MemberFilter
{
    name: string;
    type: MemberFilterType;
    value: string | number | boolean;
    mode: FilterMode;
}

export interface FilteredResult
{
    frameIdx: number;
    entityId: number;
}

function filterTextOrEmpty(filter: string, content: string) : boolean
{
    return filter === "" || filterText(filter, content);
}

function filterBooleanWithMode(filter: boolean, content: boolean, mode: FilterMode) : boolean
{
    switch(mode)
    {
        case FilterMode.Equals: return content === filter;
        case FilterMode.Different: return content != filter;
    }

    return false;
}

function filterNumberWithMode(filter: number, content: number, mode: FilterMode) : boolean
{
    switch(mode)
    {
        case FilterMode.Equals: return content === filter;
        case FilterMode.Similar: return Math.abs(content-filter) < 0.1;
        case FilterMode.Different: return content != filter;
        case FilterMode.Less: return content < filter;
        case FilterMode.More: return content > filter;
    }

    return false;
}

function filterTextWithMode(filter: string, content: string, mode: FilterMode) : boolean
{
    switch(mode)
    {
        case FilterMode.Contains: return filterTextOrEmpty(filter, content);
        case FilterMode.Equals: return filter === content;
        case FilterMode.Different: return filter != content;
    }

    return false;
}

function applyFilterBoolean(name: string, value: boolean, filter: MemberFilter)
{
    if (filterTextOrEmpty(filter.name, name))
    {
        if (filterBooleanWithMode(filter.value as boolean, value, filter.mode))
        {
            return true;
        }
    }
    return false;
}

function applyFilterNumber(name: string, value: number, filter: MemberFilter)
{
    if (filterTextOrEmpty(filter.name, name))
    {
        if (filterNumberWithMode(filter.value as number, value, filter.mode))
        {
            return true;
        }
    }
    return false;
}

function applyFilterString(name: string, value: string, filter: MemberFilter)
{
    if (filterTextOrEmpty(filter.name, name))
    {
        if (filterTextWithMode(filter.value as string, value, filter.mode))
        {
            return true;
        }
    }
    return false;
}

function filterPropertyBoolean(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    const name = property.name.toLowerCase();
    const value = property.value == "true" ? true : false;

    for (let i=0; i<filters.length; ++i)
    {
        if (applyFilterBoolean(name, value, filters[i]))
        {
            return true;
        }
    }
    return false;
}

function filterNumber(name: string, value: number, filters: MemberFilter[]) : boolean
{
    for (let i=0; i<filters.length; ++i)
    {
        if (applyFilterNumber(name, value, filters[i]))
        {
            return true;
        }
    }
    return false;
}

function filterPropertyNumber(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    const name = property.name.toLowerCase();
    const value = property.value as number;

    return filterNumber(name, value, filters);
}

function filterPropertyString(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    const name = property.name.toLowerCase();
    const value = (property.value as string).toLowerCase();

    for (let i=0; i<filters.length; ++i)
    {
        if (applyFilterString(name, value, filters[i]))
        {
            return true;
        }
    }
    return false;
}

function filterVec3(name: string, value: RECORDING.IVec3, filters: MemberFilter[]) : boolean
{
    const nameX = name + ".x";
    const nameY = name + ".y";
    const nameZ = name + ".z";

    for (let i=0; i<filters.length; ++i)
    {
        if (applyFilterNumber(nameX, value.x, filters[i]) ||
            applyFilterNumber(nameY, value.y, filters[i]) ||
            applyFilterNumber(nameZ, value.z, filters[i]))
        {
            return true;
        }
    }
    return false;
}

function filterPropertyVec3(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    return filterVec3(property.name, property.value as RECORDING.IVec3, filters);
}

function filterPropertySphere(property: RECORDING.IPropertySphere, filters: MemberFilter[]) : boolean
{
    return filterNumber("radius", property.radius, filters) ||
        filterVec3("position", property.position, filters);
}

function filterPropertyLine(property: RECORDING.IPropertyLine, filters: MemberFilter[]) : boolean
{
    return filterVec3("origin", property.origin, filters) ||
        filterVec3("destination", property.destination, filters);
}

function filterPropertyPlane(property: RECORDING.IPropertyPlane, filters: MemberFilter[]) : boolean
{
    return filterNumber("length", property.length, filters) || 
        filterNumber("width", property.width, filters) ||
        filterVec3("position", property.position, filters) ||
        filterVec3("normal", property.normal, filters) ||
        filterVec3("up", property.up, filters);
}

function filterPropertyAABB(property: RECORDING.IPropertyAABB, filters: MemberFilter[]) : boolean
{
    return filterVec3("position", property.position, filters) ||
        filterVec3("size", property.size, filters);
}

function filterPropertyOOBB(property: RECORDING.IPropertyOOBB, filters: MemberFilter[]) : boolean
{
    return filterVec3("position", property.position, filters) ||
        filterVec3("size", property.size, filters) ||
        filterVec3("up", property.up, filters) ||
        filterVec3("forward", property.size, filters);
}

function filterPropertyCapsule(property: RECORDING.IPropertyCapsule, filters: MemberFilter[]) : boolean
{
    return filterNumber("radius", property.radius, filters) || 
        filterNumber("height", property.height, filters) ||
        filterVec3("position", property.position, filters) ||
        filterVec3("direction", property.direction, filters);
}

function filterPropertyMesh(property: RECORDING.IPropertyMesh, filters: MemberFilter[]) : boolean
{
    return false;
}

function filterProperty(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    switch (property.type)
    {
        case "string": return filterPropertyString(property, filters);
        case "number": return filterPropertyNumber(property, filters);
        case "boolean": return filterPropertyBoolean(property, filters);
        case "group": return filterPropertyGroup(property as RECORDING.IPropertyGroup, filters);
        case "sphere": return filterPropertySphere(property as RECORDING.IPropertySphere, filters);
        case "line": return filterPropertyLine(property as RECORDING.IPropertyLine, filters);
        case "plane": return filterPropertyPlane(property as RECORDING.IPropertyPlane, filters);
        case "aabb": return filterPropertyAABB(property as RECORDING.IPropertyAABB, filters);
        case "oobb": return filterPropertyOOBB(property as RECORDING.IPropertyOOBB, filters);
        case "capsule": return filterPropertyCapsule(property as RECORDING.IPropertyCapsule, filters);
        case "mesh": return filterPropertyMesh(property as RECORDING.IPropertyMesh, filters);
        case "vec3": return filterPropertyVec3(property, filters);
    }

    return false;
}

function filterPropertyGroup(propertyGroup: RECORDING.IPropertyGroup, filters: MemberFilter[], visitChildGroups: boolean = true) : boolean
{
    let found = false;
    RECORDING.NaiveRecordedData.visitProperties(propertyGroup.value, (property: RECORDING.IProperty) => {
        if (filterProperty(property, filters))
        {
            found = true;
            return RECORDING.VisitorResult.Stop;
        }
    }, visitChildGroups);
    return found;
}

function filterEvent(event: RECORDING.IEvent, name: string, tag: string, members: MemberFilter[])
{
    if (filterTextOrEmpty(name, event.name.toLowerCase()) && filterTextOrEmpty(tag, event.tag.toLowerCase()))
    {
        if (members.length == 0) {
            return true;
        }

        return filterPropertyGroup(event.properties, members);
    }
    return false;
}

function filterEntityProperties(entity: RECORDING.IEntity, groupFilter: string, membersFilter: MemberFilter[]) : boolean
{
    const properties = entity.properties[0] as RECORDING.IPropertyGroup;
    const specialProperties = entity.properties[1] as RECORDING.IPropertyGroup;

    for (let i=0; i<properties.value.length; ++i)
    {
        let group = properties.value[i];
        if (group.type == "group")
        {
            if (filterEntityPropertyGroup(group as RECORDING.IPropertyGroup, group.name, groupFilter, membersFilter))
            {
                return true;
            }
        }
    }

    // Filter properties as "Uncategorized", not recursively
    if (filterEntityPropertyGroup(properties, "Uncategorized", groupFilter, membersFilter, false))
    {
        return true;
    }

    return filterEntityPropertyGroup(specialProperties, "Basic Information", groupFilter, membersFilter);
}

function filterEntityPropertyGroup(group: RECORDING.IPropertyGroup, groupName: string, groupFilter: string, members: MemberFilter[], visitChildGroups: boolean = true) : boolean
{
    if (filterTextOrEmpty(groupFilter, groupName.toLowerCase()))
    {
        if (filterPropertyGroup(group, members, visitChildGroups))
        {
            return true;
        }
    }

    return false;
}

export class Filter
{
    readonly type: FilterType;

    constructor(type: FilterType)
    {
        this.type = type;
    }

    public filter(recordedData: RECORDING.NaiveRecordedData) : FilteredResult[]
    {
        return [];
    }
}

// Filter specific event happening
export class EventFilter extends Filter
{
    name: string;
    tag: string;
    members: MemberFilter[];

    constructor(name: string, tag: string, members: MemberFilter[])
    {
        super(FilterType.Event);
        this.members = members;
        this.tag = tag;
        this.name = name;
    }

    public filter(recordedData: RECORDING.NaiveRecordedData) : FilteredResult[]
    {
        let results: FilteredResult[] = [];

        // Actual filters, so we don't override the existing ones.
        // Maybe give an option in the future to match case
        const nameFilter = this.name.toLowerCase();
        const tagFilter = this.tag.toLowerCase();
        let membersFilter: MemberFilter[] = [];
        for (let i=0; i<this.members.length; ++i)
        {
            const member = this.members[i];
            membersFilter.push({
                type: member.type,
                mode: member.mode,
                value: member.type == MemberFilterType.String ? (member.value as string).toLowerCase() : member.value,
                name: member.name.toLowerCase(),
            });
        }

        for (let i=0; i<recordedData.frameData.length; ++i)
        {
            const frameData = recordedData.frameData[i];
            for (let entityID in frameData.entities)
            {
                const entity = frameData.entities[entityID];

                RECORDING.NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
                    let allGood = true;

                    for (let j=0; j<membersFilter.length; ++j)
                    {
                        if (!filterEvent(event, nameFilter, tagFilter, [membersFilter[j]]))
                        {
                            allGood = false;
                            break;
                        }
                    }

                    if (allGood)
                    {
                        results.push({ frameIdx: i, entityId: entity.id });
                    }
                    
                });
            }
        }

        return results;
    }
}

// Filter specific property happening
export class PropertyFilter extends Filter
{
    group: string;
    members: MemberFilter[];

    constructor(group: string, members: MemberFilter[])
    {
        super(FilterType.Property);
        this.group = group.toLowerCase();
        for (let i=0; i<members.length; ++i)
        {
            members[i].name = members[i].name.toLowerCase();
        }
        this.members = members;
    }

    

    public filter(recordedData: RECORDING.NaiveRecordedData) : FilteredResult[]
    {
        let results: FilteredResult[] = [];

        // Actual filters, so we don't override the existing ones.
        // Maybe give an option in the future to match case
        const groupFilter = this.group.toLowerCase();
        let membersFilter: MemberFilter[] = [];
        for (let i=0; i<this.members.length; ++i)
        {
            const member = this.members[i];
            membersFilter.push({
                type: member.type,
                mode: member.mode,
                value: member.type == MemberFilterType.String ? (member.value as string).toLowerCase() : member.value,
                name: member.name.toLowerCase(),
            });
        }

        for (let i=0; i<recordedData.frameData.length; ++i)
        {
            const frameData = recordedData.frameData[i];
            for (let entityID in frameData.entities)
            {
                const entity = frameData.entities[entityID];

                let allGood = true;
                for (let i=0; i<membersFilter.length; ++i)
                {
                    if (!filterEntityProperties(entity, groupFilter, [membersFilter[i]]))
                    {
                        allGood = false;
                        break;
                    }
                }

                if (allGood)
                {
                    results.push({ frameIdx: i, entityId: entity.id });
                }
            }
        }

        return results;
    }
}

// Filter specific property changing from one frame to another
class PropertyChangedFilter extends Filter
{
    constructor()
    {
        super(FilterType.PropertyChanged);
    }
}