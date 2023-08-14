---
layout: default
nav_order: 9
title: Raw Data
description: "Description of how Raw Data works in Frame by Frame"
parent: Data Format
grand_parent: Custom Integrations
---

# Raw Data
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

**Origin:**
{: .d-inline-block }
Game/Engine
{: .label .label-green }

**Target:**
{: .d-inline-block }
Frame by Frame
{: .label .label-purple  }

## Description
Frame by Frame supports loading data from a file, and not just via Web Sockets. This file is called **Raw Data**, since it contains uncompressed frame data.

Raw Data should be stored in a file with the .fbf extensions. This means it shares the extension with compressed recordings. But don´t worry, Frame by Frame will detect automatically if the file is Raw Data or a compressed recording.

## Format
Raw Data is a JSON with the following layout:
```js
{
    "type": 1,
    "version": number,
    "rawFrames": FrameData[]
}
```

- `type` needs to be `1`. Frame by Frame will use this to determine that the .fbf file is Raw Data, and not a compressed recording.
- `version` should be the most up-to-date version of raw data in frame by frame. Currently `3`.
- `rawFrames` should be an array of `FrameData`. This is the same as the one described in the [Frame Data](../frame-data/) page.