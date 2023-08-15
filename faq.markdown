---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
nav_order: 7
title: Frequently Asked Questions (FAQ)
description: "Frequent Asked Questions about Frame by Frame"
---

# Frequently Asked Questions (FAQ)
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## What is Frame by Frame?

Frame by Frame is a debugging tool aimed at game developers. It lets you record game data and review it later on, or in real time. The data is recorded and presented in an easy, intuitive and structured way.

## What is Frame by Frame's goal?

The goal of Frame by Frame is to help developers and companies make debugging easier and more efficient.

## What game engines are supported?

At the moment there is only official support for Unity. However, you can integrate Frame by Frame with any engine manually by following the documentation about [custom integrations](/FrameByFrame/custom-integrations/).

## Why use Frame by Frame?

As developers, we spend a lot of time debugging, with [some estimates](https://www.researchgate.net/publication/345843594_Reversible_Debugging_Software_Quantify_the_time_and_cost_saved_using_reversible_debuggers) ranging 35 to 50%. Frame by Frame can cut down the time and the cost of debugging. Record the issue and inspect it later. No more countless hours reproing issues over and over.

Frame by Frame also allows splitting reproducing a bug and investigating a bug. This means QA can create recordings whenever they find an issue, and developers can later use that recording to find out what is happening.

## How does Frame by Frame work?

Frame by Frame works by recording a representation of the game state of the game. You expose information from your game to Frame by Frame. Typically game state, properties, entity data and 3D shapes.

Then, you can connect Frame by Frame to your game and decide which subset of that information you want to record. For example: damage system, health and stats of characters, AI navigation information... You create these categories when exposing data.

Frame by Frame will record what happens in the game, and let you examine the recording frame by frame. Of course, you can save the recordings.

The data is organized by frame, and within a frame it's split into entities. Each entity can have properties and events. The information is structured in a way that is familiar to us game devs.

You can find more information in the [usage section](/FrameByFrame/usage/).

## Can I use Frame by Frame with my engine?

Yes, visit the [custom integrations](/FrameByFrame/custom-integrations/) section to find out how to connect Frame by Frame to any engine.

## Can I use Frame by Frame with a free Unity license?

Yes.

## Is Frame by Frame free?

Yes, Frame by Frame is free, open source and developed under the [MIT license](https://opensource.org/licenses/MIT).

## Can I try Frame by Frame somehow before I connect it to my engine?

Yes, you can download the [example recording](/FrameByFrame/assets/files/ExampleRecording.fbf), open it with Frame by Frame and try it out. 

## I have an issue while using Frame by Frame, what should I do?

First, make sure to follow the [documentation](/FrameByFrame/) and search the [issues page](https://github.com/XDargu/FrameByFrame/issues). If you still have problems, feel free to contact me on [Linkedin](https://www.linkedin.com/in/xdargu/).

## Do you offer premium support?

No, I don't offer premium support.

## Who made Frame by Frame?

Frame by Frame is a collaborative effort. You can find the list of contributors on [GitHub](https://github.com/XDargu/FrameByFrame/graphs/contributors).

The core creator and maintainer of Frame by Frame is [Daniel Armesto](https://www.linkedin.com/in/xdargu/), Principal AI Programmer at [Crytek](https://www.crytek.com/).