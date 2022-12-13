---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
nav_order: 3
title: User Interface
description: "User interface of Frame by Frame"
permalink: user-interface
---

# User Interface
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

![Frame by Frame UI Overview](/FrameByFrame/assets/images/screenshots/UIOverview.png)

## Welcome Screen

The first thing you will see when running Frame by Frame is the Welcome screen.

The Welcome Screen shows multiple things:
 - A quick start guide that explains how to start recording data if you have your engine already integrated with Frame by Frame and running.
 - A list with the recent recordings. Click on any of them to open it.
 - Links to the documentation page
 - Information about Frame by Frame, including the current version

 Once you open a recording or start a connection, the welcome screen will disappear.

 You can always bring the Welcome Screen back by clicking on the help button in the [Title Bar](#title-bar)

![Frame by Frame Welcome Screen](/FrameByFrame/assets/images/screenshots/WelcomeScreen.png)

## Title Bar

The title bar is at the very top of Frame by Frame. It contains, from left to right:
 - Buttons to open a recording, save or remove the current one, and open the [Welcome Screen](#welcome-screen) again.
 - Title of the current recording
 - Quick connection buttons. There is a button per connection. Click on the button to connect/disconnect. By default, a new connection is created to the default port configured in the Settings.
 - Buttons to minimize, maximize and close the window.

![Frame by Frame Title Bar](/FrameByFrame/assets/images/screenshots/TitleBar.png)

## Playback Bar

The playback bar lets you navigate through a recording. It contains, from left to right:
 - Current frame in the recording, plus frame id and client tag. The tag is important if your recording contains data form multiple sources. For example, a multiplayer game where you record the server and a client.
 - Playback buttons. They let you navigate through the current recording. With them you can move forward and back, navigate through events or play back the recording, at the same rate as it was recorded. Frame by Frame stores the elapsed time of each frame for this purpose.
 - Recording button. Click on it to enable or disable recording without having to disconnect.
 - Playback speed bar. Allows you to change the playback speed.

![Frame by Frame Playback Bar](/FrameByFrame/assets/images/screenshots/PlaybackBar.png)

## Timeline

The timeline lets you quickly navigate through a recording and gives an overview of the recorded data.

The timeline will display the current frame and the amount of frames, as well as the events in the capture. If you have filters, the filtered data will appear instead. Events of the current selected entity will be highlighted.

You can left click on any point of the timeline to go to that frame. Use the mouse wheel to zoom in our out. If you are zoomed in, hold the right mouse button and drag to move.

![Frame by Frame Timeline](/FrameByFrame/assets/images/screenshots/Timeline.png)

## 3D viewer

The viewer is one of the central parts of Frame by Frame. It displays the location of the entities, as well as any recorded shapes sent by the game.

Sometimes you only need properties and events when debugging something. However, frequently spacial information is vital to solve bugs or issues. The viewer provides an easy way of displaying any visual data sent by the game/engine.

For example, you could display the colliders of your entities, a line displaying a raycast request and a small sphere in the hit position, or even the entire ragdoll of a character.

You can move around the viewer using the WASD keys and the mouse, similar to the controls of 3D editors of many game engines and tools.

You can hover over any shape, and click on it to select its entity. All recorded data, includinh shapes, belong to an entity. The current selected entity will be highlighted, as well as any attached shapes.

You can control what is visible in the viewer by toggling [layers](#layers).

![Frame by Frame Viewer](/FrameByFrame/assets/images/screenshots/Viewer.png)

## Entity List

In the side bar, the first tab contains the entity list and the layers.

### Entities

The Entities section displays all the recorded entities of the current frame.

Click on any entity to select it. The [entity data](#entity-data) should appear immediatly on the right panel. The entity and all its 3D shapes of the current frame will be highlighted on the viewer. The camera will also move to the entity position, if enabled on the settings.

![Frame by Frame Entity List](/FrameByFrame/assets/images/screenshots/Entities.png)

### Layers

Layers let you filter what is visible and what is not visible on the viewer. You can select here which layers you want to display. You can decide to show everything inside a layer, just the shapes that belong to the current selection, or nothing.

![Frame by Frame Layers](/FrameByFrame/assets/images/screenshots/Layers.png)

## Entity Data

On the right side of Frame by Frame you can find the entity data. Here you can inspect the information belonging to the currently selected entity. This panel is divided in two parts: Properties and Events.

### Properties

Properties are attributes or qualities that belong to an entity, and can change on a frame by frame basis.

Examples of properties are:
 - Entity position
 - Tags
 - Animation state
 - Velocity
 - Etc.

Properties are always grouped. Properties with the same group will be displayed in Frame by Frame inside a box titled the name of the group.

Properties can also contain groups inside groups.

![Frame by Frame Properties](/FrameByFrame/assets/images/screenshots/Properties.png)

### Events

Events contain information of something that happens at an specific point in time.

Examples of events are:
 - Raycast completed
 - Pathfinding started
 - Damage Received
 - Entity Spawned
 - Etc.

Events contain properties inside, and can contian groups of properties.

Events also have a tag, that is displayed in the right of the event title bar.

![Frame by Frame Events](/FrameByFrame/assets/images/screenshots/Events.png)

Events also show up in the [timeline](#timeline) automatically.

![Frame by Frame Timeline](/FrameByFrame/assets/images/screenshots/Timeline.png)

## Recording Options

The recording options panel is one of the tabs in the left side bar.

Here you can select what do you want to record, once you are connected to a game/engine.

![Frame by Frame Recording Options](/FrameByFrame/assets/images/screenshots/RecordingOptions.png)

## Connections

The connections panel is one of the tabs in the left side bar.

In this panel you can add and remove connections, as well as connect or disconnect the existing ones.

By default, the game creates a new connection to localhost in the default port. You can change the default value in the settings.

![Frame by Frame Connections Panel](/FrameByFrame/assets/images/screenshots/Connections.png)

## Filters

When examining a large recording, sometimes it can be hard to find exactly what we need. Filters can help with that.

A filter will let you display on the [timeline](#timeline) properties with specific values, events with certain properties or combination of them.

For example, if we have a recording with many recorded events: collisions, damage, pathfinding requests... If we are interested on damage events where the damage source is something specific, we can create a filter for that. That way we can easily navigate through every event that matches the filter. Or we could filter collisions with an specific collider by name.

Filters have their own section in the left side bar. Here you can add new filters, as well as configuring the filter name and data.

![Frame by Frame Filters](/FrameByFrame/assets/images/screenshots/Filters.png)

When you create a new filter, a Filter Ticker will apear on the left side of the [viewer](#viewer), showing the name of the filter and its color. You can also click on the eye icon on the ticker to hide or show the filter on the timeline.

![Frame by Frame Filter Ticker](/FrameByFrame/assets/images/screenshots/FiltersTickers.png)

The filter color is important. All filters are color-coded. This is useful when having multiple filters, since there will be multiple indicators on the timeline. The indicators will match the filter color. Colors are assigned automatically. The color of a filter can be seen in the filter, the ticker and the timeline indicators.

![Frame by Frame Filter Colors](/FrameByFrame/assets/images/screenshots/FiltersColors.png)

In order to save time, you can right click on any property to create a new filter based on that specific property.

![Frame by Frame Create a Filter from a Property](/FrameByFrame/assets/images/screenshots/CreateFilterFromProperty.png)

## Recent Files

The recent files panel in the left side bar lets you quickly open a recording from the recently opened or saved ones.

Click on any of them to open the recording.

![Frame by Frame RecentFiles](/FrameByFrame/assets/images/screenshots/RecentFiles.png)

## Settings

The settings panel is one of the tabs in the left side bar.

This panel controls all the settings of Frame by Frame. For a detailed list of all settings, please go to the [Settings page in the Usage section](/FrameByFrame/usage/settings/).

![Frame by Frame Settings](/FrameByFrame/assets/images/screenshots/Settings.png)