---
layout: default
nav_order: 1
title: Network Messages
description: "Description of the network messages used by Frame by Frame"
parent: Data Format
grand_parent: Custom Integrations
---

# Network Messages
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Description
All messages sent via WebSockets in Frame by Frame follow the same format. The format is the same no matter the direction of the message.

There are two possible directions for the messages:
- From the game/engine to Frame by Frame
- From Frame by Frame to the game/engine

The direction of messages is documented using the following format:

**Origin:**
{: .d-inline-block }
Frame by Frame
{: .label .label-purple  }

**Target:**
{: .d-inline-block }
Game/Engine
{: .label .label-green }

## Format
The format of a Frame by Frame message is a JSON with the following layout:
```js
// Frame by Frame Message Format
{
    "type": number,
    "data": json | array
}
```

- `type`: Id indicating the type of message. The possible values are:
    - `0`: FrameData
    - `1`: RecordingOptions
    - `2`: RecordingOptionChanged
    - `3`: SyncOptionsChanged
    - `4`: SyncVisibleShapesData
    - `5`: SyncCameraData

- `data`: Content of the message. It can be any valid json field, including objects or arrays.

## Example

Example of a `SyncOptionsChanged` message:

```js
{
    "type": 3,
    "data": {
        "syncVisibleShapes": true;
        "syncCamera": false;
    }
}
```