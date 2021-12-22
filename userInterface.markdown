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


## Entity List

In the side bar, the first tab contains the entity list and the layers.

### Entities

The Entities section displays all the recorded entities of the current frame.

Click on any entity to select it. The entity data should appear immediatly. The entity and all its 3D shapes of the current frame will be highlighted on the viewer. The camera will also move to the entity position, if enabled on the settings.

![Frame by Frame Entity List](/FrameByFrame/assets/images/screenshots/Entities.png)

### Layers

Layers let you filter what is visible and what is not visible on the viewer. You can select here which layers you want to display. You can decide to show everything inside a layer, just the shapes that belong to the current selection, or nothing.

![Frame by Frame Layers](/FrameByFrame/assets/images/screenshots/Layers.png)

## Entity Data
### Properties
### Events
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
## Recent Files
## Settings

The settings panel is one of the tabs in the left side bar.

This panel controls all the settings of Frame by Frame. For a detailed list of all settings, please go to the [Settings page in the Usage section](/FrameByFrame/usage/settings/).

![Frame by Frame Settings](/FrameByFrame/assets/images/screenshots/Settings.png)