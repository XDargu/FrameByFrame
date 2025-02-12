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

## Downloadable Examples
Here you can download examples of Frame Data and a Full Recording.

[Example of Frame Data](/FrameByFrame/assets/files/ExampleFrameData.txt){: .btn .btn-green }
[Example of a full recording](/FrameByFrame/assets/files/ExampleRecording.fbf){: .btn .btn-purple }

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
    "scene": string,
    "entities": [key:number]: EntityData
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
- `scene`: Current scene where the recording is happening. It will be included on the recording metadata. It can be used for indicating the current level of a game, for example.
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
Events in Frame by Frame are something that happens once at an specific point in time. This is different from properties, that are inherent properties of an entity that might vary (or not) every frame.

Events contain properties in the same format as entity properties do.

#### Format
Events have the following format:
```js
{
    "name": string,
	"tag": string,
	"properties": PropertyGroup,
	"idx": number
}
```
- `name`: Name of the event.
- `tag`: Tag of the event.
- `properties`: A [property groups](../property-types/#groups) that should contain the properties of the event. The name of the group should be `properties`.
- `idx`: Index of that even within the frame, compared with other events. This property is used by Frame by Frame to determine in which order events happened within the same frame, even across different entities. Indices are local to one frame, which means that the index should restart with every new frame. The starting value is 0.

#### Example
Example of an event. Note how the property group name is `properties`:

```js
{
    "name": "Damage Received",
	"tag": "Damage System",
	"properties": {
        "name": "properties",
        "type": "group",
        "value": [
            {
                "name": "Amount",
                "type": "number",
                "value": 24.3
            },
            {
                "name": "Type",
                "type": "string",
                "value": "physical"
            }
        ]
    },
	"idx": 4
}
```

## Example
Example of Frame Data without properties or events, to make it easier to see the overall layout of entities.
You can also see the [full example](#detailed-example) with all data.

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

## Detailed Example
Example of Frame Data with properties and events.
For the sake of simplicity, two of the entities don't have any user properties or events.

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
            "properties": [
                {
                    "name": "properties",
                    "type": "group",
                    "value": []
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
            "events": []
        },
        55: {
            "id": 55,
            "parentId": 304,
            "properties": [
                {
                    "name": "properties",
                    "type": "group",
                    "value": []
                },
                {
                    "name": "special",
                    "type": "group",
                    "value": [
                        {
                            "name": "name",
                            "type": "string",
                            "value": "Test Entity 2"
                        },
                        {
                            "name": "position",
                            "type": "vec3",
                            "value": { x: 12.5, y: 15.2, z: 0 }
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
            "events": []
        },
        108: {
            "id": 108,
            "parentId": 0,
            "properties": [
                {
                    "name": "properties",
                    "type": "group",
                    "value": [
                        {
                            "name": "stats",
                            "type": "group",
                            "value": [
                                {
                                    "name": "Health",
                                    "type": number,
                                    "value": 24
                                },
                                {
                                    "name": "Stamina",
                                    "type": number,
                                    "value": 67
                                }
                        }
                    ]
                },
                {
                    "name": "special",
                    "type": "group",
                    "value": [
                        {
                            "name": "name",
                            "type": "string",
                            "value": "Test Entity 3"
                        },
                        {
                            "name": "position",
                            "type": "vec3",
                            "value": { x: 945.1, y: 2.4, z: -2.4 }
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
            "events": [
                {
                    "name": "Damage Received",
                    "tag": "Damage System",
                    "properties": {
                        "name": "properties",
                        "type": "group",
                        "value": [
                            {
                                "name": "Amount",
                                "type": "number",
                                "value": 24.3
                            },
                            {
                                "name": "Type",
                                "type": "string",
                                "value": "physical"
                            }
                        ]
                    },
                    "idx": 0
                }
            ]
        }
    }
}
```