---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
nav_order: 1
title: Recording
description: "How to record data with Frame by Frame"
parent: Using Frame by Frame
---

# Recording
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Connecting to the game

1. Make sure the game is running and listening to Frame by Frame requests. If you haven integrated Frame by Frame, check out how to do it for [Unity](/FrameByFrame/unity/), Unreal Engine or [yourself](/FrameByFrame/custom-integrations/). 

2. Press the Connection button on the top right. When Frame by Frame connects to the game, the recording button will change color:

![Recording Button Enabled](/FrameByFrame/assets/images/RecordingButtonActive.png)

3. Frame by Frame should start recording automatically. The [Recording options panel](#recording-options) will open so you can activate what information you want to record.

## Recording options
Recording options filter what you want to record. They control what information is sent from the game to Frame by Frame.

![Frame by Frame Recording Options](/FrameByFrame/assets/images/screenshots/RecordingOptions.png)

## Entities
All recorded information in Frame by Frame is attached to an Entity. Entities are just a way of representing the owner of that specific data. Most popular game engines have the concept of entities or a similar one, so the information should map reasonably well.

Sometimes, you might need to record information from abstract systems that don't correlate to an entity in the game world/scene. In such cases, you can always create an entity that represents such system.

## Types of recorded data
Data sent to Frame by Frame is divided in two main categories: Properties and Events

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

Events show up in the timeline automatically.

![Frame by Frame Timeline](/FrameByFrame/assets/images/screenshots/Timeline.png)