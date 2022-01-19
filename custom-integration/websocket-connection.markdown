---
layout: default
nav_order: 2
title: WebSocket Connection
description: "How to make a custom integration to Frame by Frame"
parent: Custom Integrations
---

# Recording
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Web Socket configuration

Your integration should create a Web Socket server, with the following configuration:
 - **protocol**: `frameByframe`
 - **default port**: `23001`

## Network protocol

Frame by Frame will connect to the Web Socket as a client. Your integration should send the list of available recording options, and start sending frame data.

The format of the messages is documented in the [Data Format section](../data-format).