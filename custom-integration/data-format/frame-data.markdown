---
layout: default
nav_order: 2
title: Frame Data
description: "Description of the format of the Frame Data that needs to be sent to Frame by Frame"
parent: Data Format
grand_parent: Custom Integrations
---

# Frame Data
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

**Origin:**
{: .d-inline-block }
Game/Engine
{: .label .label-green  }

**Target:**
{: .d-inline-block }
Frame by Frame
{: .label .label-purple }

## Description
This is the data that contains all the information of a given frame. It contains all the information regarding the frame, including all recorded entities and their properties, elapsed time, client information, etc.

This is the largest and most important message you need to send to Frame by Frame from your game/engine.

## Format
```js
// Frame Data Format
{
    "frameId": number,
    "clientId":  number,
    "tag": string,
    "serverTime": number,
    "elapsedTime": number,
    "coordSystem": number,
    "entities": Map<number, EntityData>
}
```

- `frameId`: Unique frameId, as an integer. It needs to be different for each frame. If there are multiple clients connected to Frame by Frame, they don't need to have differente frameIds.
- `clientId`: Unique clientId, as an integer. It needs to be different for each client.
- `tag`: Human readable string that identifies a client. It needs to be different for each client.
- `serverTime`: Absolute server time in milliseconds, as an integer. Used for sorting frames when Frame by Frame is connected to multiple clients. This is vital for syncronizing frames correctly in multiplayer games.
- `elapsedTime`: Time since the last frame, or delta time, in seconds. Used for playing back recordings in Frame by Frame.
- `coordSystem`: Id of the coordinate system of your game/engine. The possible values are:
    - `0`: Right Handed
    - `1`: Left Handed
- `entities`: Object that contains entity data. Works like a map, with keys and values. The key is the unique entity id, and the value is the entity data. The entity data is documented in the [Entity Data section](#entity-data).

For an example of a valid frame data object, go to the [Example section](#example-of-frame-data).

### Entity Data
Each entity is represented with the **EntityData** layout:

```js
{
    "id": number,
    "parentId": number,
    "properties": Property[],
    "events": Event[]
}
```
- `id`: Integer representing a unique ID for the entity. Each entity on a single client needs to have a unique id.
- `parentId`: Entity ID of the parent entity, if any. If the entity has no parents, it should be `0`.
- `properties`: Array of properties. More information in the [Properties section](#properties).
- `events`: Array of events. More information in the [Events section](#events).

### Properties
Entities can have properties that define information about that entity on a given frame. The properties are split in two groups:
- **Special properties**: core properties that indicate basic information about that entity: name, position and orientation.
- **User properties**: properties set by the game/engine.

Both types of properties are represented as [property groups](../property-types/#groups).

The user properties should use the `properties` name, an the special properties should use the `special` name. See the example for more details on the format.

#### Format
All properties always have the same basic format:
```js
{
    "name": string,
    "type": string,
    "value": object | Property[]
    "flags": number
}
```
- `name`: Name of the property.
- `type`: Type of the property. For a full list of types, go to the [Property Types section](../property-types/#types).
- `value`: Value of the property. Its content depends on the type of the property.
- `flags`: Bitmask with the property flags. For a full list of flags, go to the [Property Flags section](../property-types/#flags).

On top of that, some properties, like shapes, might have extra fields. For more information, see the [Property Types section](../property-types/).

#### Example
This is an example of the properties of an entity. Notice how the special properties and the user properties are arranged as groups.

```js
{
    "id": 304,
    "parentId": 0,
    "properties": [
        {
            "name": "properties",
            "type": "group",
            "value": Property[]
        },
        {
            "name": "special",
            "type": "group",
            "value": [
                {
                    "name": "name",
                    "type": "string",
                    "value": "Test Entity"
                },
                {
                    "name": "position",
                    "type": "vec3",
                    "value": { x: 56.7, y: 32.43, z: 0 }
                },
                {
                    "name": "up",
                    "type": "vec3",
                    "value": {x: 0, y: 0, z: 1 }
                },
                {
                    "name": "forward",
                    "type": "vec3",
                    "value": {x: 0, y: 1, z: 0 }
                }
            ]
        }
    ],
    "events": Event[]
}
```

### Events
TODO

#### Format
#### Example

## Example
Example of Frame Data:
```js
{
    "frameId": 521,
    "clientId": 1,
    "tag": "Server",
    "serverTime": 4124566,
    "elapsedTime": 0.16666,
    "coordSystem": 1,
    "entities": {
        304: {
            "id": 304,
            "parentId": 0,
            "properties": [],
            "events": []
        },
        55: {
            "id": 55,
            "parentId": 304,
            "properties": [],
            "events": []
        },
        108: {
            "id": 108,
            "parentId": 0,
            "properties": [],
            "events": []
        }
    }
}
```