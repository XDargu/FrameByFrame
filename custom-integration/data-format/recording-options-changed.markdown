---
layout: default
nav_order: 5
title: Recording Options Changed
description: "Description of the Recording Options Changed Message"
parent: Data Format
grand_parent: Custom Integrations
---

# Recording Options Changed
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
The **Recording Options Changed** message informs that a recording option has changed. This means that it has been either activated or deactivated.

The Game/Engine should receive this message, and enable or disable that recording option locally.

## Format
The format of the data is a JSON with the following layout:
```js
{
    "name": string,
    "enabled": boolean
}
```

- `name`: Name of the recording option.
- `enabled`: Indicates if the recording option is enabled or not.

## Example
Example of a `RecordingOptionChanged` message. The `type` value is documented in the [Network Messages section](../network-messages/).

```js
{
    "type": 2,
    "data": {
        "name": "Colliders",
        "enabled": true
    }
}
```