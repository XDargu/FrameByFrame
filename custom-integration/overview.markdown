---
layout: default
nav_order: 1
title: Overview
description: "Overview of how to connect Frame by Frame manually to your engine"
parent: Custom Integrations
---

# Data Format
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Communication

Frame by Frame has two main ways of communicating your system:

1. In real time via WebSockets.
2. Reading a logged file containing the uncompressed recorded information.

Go to the [Data Format section](/FrameByFrame/custom-integration/data-format/) to find out the data format of all messages.

### Web Sockets

WebSockets are the main way of communication. This communication is bi-directional: the system sends recorded data and status information, and Frame by Frame sends control commands.

This is only required if you want real-time recorded information. You can ignore this step completely, and only export recorded data to a file. However, it is recommended to implement, since most of the benefits of using Frame by Frame come from the ease of use and quick iteration process that comes from real-time usage.

In order to connect to Frame by Frame you will need a client and a server WebSocket implementation in your system.

You can find the details of how to configure the WebSockets [here](/FrameByFrame/custom-integration/websocket-connection/).

If you are unfamiliar with WebSockets, Mozilla has [several guides and resources.](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

### Raw Data

Frame by Frame can also read uncompressed recorded data from a file. This allows you record and store data without the need for a human to manually connect and record information.

This feature is useful for automatic processes. For instance, smoke tests or automated feature tests could record data while they run. In case of an error or a failed test, the system can export the data, that can be examined by a human later on.