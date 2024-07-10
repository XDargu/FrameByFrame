import { IEntity, IEvent, IFrameData, IProperty, IPropertyGroup,  IVec3, Props } from './RecordingDefinitions'

export enum VisitorResult
{
	Continue,
	Stop
}

export interface IPropertyVisitorCallback
{
    (property: IProperty) : VisitorResult | void
}

export interface IEventVisitorCallback
{
    (event: IEvent) : VisitorResult | void
}

export interface IShapeVisitorCallback
{
    (event: IEvent) : VisitorResult | void
}

export function getEntityName(entity: IEntity) : string
{
    // Name is always part of the special groups
    return (entity.properties[Props.SpecialProps] as IPropertyGroup).value[0].value as string;
}

export function getEntityPosition(entity: IEntity) : IVec3
{
    // Position is always part of the special groups
    return (entity.properties[Props.SpecialProps] as IPropertyGroup).value[1].value as IVec3;
}

export function getEntityUserProperties(entity: IEntity) : IPropertyGroup
{
    return (entity.properties[Props.UserProps] as IPropertyGroup);
}

export function getEntityUp(entity: IEntity) : IVec3
{
    // Up vector is always part of the special groups
    return (entity.properties[Props.SpecialProps] as IPropertyGroup).value[2].value as IVec3;
}

export function getEntityForward(entity: IEntity) : IVec3
{
    // Forward vector is always part of the special groups
    return (entity.properties[Props.SpecialProps] as IPropertyGroup).value[3].value as IVec3;
}

export function findPropertyIdInEntityProperties(entity: IEntity, propertyId: number) : IProperty
{
    let result: IProperty = null;
    visitEntityProperties(entity, (property) => {
        if (property.id == propertyId)
        {
            result = property;
            return VisitorResult.Stop;
        }
    });
    return result;
}

export function findPropertyIdInEntityEvents(entity: IEntity, propertyId: number)
{
    let resultProp: IProperty = null;
    let resultEvent: IEvent = null;

    visitEvents(entity.events, (event) => {
        visitProperties([event.properties], (property) => {
            if (property.id == propertyId)
            {
                resultEvent = event;
                resultProp = property;
                return VisitorResult.Stop;
            }
        });
    });

    if (resultEvent != null) {
        return { resultEvent, resultProp };
    }

    return null;
}

export function findPropertyIdInEntity(entity: IEntity, propertyId: number) : IProperty
{
    const resultProps = findPropertyIdInEntityProperties(entity, propertyId);
    if (resultProps)
    {
        return resultProps;
    }

    const resultEvent = findPropertyIdInEntityEvents(entity, propertyId);
    if (resultEvent)
    {
        return resultEvent.resultProp;
    }

    return null;
}

export function findPropertyIdInProperties(frameData: IFrameData, propertyId: number) : IProperty
{
    for (let entityID in frameData.entities)
    {
        const entity = frameData.entities[entityID];
        const result = findPropertyIdInEntityProperties(entity, propertyId);

        if (result != null) {
            return result;
        }
    }

    return null;
}

export function findPropertyIdInEvents(frameData: IFrameData, propertyId: number)
{
    for (let entityID in frameData.entities)
    {
        const entity = frameData.entities[entityID];
        const resultEvent = findPropertyIdInEntityEvents(entity, propertyId);

        if (resultEvent != null) {
            return resultEvent;
        }
    }

    return null;
}

export function visitEntityProperties(entity: IEntity, callback: IPropertyVisitorCallback)
{
    visitProperties(entity.properties, callback);
}

export function visitProperties(properties: IProperty[], callback: IPropertyVisitorCallback, visitChildGroups: boolean = true)
{
    const propertyCount = properties.length;
    for (let i=0; i<propertyCount; ++i)
    {
        if (properties[i].type == 'group')
        {
            const res = callback(properties[i]);
            if (res == VisitorResult.Stop) { return; }
            if (visitChildGroups)
            {
                visitProperties((properties[i] as IPropertyGroup).value, callback);
            }
        }
        else
        {
            const res = callback(properties[i]);
            if (res == VisitorResult.Stop) { return; }
        }
    }
}

export function visitEvents(events: IEvent[], callback: IEventVisitorCallback)
{
    const eventCount = events.length;
    for (let i=0; i<eventCount; ++i)
    {
        const res = callback(events[i]);
        if (res == VisitorResult.Stop) { return; }
    }
}