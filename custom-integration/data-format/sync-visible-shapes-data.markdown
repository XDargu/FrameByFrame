---
layout: default
nav_order: 7
title: Sync Visible Shapes Data
description: "Description of the Sync Visible Shapes Data Message"
parent: Data Format
grand_parent: Custom Integrations
---

# SyncVisibleShapesData
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

**Origin:**
{: .d-inline-block }
Frame by Frame
{: .label .label-purple }

**Target:**
{: .d-inline-block }
Game/Engine
{: .label .label-green  }

## Description
The **Sync Visible Shapes Data** message sends information about the current rendered shapes in Frame by Frame to the Game/Engine.

The Game/Engine should receive this message, and render all the shapes, if shape syncing is enabled.

## Format
The format of the data is a JSON with the following layout:
```js
{
    "entities": RemoteEntity[],
    "coordinateSystem": Vec3,
}
```

- `entities`: Array that contains all entities that need to be rendered, and its properties. More information below.
- `coordinateSystem`: Id of the coordinate system of your game/engine. The possible values are:
    - `0`: Right Handed
    - `1`: Left Handed

The format of the **RemoteEntity** type is the following:
```js
{
    "id": number,
    "name": string,
    "position": Vec3,
    "shapes": Property[],
}
```
- `id`: Entity Id.
- `name`: Entity name.
- `position`: Entity position.
- `shapes`: Array of properties that need to be rendered. **Important** This does not represent all properties of the entity. It's merely a list of all properties that are currently displayed on Frame by Frame that belong to the entity. This includes properties from events. They are not sorted in any particular way.

## Example
Example of a `SyncVisibleShapesData` message. The `type` value is documented in the [Network Messages section](../network-messages/).

```js
{
    "type": 4,
    "data": {
        {
            "id": 45,
            "name": "Test Entity",
            "position": { x: 56.7, y: 32.43, z: 0 },
            "properties": [
                {
                    "name": "Sphere Collider",
                    "type": "sphere",
                    "layer": "Colliders",
                    "color": { r: 1, g: 0, b: 0, a: 0.8 },
                    "position": { x: 66.3, y: 52.61, z: 3.45 },
                    "radius": 2.5,
                    "flags": 0
                }
            ]
        }
    }
}
```