---
layout: default
nav_order: 3
title: Comments
description: "How to use comments in Frame by Frame"
parent: Using Frame by Frame
---

# Comments
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## What is a comment

Comments are small annotations you can attach to the recording to write information on existing recordings.

When examining a recording, you might go back and forth between frames, entities and properties. It's easy to lose track of important information or forget where something happened. That's where comments came in!

Suppose you are debugging a complex bug that has a tricky root cause. Perhaps there are several hints over the course of the recording. You can annotate with comments the frames or properties to explain what those hint mean and as a remainder of where those hints are.

![Example of comments on bugs taken form the Example Recording](/FrameByFrame/assets/images/screenshots/CommentBugExample.png)

Comments facilitate your debugging process, and can help when working with others. You can write comments on a recording, save it, and send it to someone else. The other person can read your comments to get enough information to continue the debugging process. This is especially helpful with issues that require people with several fields of expertise to work together.

## Comments and the Timeline

All comments appear on the [Timeline](/FrameByFrame/user-interface#timeline) as small chat bubble icons, on top of the events.

If there are multiple comments on the same frame, you can hover over the icon to see a full list with all of them. Clicking on any of them will immediately bring you to that comment.

![Example of comments on the timeline](/FrameByFrame/assets/images/screenshots/CommentsInTimeline.png)

## Saving comments

If you want to preserve your comments, you will need to re-export the recording. Comments are not automatically added to an existing saved recording. All changes in Frame by Frame are always additive, and do not modify the opened data.

## Timeline comments

These comments are attached to an specific frame.

![Timeline comment example](/FrameByFrame/assets/images/screenshots/TimelineComment.png)

Unlike property comments, timeline comments are not bound to any specific entity, so clicking on one of them won't select an entity.

They are useful to annotate frames with global information.

### How to create a timeline comment

Go to the frame where you want to add the event, right click on the timeline and select the option "Add comment in current frame".

![Adding a timeline comment](/FrameByFrame/assets/images/screenshots/AddTimelineComment.png)

## Property comments

Property comments are annotations attached to a given property of a given entity on a given frame. This means that they are bound to that specific entity on that specific frame.

They are useful for giving context information about properties and their values.

![Property comment example](/FrameByFrame/assets/images/screenshots/PropertyComment.png)

### How to create a property comment

Right click on any property. In the context menu, select the option "Add Comment".

![Adding a property comment](/FrameByFrame/assets/images/screenshots/AddPropertyComment.png)

## How to move a comment

To move a comment around the screen drag it with the left mouse button.

## How to edit a comment

To edit the content of a comment double click on it. This will allow you to freely modify the text inside the comment.

## How to delete a comment

To delete a comment first hover over the content. A circular button with an 'x' symbol should appear on the top right. Click on the button to permanently delete this comment.

**Important**: This action can't be undone.

![Example of deleting a comment](/FrameByFrame/assets/images/screenshots/DeleteComment.png)

## How to change the color of a comment

Comments can have different colors. The color changes the background of the comment

![Example comments of different colors](/FrameByFrame/assets/images/screenshots/CommentColors.png)

To change the color of a comment, first right click on a comment to open the comment context menu. Select your preferred color from the context menu and the comment will siwtch to that color.

![Example of changing the color of a comment](/FrameByFrame/assets/images/screenshots/CommentChangeColor.png)

## Comments in the Recording Info panel

A quick way of seeing all coments of a recording is opening the [Recording Info panel](/FrameByFrame/user-interface#recording-info). There you should be able to see all comments listed in the "Comments" section.

![List of all comments in the Recording Info panel](/FrameByFrame/assets/images/screenshots/RecordingInfoComments.png)

## Misc Features

Comments have a few features that might come in handy in some situations:

- **Automatic detection of links**: Comments detect URLs and automatically create a hyperlink that allows you to open it when clicked.

![Comment with a link to a URL](/FrameByFrame/assets/images/screenshots/CommentwithLink.png)

- **Link to a specific frame**: It is possible to create a link to a frame by typing "frame X" where X is a number. This will create a link to the frame with index X. When cropping a recording, the frame index is shiften to account for it.

![Comment with a link to a Frame](/FrameByFrame/assets/images/screenshots/CommentWithFrameLink.png)

- **Unicode support**: Comments have full Unicode support, which means you can create annotations in any script, or have fun adding emojis to your comments!

![Comment with text in different scripts, and emojis](/FrameByFrame/assets/images/screenshots/CommentsUnicode.png)