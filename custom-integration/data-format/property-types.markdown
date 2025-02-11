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
| Table             | `"table"`    |
| Sphere            | `"sphere"`   |
| Capsule           | `"capsule"`  |
| Cylinder          | `"cylinder"` |
| AABB              | `"aabb"`     |
| OOBB              | `"oobb"`     |
| Plane             | `"plane"`    |
| Line              | `"line"`     |
| Arrow             | `"arrow"`    |
| Vector            | `"vector"`   |
| Mesh              | `"mesh"`     |
| Path              | `"path"`     |
| Triangle          | `"triangle"` |
| Line Chart        | `"linechart"`|

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

## Icons
All properties can have an icon.

Icons use [Font Awesome Icons](https://fontawesome.com/icons):
- The `icon` property is the name of the icon. Examples: `question`, `circle`, `user`.
- The `icolor` property is a [valid CSS color value](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Color_values). Examples: HEX colors like `#333` or `#565656` are valid. Named colors such as `red` or `cornflowerblue` are also valid.

Properties with an `icon` property and no `icolor` will use a default color.

By default, icons are displayed before the name of the property, and only the icon is affected by the color. However, a few properties have custom behavior:
- First level groups: first level groups create blocks of properties on the [Entity Data panel](/FrameByFrame/user-interface#entity-data). A first level group with an `icolor` property tints the header of the block with a darker shade of the color.

![First level group with an icon with color](/FrameByFrame/assets/images/screenshots/FirstLevelGroupPropertyColors.png)

- Comments: Any comment with an `icolor` property tints the background of the comment with a darker shade of the color, and the border of the comment with the given color:

![Different types of comments with icons and colors](/FrameByFrame/assets/images/screenshots/CommentPropertyColors.png)

## Primitive Properties
### String
```js
{
    "name": string,
    "type": "string",
    "value": string,
    "flags": number,
    "icon"?: string,
    "icolor"?: string
}
```
### Boolean
```js
{
    "name": string,
    "type": "boolean",
    "value": boolean,
    "flags": number,
    "icon"?: string,
    "icolor"?: string
}
```
### Number
```js
{
    "name": string,
    "type": "number",
    "value": number,
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
}
```
### Cylinder
```js
{
    "name": string,
    "type": "cylinder",
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "texture"?: string,
    "icon"?: string,
    "icolor"?: string
}
```

## Others
### Groups
```js
{
    "name": string,
    "type": "group",
    "value": Property[],
    "flags": number,
    "icon"?: string,
    "icolor"?: string
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
    "flags": number,
    "icon"?: string,
    "icolor"?: string
}
```
### Table
```js
{
    "name": string,
    "type": "table",
    "value": {
        "header": string[],
        "rows": string[][]
    },
    "flags": number,
    "icon"?: string,
    "icolor"?: string
}
```
### Comment
```js
{
    "name": string,
    "type": "comment",
    "value": string,
    "flags": number,
    "icon"?: string,
    "icolor"?: string
}
```
### Line Chart

#### Line Chart Data
```js
{
    "values": number[],
    "ylabel": string,
    "color"?: string
```

#### Line Chart Property
```js
{
    "name": string,
    "type": "linechart",
    "data": ILineChartData[],
    "yscale": number,
    "xscale": number,
    "chart"?: string, // use "bar" for a bar chart instead of a line chart
    "height"?: number,
    "flags": number,
    "icon"?: string,
    "icolor"?: string
}
```