import * as RECORDING from '../../recording/RecordingData';
import * as UserWindows from "../../frontend/UserWindows";
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

    private async sendPropertyGroupData(entity: RECORDING.IEntity, property: RECORDING.IPropertyGroup, title: string)
    {
        const winId = await UserWindows.requestOpenWindow(property.name);

        const propertyPath = NaiveRecordedData.getEntityPropertyPath(entity, property.id);
        this.propertyWindowData.push({
            windowId: winId,
            entityId: entity.id,
            propertyPath: propertyPath,
        });
        UserWindows.sendPropertyGroupData(winId, JSON.stringify(property), title);
    }

    private getPropertyData(propertyId: number, entityId: number, frame: number, frameData: RECORDING.IFrameData)
    {
        const entity = frameData.entities[entityId];
        const entityName = NaiveRecordedData.getEntityName(entity);

        const eventData = NaiveRecordedData.findPropertyIdInEvents(frameData, propertyId);
        if (eventData != null)
        {
            const eventProps = eventData.resultEvent.properties

            const title = `${eventData.resultEvent.name} - ${entityName} (Frame ${frame})`;
            return { entity: entity, props: eventProps, title: title }
        }

        const property: RECORDING.IProperty = NaiveRecordedData.findPropertyIdInProperties(frameData, propertyId);
        const propGroup = NaiveRecordedData.findGroupOfProperty(entity, property);

        if (propGroup)
        {
            const title = `${propGroup.name} - ${entityName} (Frame ${frame})`;
            return { entity: entity, props: propGroup, title: title }
        }

        // TODO: Special properties and uncategorized properties

        return null;
    }

    openPropertyNewWindow(propertyId: number, entityId: number, frame: number, frameData: RECORDING.IFrameData)
    {
        const propertyData = this.getPropertyData(propertyId, entityId, frame, frameData);
        if (propertyData)
        {
            this.sendPropertyGroupData(propertyData.entity, propertyData.props, propertyData.title);
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
                    UserWindows.sendPropertyGroupData(propWinData.windowId, JSON.stringify(propertyData.props), propertyData.title);
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