import * as RECORDING from '../../recording/RecordingData';
import * as UserWindows from "../../frontend/UserWindows";
import * as Messaging from "../../messaging/MessageDefinitions";
import { NaiveRecordedData } from "../../recording/RecordingData";

interface PropertyWindowData
{
    windowId: number;
    entityId: number,
    propertyPath: string[];
}

export interface IGetEntityCallback
{
    (entityId: number) : RECORDING.IEntity
}

export class PropertyWindows
{
    private propertyWindowData: PropertyWindowData[] = [];
    private getEntityCallback: IGetEntityCallback;

    constructor(getEntityCallback: IGetEntityCallback)
    {
        this.getEntityCallback = getEntityCallback;
    }

    private async sendPropertyGroupData(entity: RECORDING.IEntity, property: RECORDING.IPropertyGroup, title: string, tag: string, name: string)
    {
        const winId = await UserWindows.requestOpenWindow(property.name, 400, 300);

        const propertyPath = NaiveRecordedData.getEntityPropertyPath(entity, property.id);
        this.propertyWindowData.push({
            windowId: winId,
            entityId: entity.id,
            propertyPath: propertyPath,
        });
        const propGroupData : Messaging.IPropertyGroupData = {
            group: property,
            tag: tag,
            name: name,
        };
        UserWindows.sendPropertyGroupData(winId, propGroupData, title);
    }

    private getPropertyData(propertyId: number, entityId: number, frame: number, frameData: RECORDING.IFrameData)
    {
        const entity = frameData.entities[entityId];
        const entityName = NaiveRecordedData.getEntityName(entity);

        const eventData = NaiveRecordedData.findPropertyIdInEntityEvents(entity, propertyId);
        if (eventData != null)
        {
            const eventProps = eventData.resultEvent.properties

            const title = `(Frame ${frame}) ${eventData.resultEvent.name} - ${entityName}`;
            return { entity: entity, props: eventProps, title: title, tag: eventData.resultEvent.tag, name: eventData.resultEvent.name }
        }

        const property: RECORDING.IProperty = NaiveRecordedData.findPropertyIdInEntityProperties(entity, propertyId);
        console.log(property);

        if (!property)
            return;
        
        if (NaiveRecordedData.isEntitySpecialProperty(entity, property))
        {
            const title = `(Frame ${frame}) Basic Information - ${entityName} `;
            return { entity: entity, props: NaiveRecordedData.getSpecialProperties(entity), title: title, tag: null, name: "Basic Information" }
        }

        const propGroup = NaiveRecordedData.findGroupOfProperty(entity, property);
        if (propGroup)
        {
            const title = `(Frame ${frame}) ${propGroup.name} - ${entityName}`;
            return { entity: entity, props: propGroup, title: title, tag: null, name: propGroup.name };
        }

        // TODO: Uncategorized properties

        return null;
    }

    openPropertyNewWindow(propertyId: number, entityId: number, frame: number, frameData: RECORDING.IFrameData)
    {
        const propertyData = this.getPropertyData(propertyId, entityId, frame, frameData);
        if (propertyData)
        {
            this.sendPropertyGroupData(propertyData.entity, propertyData.props, propertyData.title, propertyData.tag, propertyData.name);
        }
    }

    updateData(frameData: RECORDING.IFrameData, frame: number)
    {
        for (let propWinData of this.propertyWindowData)
        {
            const entity = this.getEntityCallback(propWinData.entityId);
            if (entity && propWinData.propertyPath != null)
            {
                const prop = NaiveRecordedData.findPropertyPathInEntity(entity, propWinData.propertyPath);
                if (prop)
                {
                    const propertyData = this.getPropertyData(prop.id, entity.id, frame, frameData);
                    const propGroupData : Messaging.IPropertyGroupData = {
                        group: propertyData.props,
                        tag: propertyData.tag,
                        name: propertyData.name,
                    };
                    UserWindows.sendPropertyGroupData(propWinData.windowId, propGroupData, propertyData.title);
                }
            }
        }
    }

    onWindowClosed(winId: number)
    {
        this.propertyWindowData = this.propertyWindowData.filter((winData) => { return winData.windowId == winId; });
    }

    clear()
    {
        this.propertyWindowData = [];
    }

}