---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
nav_order: 1
title: Data Format
description: "Description of the data format of Frame by Frame custom integrations"
parent: Custom Integrations
---

# Data Format
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Network Messages
All messages sent via WebSockets in Frame by Frame follow the same format. They need to be a json with the following format:
```js
// Frame by Frame Message Format
{
    "type": message type,
    "data": message data
}
```
- `type` is the id (number) of one the following types:
    - FrameData: `0`
    - RecordingOptions: `1`
    - RecordingOptionChanged: `2`

- `data` is the data of the message. It can be any valid json field, including objects or arrays. For more information about the format of each type, keep reading.

## Frame Data
 - Origin: Your game/engine
 - Destination: Frame By Frame

This is the data that contains all the information of a given frame. It contains all the information regarding the frame, including all recorded entities and their properties, elapsed time, client information, etc.

This is the largest and most important message you need to send to Frame by Frame from your game/engine.

The message should have the following format:
```js
// Frame Data Message Format
{
    "type": 0,
    "data": frameData
}
```

- `type` should be `0` as explained in the [Network Messages](#network-messages) section.
- `data` needs to be **FrameData**, which should have the following format:

```js
// Frame Data Format
{
    "frameId": unique frame ID number,
    "clientId": unique client ID number,
    "tag": unique client tag/name,
    "serverTime": absolute server time in milliseconds,
    "elapsedTime": time since last frame in seconds,
    "entities": {
        entity1Id: entity1Data,
        entity2Id: entity2Data
    }
}
```

- `frameId` is an integer. It needs to be different for each frame in the client. It there are multiple clients connected to Frame by Frame, they don't need to have differente frameIDs.
- `clientId` is an integer. It needs to be different for each client.
- `tag` is a string. It needs to be different for each client. It represents a human readable way of identifying a client.
- `serverTime` is an integer. It should represent the absolute server time. It will be used for sorting frames when Frame by Frame is connected to multiple clients. This is vital for syncronizing frames correctly in multiplayer games.
- `elapsedTime` is a number. It represents the time since the last frame, or delta time, in seconds. It will be used for playing back recordins in Frame by Frame.
- `entities` is an object. The object contains entity data as key-values. The key is the unique entity id, and the value is the entity data. The entity data is documented in the [Entity Data section](#entity-data).

For an example of a valid frame data object, go to [Example of Frame Data](#example-of-frame-data).

### Entity Data

```js
// Entity Data Format
{
    "id": unique entity ID,
    "parentId": ID of the parent or 0,
    "properties": [property1, property2...],
    "events": [event1, event2...]
}
```

#### Special Properties

```js
// Entity Data example with special properties
{
    "id": 304,
    "parentId": 0,
    "properties": [
        {
            "name": "properties",
            "type": "group",
            "value": [property1, property2...]
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
                }
            ]
        }
    ],
    "events": [event1, event2...]
}
```

### Properties

```js
// Property Format
{
    "name": property name,
    "type": property type,
    "value": value. Could be an array of properties, a string, a number, a boolean...
}
```

#### Property Types

##### Primitive Properties
string, bool, number

##### Extra Properties
vec3

##### Property Groups
groups,

##### Shapes
sphere, line, etc

### Events

### Example of Frame Data
```js
// Frame Data Format
{
    "frameId": 521,
    "clientId": 1,
    "tag": "Server",
    "serverTime": 4124566,
    "elapsedTime": 0.16666,
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

## Recording Options
 - Origin: Your game/engine
 - Destination: Frame By Frame

This message is the on in charge of informing Frame by Frame of the different recording options available in your game/engine.
It should be sent when first connecting to Frame by Frame, and every time the value of a recording option changes.

The format is the following:
```js
{
    "type": 1,
    "data": [recordingOption1, recordingOption2, ...]
}
```

- `type` should be `1`, as explained in the [Network Messages](#network-messages) section.
- `data` should be an array of recording options. Each recording option has the following format:

```js
{
    "name": recordingOptionName,
    "enabled": optionStatus
}
```

Where `name` is a string with the name of the option and `enabled` is a boolean indicating if the recording option is enabled.

**Example of recording options message:**
```js
{
    "type": 1,
    "data": [
        { "name": "Colliders", "enabled": true },
        { "name": "Damage Handling", "enabled": false }
    ]
}
```

## Recording Option Changed
 - Origin: Frame By Frame
 - Destination: Your game/engine

This is a message that Frame by Frame sends when you change a recoring option in the tool. The game/engine should receive the message and enable/disable that recording option locally.

**Example of recording option changed message:**
```js
{
    "type": 2,
    "data": { "name": "Colliders", "enabled": true }
}
```

- `type` is be `2`, as explained in the [Network Messages](#network-messages) section.
- `data` is an object containing the name of the recording option and the value it should have.

## Raw Data
 - Origin: Your game/engine
 - Destination: .fbf file

Raw data is used whenever you need to write the recorded information to a file instead of sending it to Frame By Frame via WebSockets.

The json should be stored in a file with the .fbf extensions. Frame by Frame will detect 

The format of raw data is the following:
```js
{
    "type": 1,
    "version": currentVersionNumber,
    "rawFrames": [frameData1, frameData2...]
}
```

- `type` needs to be `1`. Frame by Frame will use this to determine that the .fbf file is raw data, and not a saved recording.
- `version` should be the most up-to-date version of raw data in frame by frame. Currently `1`.
- `rawFrames` should be an array of `frameData`. This is the same as the one described in the [Frame Data](#frame-data) section