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

Quickly find bugs in your gameplay, especially with hard to track or hard to reproduce bugs. Enable what you need to record, reproduce the issue and review the state of your game frame by frame. You can find bugs caused by single frame events and scrub through the recording easily with the help of filters.

After all, games and 3D applications are often based around spacial behaviour, queries and logic, so bugs and issues are often spatial in nature. On top of that, with a main loop running many times every second, bugs and issues can also be temporal in nature, with the cause often rooted in a single frame or event. Frame by Frame makes finding such issues easier and faster.

Store your recordings and examine them later on. Let each member of the team do what they do best: QA can find and record bugs, developers can examine recordings and fix them.

Connect to any game or engine, Frame by Frame can be integrated with anything. If you are using a popular game engine like [Unity](/FrameByFrame/Unity) you can try the integration plugins. Or you can [integrate Frame by Frame on your own](/FrameByFrame/custom-integrations/).

![Frame by Frame Screenshot](/FrameByFrame/assets/images/screenshots/ExampleScreen.png)
*Example of a Frame by Frame capture. In this capture we can see the frame when the destination position of an AI agent was changed, as well as its current path, position, collider, etc.*

## Getting started

### Installing Frame by Frame
Download the latest release of Frame by Frame and install it.

[Get Frame by Frame 0.6.2](https://github.com/XDargu/FrameByFrame/releases/tag/v0.6.2){: .btn .btn-purple } [Download Directly](https://github.com/XDargu/FrameByFrame/releases/download/v0.6.2/Frame.By.Frame.Setup.0.6.2.exe){: .btn }

[Get older versions of Frame by Frame](https://github.com/XDargu/FrameByFrame/releases)

If you want to see Frame by Frame in action straight away, you can download the example recording and open it:

[Download example recording](/FrameByFrame/assets/files/ExampleRecording.fbf){: .btn .btn-purple .fs-3 }

### Using Frame by Frame with Unity
Get the free Unity Plugin and learn how to use it [here](/FrameByFrame/unity/).

### Using Frame by Frame with your custom engine
If you want to add Frame by Frame to your own 3D application, visit the [Custom Integrations section](/FrameByFrame/custom-integrations).