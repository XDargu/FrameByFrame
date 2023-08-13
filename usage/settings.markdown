---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
nav_order: 3
title: Settings
description: "Detailed explanation of all the settings of Frame by Frame"
parent: Using Frame by Frame
---

# Settings
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Connection
 - **Record on Connect**: If enabled, Frame by Frame will enable recording automatically after establishing a connection.
 - **Auto re-connect**: If enabled, Frame by Frame will try to re-connect every couple of seconds after losing connection.
 - **Default port**: Frame by Frame automatically creates a default connection. This is the port used for that connection. This value will also be the default value for creating new connections in the [Connection Panel](/FrameByFrame/user-interface#connections).

## Viewer
 - **Move camera on selection**: If enabled, the camera will focus on an entity after selecting it.
 - **Open entity list on selection**: If enabled, the [Entity Data Panel](/FrameByFrame/user-interface#entity-data) will automatically be opened after selecting an entity.
 - **Follow selected entity**: If enabled, the camera will follow the selected entity on the viewer when it moves. Useful when there is an entity that moves quickly and you need to focus on it. For example, an AI charater or a player running around.
 - **Show all layers on start**: If enabled, all layers will be set automatically to `all` when opening a recording.
 - **Highlight shapes on hover**: If enabled, it will highlight shapes of the currently selected entity when hovering over them, and display its name.
 - **Show shapes line on hover**: If enabled, when hovering over a shape on the property tree, a line linking the property and its location in the viewer will be displayed. The line will only be there if the shape is currently being rendered.
 - **Background color**: Controls the background color of the viewer. Click on the button on the right to reset to the default value.
 - **Selection color**: Controls the color of the outline of a selected entity. Click on the button on the right to reset to the default value.
 - **Hover color**: Controls the color of the outline of a hovered entity. Click on the button on the right to reset to the default value.
 - **Shape Hover Color**: Controls the color of the shape higlight effect. Click on the button on the right to reset to the default value.
  - **Outline width**: Controls the width of the outline of selected and hovered entities. Click on the button on the right to reset to the default value.

## Syncing
 - **Sync Visible Shapes**: If enabled, Frame by Frame will send the current rendered shapes back to the 3D application.
 - **Sync Camera Position**: If enabled, Frame by Frame will send the current camera position back to the 3D application.

## Timeline
 - **Show event popup**: If enabled, it will display a popup when hovering on events of the timeline. The popup shows all events happening on that frame.

## Grid
 - **Grid height**: Determines at which height should the grid be rendered. By default is zero, but your game might have levels with a different height, and the grid might appear very far away.
 - **Grid spacing**: Controls the spacing between the grid lines. The grid can be useful as a distance reference, or even for measuring. You can change the spacing to fit your needs.

## Graphics
 - **Anti-aliasing samples**: How many samples to use in the anti-aliasign post-process. More will make the 3D shapes smoother, at the cost of performance.
 - **Light intensity**: Intensity of the light of the viewer. Use values from 0 to 1 to get the best results.

## Exporting
 - **Exporting name format**: This defaines the format of the default name of a recording when exporting. When asking for saving a recording, this name will be used. You can use a couple of macros to adapt the format to your needs. The macros are:
    - %h: Hour (hh)
    - %m: Minute (mm)
    - %s: Second (ss)
    - %Y: Year (YYYY)
    - %M: Month (MM)
    - %D: Day (DD)
    - %%: % (Escape character)

## Debug
 - **Show render debug info**: Enable to display debug information on the viewer.
 - **Purge Pools**: Click on this button to clear all material and mesh pools. It will remove all meshes currently visible as well. Changing the current frame will reload them.