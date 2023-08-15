---
layout: default
nav_order: 3
title: Property Types
description: "List of all the property types supported by Frame by Frame"
parent: Data Format
grand_parent: Custom Integrations
---

# Property Types
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

This is a complete description of all property types and their layouts.

## Types
These are all the possible property types:

| Type              | id           |
|:------------------|:-------------|
| Group             | `"group"`    |
| Comment           | `"comment"`  |
| Number            | `"number"`   |
| String            | `"string"`   |
| Boolean           | `"boolean"`  |
| Vec2              | `"vec2"`     |
| Vec3              | `"vec3"`     |
| Quaternion        | `"quat"`     |
| Entity Reference  | `"eref"`     |
| Sphere            | `"sphere"`   |
| Capsule           | `"capsule"`  |
| AABB              | `"aabb"`     |
| OOBB              | `"oobb"`     |
| Plane             | `"plane"`    |
| Line              | `"line"`     |
| Arrow             | `"arrow"`    |
| Vector            | `"vector"`   |
| Mesh              | `"mesh"`     |
| Path              | `"path"`     |
| Triangle          | `"triangle"` |

## Flags
These are all the possible property flags:

| Flag        | value   | description |
|:------------|:--------|:------------|
| None        | 0       | No changes  |
| Hidden      | 1       | The property will be hidden on the [property tree](/FrameByFrame/user-interface#properties) |
| Collapsed   | 2       | The property will appear collapsed as default on the [property tree](/FrameByFrame/user-interface#properties) |

Flags are used as a **bitmask**, so their value is combined in binary. When setting this flags from the game/engine, you need to treat the as such.

Example:

- `Hidden` has a value of 1, in binary this is `0001`.
- `Collapsed` has a value of 2, in binary this is `0010`.
- `Hidden | Collapsed` has a value of 3, in binary this is: `0011`

## Primitive Properties
### String
```js
{
    "name": string,
    "type": "string",
    "value": string,
    "flags": number
}
```
### Boolean
```js
{
    "name": string,
    "type": "boolean",
    "value": boolean,
    "flags": number
}
```
### Number
```js
{
    "name": string,
    "type": "number",
    "value": number,
    "flags": number
}
```

## Compound Properties
### Vec3
```js
{
    "name": string,
    "type": "vec3",
    "value": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### Vec2
```js
{
    "name": string,
    "type": "vec2",
    "value": {
        x: number,
        y: number,
    },
    "flags": number
}
```
### Quat
```js
{
    "name": string,
    "type": "quat",
    "value": {
        x: number,
        y: number,
        z: number,
        w: number
    },
    "flags": number
}
```

## Shapes
### Sphere
```js
{
    "name": string,
    "type": "sphere",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "position": {
        x: number,
        y: number,
        z: number
    },
    "radius": number,
    "flags": number
}
```
### Capsule
```js
{
    "name": string,
    "type": "capsule",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "position": {
        x: number,
        y: number,
        z: number
    },
    "direction": {
        x: number,
        y: number,
        z: number
    },
    "radius": number,
    "height": number,
    "flags": number
}
```
### AABB
```js
{
    "name": string,
    "type": "aabb",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "position": {
        x: number,
        y: number,
        z: number
    },
    "size": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### OOBB
```js
{
    "name": string,
    "type": "oobb",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "position": {
        x: number,
        y: number,
        z: number
    },
    "size": {
        x: number,
        y: number,
        z: number
    },
    "up": {
        x: number,
        y: number,
        z: number
    },
    "forward": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### Plane
```js
{
    "name": string,
    "type": "plane",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "position": {
        x: number,
        y: number,
        z: number
    },
    "normal": {
        x: number,
        y: number,
        z: number
    },
    "up": {
        x: number,
        y: number,
        z: number
    },
    "width": number,
    "length": number,
    "flags": number
}
```
### Line
```js
{
    "name": string,
    "type": "line",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "origin": {
        x: number,
        y: number,
        z: number
    },
    "destination": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### Arrow
```js
{
    "name": string,
    "type": "arrow",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "origin": {
        x: number,
        y: number,
        z: number
    },
    "destination": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### Vector
```js
{
    "name": string,
    "type": "vector",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "vector": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### Mesh
```js
{
    "name": string,
    "type": "mesh",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "vertices": number[],
    "indices"?: number[],
    "wireframe"?: boolean,
    "flags": number
}
```
### Path
```js
{
    "name": string,
    "type": "path",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "p1": {
        x: number,
        y: number,
        z: number
    },
    "p2": {
        x: number,
        y: number,
        z: number
    },
    "p3": {
        x: number,
        y: number,
        z: number
    },
    "flags": number
}
```
### Triangle
```js
{
    "name": string,
    "type": "triangle",
    "layer": string,
    "color": {
        r: number,
        g: number,
        b: number,
        a: number
    },
    "points": Vec3[],
    "flags": number
}
```

## Others
### Groups
```js
{
    "name": string,
    "type": "group",
    "value": Property[],
    "flags": number
}
```
### Entity Reference
```js
{
    "name": string,
    "type": "eref",
    "value": {
        "name": string,
        "id": number
    },
    "flags": number
}
```
### Comment
```js
{
    "name": string,
    "type": "comment",
    "value": string,
    "flags": number
}
```