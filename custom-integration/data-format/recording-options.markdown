---
layout: default
nav_order: 4
title: Recording Options
description: "Description of the Recording Options Message"
parent: Data Format
grand_parent: Custom Integrations
---

# Recording Options
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
The **Recording Options** message informs Frame by Frame of the different recording options available in your game/engine.

The game/engine should send it to Frame by Frame in the following situations:
- When first connecting to Frame by Frame.
- Every time the value of a recording option changes.

## Format
The format is an array of **RecordingOption** objects:
```js
[RecordingOption, RecordingOption, ...]
```

Each **RecordingOption** object should have the following layout:
```js
{
    "name": string,
    "enabled": boolean
}
```
- `name`: Name of the recording option.
- `enabled`: Indicates if the recording option is enabled or not.

**Example**
Example of a full `RecordingOption` message. The `type` value is documented in the [Network Messages section](../network-messages/).

```js
{
    "type": 1,
    "data": [
        { "name": "Colliders", "enabled": true },
        { "name": "Damage Handling", "enabled": false }
    ]
}
```