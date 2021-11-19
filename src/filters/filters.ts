import { filterText } from "../utils/utils";
import * as RECORDING from "../recording/RecordingData";

class Filter
{

}

export enum FilterMode
{
    Contains, // String only
    Equals,
    Different,
    Less, // Number only
    More // Number only
}

// TODO: How to support complex/custom types?
export enum FilterType
{
    String,
    Number,
    Boolean
}

export interface MemberFilter
{
    name: string;
    type: FilterType;
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

function filterPropertyNumber(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    const name = property.name.toLowerCase();
    const value = property.value as number;

    for (let i=0; i<filters.length; ++i)
    {
        if (applyFilterNumber(name, value, filters[i]))
        {
            return true;
        }
    }
    return false;
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

function filterProperty(property: RECORDING.IProperty, filters: MemberFilter[]) : boolean
{
    switch (property.type)
    {
        case "string": return filterPropertyString(property, filters);
        case "number": return filterPropertyNumber(property, filters);
        case "boolean": return filterPropertyBoolean(property, filters);
        // TODO: What to do with complex types? What to do with shapes?
    }

    return false;
}

// Filter specific event happening
export class EventFilter
{
    name: string;
    tag: string;
    members: MemberFilter[];

    constructor(name: string, tag: string, members: MemberFilter[])
    {
        this.name = name.toLowerCase();
        this.tag = tag.toLowerCase();
        for (let i=0; i<members.length; ++i)
        {
            members[i].name = members[i].name.toLowerCase();
        }
        this.members = members;
    }

    filter(recordedData: RECORDING.NaiveRecordedData) : FilteredResult[]
    {
        let results: FilteredResult[] = [];

        for (let i=0; i<recordedData.frameData.length; ++i)
        {
            const frameData = recordedData.frameData[i];
            for (let entityID in frameData.entities)
            {
                const entity = frameData.entities[entityID];

                RECORDING.NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
                    if (this.filterEvent(event))
                    {
                        results.push({ frameIdx: i, entityId: entity.id });
                    }
                });
            }
        }

        return results;
    }

    private filterEvent(event: RECORDING.IEvent)
    {
        if (filterTextOrEmpty(this.name, event.name.toLowerCase()) && filterTextOrEmpty(this.tag, event.tag.toLowerCase()))
        {
            if (this.members.length == 0) {
                return true;
            }

            let found = false;
            RECORDING.NaiveRecordedData.visitProperties([event.properties], (property: RECORDING.IProperty) => {
                if (filterProperty(property, this.members))
                {
                    found = true;
                    return RECORDING.VisitorResult.Stop;
                }
            });
            return found;
        }
        return false;
    }
}

// Filter specific property happening
class PropertyFilter extends Filter
{
    
}

// Filter specific property changing from one frame to another
class PropertyChangedFilter extends Filter
{
    
}