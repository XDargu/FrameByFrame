---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: home
nav_order: 1
title: Home
description: "Frame by Frame documentation"
---

# Frame by Frame
{: .fs-9 }

Frame by Frame is a visual debugging and recording tool that helps you find bugs and issues in no time
{: .fs-6 .fw-300 }

[Get started now](#getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } [View it on GitHub](https://github.com/XDargu/FrameByFrame){: .btn .fs-5 .mb-4 .mb-md-0 }

---

Frame by Frame is a tool that lets you capture a representation of the game state and gives you the ability to review it. You can record and examine data in real time, or you can log the data to a file and import it later on.

Frame by Frame makes much easier to find bugs in your gameplay, especially with hard to track or hard to reproduce bugs. Enable what you need to record, reproduce the issue and review the state of your game frame by frame. You can find bugs caused by single frame events and scrub through the recording easily with the help of filters.

After all, games and 3D applications are often based around spacial behaviour, queries and logic, so bugs and issues are often spatial in nature. On top of that, with a main loop running many times every second, bugs and issues can also be temporal in nature, with the cause often rooted in a single frame or event. Frame by Frame makes finding such issues easier and faster.

Store your recordings and examine them later on. Let each member of the team do what they do best: QA can find and record bugs, developers can examine recordings and fix them.

Connect to any game or engine, Frame by Frame can be integrated with anything. If you are using a popular game engine like [Unity](/FrameByFrame/Unity) or [Unreal Engine](/FrameByFrame/Unity) you can try the integration plugins. Or you can [integrate Frame by Frame on your own](/FrameByFrame/custom-integration/custom-integration/).

![Frame by Frame Screenshot](/FrameByFrame/assets/images/screenshots/ExampleScreen.png)
*Example of a Frame by Frame capture. In this capture we can see the frame when the destination position of an AI agent was changed, as well as its current path, position, collider, etc.*

## Getting started

### Installing Frame by Frame
Download the latest release of Frame by Frame and install it.

[Get Frame by Frame 0.2.1](https://github.com/XDargu/FrameByFrame/releases/tag/v0.2.1){: .btn .btn-primary .fs-3 .mb-4 .mb-md-0 .mr-2 }

[Get older versions of Frame by Frame](https://github.com/XDargu/FrameByFrame/releases)

### Using Frame by Frame with Unity
TODO: Link to Unity plugin, explain the steps, link to doc page

### Using Frame by Frame with Unreal Engine
TODO: Link to Unreal Engine plugin, explain the steps, link to doc page

### Using Frame by Frame with your custom C++ engine
TODO: Link to C++ plugin, link to doc page


## Pending documentation:

- Home
- Quick Start Guide
- User Interface
	- Status Bar
	- Playback Bar
	- Timeline
	- 3D viewer
	- Entity List
		- Entities
		- Layers
	- Entity Data
		- Properties
		- Events
- Using Frame by Frame
	- Recording
		- Recording options
		- Properties
		- Events
	- Navigation
		- Moving through a recording
		- Playback
		- Events
	- Visualization
		- 3D Viewer (description, controls...)
		- Layers
	- Saving and loading
	- Filters
		- What are filters
		- Property filters
		- Event filters
	- Recording Multiplayer games
	- Settings
- Unity
	- Plugin installation
	- What does the plugin include
	- How to record custom information
	- Quick start guide
	- Detailed API documentation
- Unreal
	- Same as Unity
- Connecting to Frame by Frame manually
	- Network Protocols
		- Sending Recording Data
		- Sending Recording Options
     
  