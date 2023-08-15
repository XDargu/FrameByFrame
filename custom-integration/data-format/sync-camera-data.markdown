---
layout: default
nav_order: 8
title: Sync Camera Data
description: "Description of the Sync Camera Data Message"
parent: Data Format
grand_parent: Custom Integrations
---

# Sync Camera Data
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
The **Sync Camera Data** message sends information about the current camera position in Frame by Frame.

The Game/Engine should receive this message, and set the camera position in the corresponding location, if camera syncing is enabled.

## Format
The format of the data is a JSON with the following layout:
```js
{
    "position": Vec3,
    "up": Vec3,
    "forward": Vec3
}
```

- `position`: Camera position.
- `up`: Up vector of the camera.
- `forward`: Forward vector of the camera.

## Example
Example of a `SyncCameraData` message. The `type` value is documented in the [Network Messages section](../network-messages/).

```js
{
    "type": 5,
    "data": {
        "position": {x: 145.63, y: 45.29, z: 32.87 },
        "up": {x: 0, y: 0, z: 1 },
        "forward": {x: 0, y: 1, z: 0 }
    }
}
```