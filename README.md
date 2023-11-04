# Frame by Frame

A debugging tool for recording and replaying 3D applications and games.

[![Node.js CI](https://github.com/XDargu/FrameByFrame/actions/workflows/node.js.yml/badge.svg?branch=master)](https://github.com/XDargu/FrameByFrame/actions/workflows/node.js.yml)

## What is Frame by Frame?

Frame by Frame is a debugging tool aimed at game devs, and anyone that wants to debug 3D applications.

It works by connecting to your application and recording over time. You decide what to record, usually game state, properties or 3D shapes.

Later on, you can inspect the recorded data and replay it. Scrub throught the timeline frame by frame and find out bugs and issues without worrying about missing a breakpoint or needing to reproduce the issues time after time.

Learn more about it in the [documentation](https://xdargu.github.io/FrameByFrame/) or in the [FAQ](https://xdargu.github.io/FrameByFrame/faq/).

![Frame by Frame Screenshot](https://github.com/XDargu/FrameByFrame/blob/gh-pages/assets/images/screenshots/ExampleScreen.png?raw=true)

## How can I try Frame by Frame?

You can visit the [quick start guide](https://xdargu.github.io/FrameByFrame/quickStart/) in the documentation and download Frame by Frame and an example recording.

## Sounds good, how can I help?

If you want to contribute, you can visit the [issues page](https://github.com/XDargu/FrameByFrame/issues) and see if there are any outstanding issues.

In order to start developing, you can follow these simple steps:

* Install NodeJS. Go to: https://nodejs.org/en/
* I recommend using Visual Studio Code as IDE: https://code.visualstudio.com/
* Download this repo
* You might need to instal SASS
  ```
  npm install -g sass
  ```
* Build the node project. To do that go to the local copy of the repository in your machine with the console and type:
  ```
  npm install
  npm run build
  ```
* To start (without IDE) type:
  ```
  npm start
  ```
* To package a build type:
  ```
  npm run dist
  ```
