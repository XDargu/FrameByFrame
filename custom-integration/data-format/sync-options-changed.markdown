---
layout: default
nav_order: 6
title: Sync Options Changed
description: "Description of the Sync Options Changed Message"
parent: Data Format
grand_parent: Custom Integrations
---

# Sync Options Changed
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

**Origin:**
{: .d-inline-block }
Both
{: .label .label-blue }

**Target:**
{: .d-inline-block }
Both
{: .label .label-blue  }

## Description
The **Sync Options Changed** message is a request to either enable or disable sending rendering data and syncing the camera position to the Game/Engine.

The message is bi-directional. Frame by Frame can send it to the Game/Engine, and the other way around. Both applications can decide to enable or disable the feature, so both need to be able to send and receive this type of message.

## Format
The format of a Frame by Frame message is a JSON with the following layout:
```js
{
    "syncVisibleShapes": boolean,
    "syncCamera": boolean
}
```

- `syncVisibleShapes`: Indicates if Frame by Frame should send rendering data to the Game/Engine.
- `syncCamera`: Indicates if the Game/Engine should replicate the camera position of Frame by Frame.

## Example
Example of a full `SyncOptionsChanged` message. The `type` value is documented in the [Network Messages section](../network-messages/).
```js
{
    "type": 3,
    "data": {
        "syncVisibleShapes": true,
        "syncCamera": false
    }
}
```