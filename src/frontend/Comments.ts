import { ResizeObserver } from 'resize-observer';
import * as Utils from "../utils/utils";
import * as RECORDING from '../recording/RecordingData';

export interface IGetPropertyItemCallback {
    (propertyId: number) : HTMLElement;
}

export interface IGetCommentLineSource {
    () : RECORDING.IVec2
}

export interface ICommentFrameClickedCallback {
	(frame: number) : void;
}

export interface IGetTimelineFramePos {
	(frame: number) : number;
}

export interface IOnCommentAddedCallback {
	(frame: number, commentId: number) : void;
}

export interface CommentCallbacks {
    getPropertyItem: IGetPropertyItemCallback;
    frameCallback: ICommentFrameClickedCallback;
    getTimelineFramePos: IGetTimelineFramePos;
    onCommentAdded :IOnCommentAddedCallback;
}

class Comment
{
    comment: RECORDING.IComment;
    element: HTMLElement;
    isEditing: boolean;
    lineController: CommentLineController;
}

enum CommentLineOrigin
{
    Right,
    Top
}

class CommentLineController
{
    private getSource: IGetCommentLineSource;
    private originElement: HTMLElement;
    private lineElement: HTMLElement;
    private origin: CommentLineOrigin;
    
    constructor(getSource: IGetCommentLineSource, originElement: HTMLElement, origin: CommentLineOrigin)
    {
        this.getSource = getSource;

        this.originElement = originElement;
        this.origin = origin;

        this.lineElement = document.createElement("div");
        this.lineElement.classList.add("comment-line");
        this.lineElement.style.backgroundColor = `#ccc`;

        document.body.append(this.lineElement);
    }

    public clear()
    {
        this.lineElement.remove();
    }

    public setVisible(isVisible: boolean)
    {
        Utils.setClass(this.lineElement, "disabled", !isVisible);
    }

    updateShapeLine()
    {
        const sourcePos = this.getSource();

        // Disable if needed
        if (sourcePos)
        {
            const originRect = this.originElement.getBoundingClientRect()

            let commentOffsetX = originRect.width;
            let commentOffsetY = originRect.height / 2;

            if (this.origin == CommentLineOrigin.Top)
            {
                commentOffsetX = originRect.width / 2;
                commentOffsetY = 0;
            }

            // Find the points based off the elements left and top
            let p1 = { x: originRect.x + commentOffsetX, y: originRect.y + commentOffsetY };
            let p2 = { x: sourcePos.x, y: sourcePos.y };

            // Get distance between the points for length of line
            const a = p1.x - p2.x;
            const b = p1.y - p2.y;

            const length = Math.sqrt( a*a + b*b );

            // Get angle between points
            const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angleDeg = angleRad * 180 / Math.PI;

            // Set line distance and position
            // Add width/height from above so the line starts in the middle instead of the top-left corner
            this.lineElement.style.width = length + 'px';
            this.lineElement.style.left = (p1.x)+ 'px';
            this.lineElement.style.top = (p1.y) + 'px';

            // Rotate line to match angle between points
            this.lineElement.style.transform = "rotate(" + angleDeg + "deg)";
        }
    }
}

namespace CommentContent
{
    export function buildTextElement(target: HTMLElement, commentText: string, frameCallback: ICommentFrameClickedCallback)
    {
        const urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
        const frameRegex = /(frame [0-9]+)/;

        target.innerHTML = "";

        // Add trailing space, otherwise the line break is not displayed correctly
        let text = commentText;
        if (text.endsWith("\n"))
            text += " ";

        const urlSections = text.split(urlRegex);

        // Detect URLs
        for (let urlSection of urlSections)
        {
            if (urlRegex.test(urlSection))
            {
                let a = document.createElement("a");
                a.classList.add("comment-link");
                a.innerText = urlSection;
                a.href = urlSection;
                a.onclick = (e) => {
                    e.preventDefault();
                    require("electron").shell.openExternal(urlSection);
                }
                target.append(a);
            }
            else
            {
                // Detect frames
                const frameSections = urlSection.split(frameRegex);
                for (let frameSection of frameSections)
                {
                    if (frameRegex.test(frameSection))
                    {
                        const frame = frameSection.substring(6);

                        let a = document.createElement("b");
                        a.classList.add("comment-link");
                        a.innerText = frameSection;
                        a.onclick = () => { frameCallback(parseInt(frame)) };
                        target.append(a);
                    }
                    else
                    {
                        target.append(frameSection);
                    }
                }
            }
        }
    }
}

export default class Comments
{
    private comments : Map<number, Comment>;
    private commentId: number;

    private currentFrame: number;
    private currentEntityId: number;

    private callbacks: CommentCallbacks;

    // Dummy comment to measure sizes
    private commentWrapper: HTMLElement;
    private commentText: HTMLElement;

    constructor(callbacks: CommentCallbacks)
    {
        this.comments = new Map<number, Comment>();
        this.commentId = 1;

        this.callbacks = callbacks;
        console.log(callbacks);

        var resizeObserver = new ResizeObserver(entries => {
            this.updatePropertyCommentsPos();
        });
        const detailPane = document.getElementById("detail-pane");
        resizeObserver.observe(detailPane);

        window.requestAnimationFrame(this.update.bind(this));
        
        this.commentWrapper = document.createElement("div");
        this.commentWrapper.classList.add("comment");

        this.commentText = document.createElement("div");
        this.commentText.classList.add("comment-text");
        this.commentText.textContent = "";

        this.commentWrapper.append(this.commentText);

        this.commentWrapper.style.left = -1000 + "px";
        this.commentWrapper.style.top = -1000 + "px";
        this.commentWrapper.style.zIndex = "-10000";

        let page = document.querySelector(".full-page.page-wrapper");
        page.append(this.commentWrapper);
    }

    selectionChanged(frame: number, entityId: number)
    {
        this.currentFrame = frame;
        this.currentEntityId = entityId;

        this.updateComments();
    }

    private updateComments()
    {
        for (let comment of this.comments)
        {
            const isVisible = this.isCommentVisible(comment[1]);
            Utils.setClass(comment[1].element, "disabled", !isVisible);
            comment[1].lineController.setVisible(isVisible);

            if (isVisible)
            {
                this.setPropertyCommentPosition(comment[1]);
            }
        }
        
    }

    private isCommentVisible(comment: Comment) : boolean
    {
        if (comment.comment.type == RECORDING.ECommentType.Property || comment.comment.type == RECORDING.ECommentType.EventProperty)
        {
            const propComment = comment.comment as RECORDING.IPropertyComment;
            return propComment.entityId == this.currentEntityId && propComment.frameId == this.currentFrame;
        }

        if (comment.comment.type == RECORDING.ECommentType.Timeline)
        {
            return true;
        }

        return false;
    }

    private update()
    {
        // Update lines
        for (let comment of this.comments)
        {
            comment[1].lineController.updateShapeLine();
        }

        window.requestAnimationFrame(this.update.bind(this));
    }

    private nextCommentId() : number
    {
        return this.commentId++;
    }

    clear()
    {
        for (let comment of this.comments)
        {
            comment[1].element.remove();
            comment[1].lineController.clear();
        }

        this.comments.clear();
        this.commentId = 1;
    }

    getPropertySource(comment: RECORDING.IComment) : IGetCommentLineSource
    {
        switch(comment.type)
        {
            case RECORDING.ECommentType.Property:
                {
                    const propComment = comment as RECORDING.IPropertyComment;
                    return () =>
                    {
                        const propElement = this.callbacks.getPropertyItem(propComment.propertyId);
                        const firstVisibleParent = Utils.FindFirstVisibleTree(propElement);
                        if (firstVisibleParent)
                        {
                            const propRect = firstVisibleParent.getBoundingClientRect();

                            const propsContainer = document.getElementById("properties-container");
                            const parentRect = propsContainer.getBoundingClientRect();

                            const propOffset = 12;
                            const y = Utils.clamp(propRect.y + propOffset, parentRect.y, parentRect.y + parentRect.height)

                            return { x: propRect.x, y: y }
                        }

                        return { x: 0, y: 0 }
                    };
                }
                break;
            case RECORDING.ECommentType.EventProperty:
            {
                const propComment = comment as RECORDING.IPropertyComment;
                return () =>
                {
                    const propElement = this.callbacks.getPropertyItem(propComment.propertyId);
                    const firstVisibleParent = Utils.FindFirstVisibleTree(propElement);
                    if (firstVisibleParent)
                    {
                        const propRect = firstVisibleParent.getBoundingClientRect();

                        const propsContainer = document.getElementById("events-container");
                        const parentRect = propsContainer.getBoundingClientRect();

                        const propOffset = 12;
                        const y = Utils.clamp(propRect.y + propOffset, parentRect.y, parentRect.y + parentRect.height)

                        return { x: propRect.x, y: y }
                    }

                    return { x: 0, y: 0 }
                };
            }
            break;
            case RECORDING.ECommentType.Timeline:
                {
                    const timelineComment = comment as RECORDING.ITimelineComment;

                    return () => {

                        const timelinePane = document.getElementById("timeline");
                        const timelinePaneRect = timelinePane.getBoundingClientRect();
            
                        const x = Utils.clamp(this.callbacks.getTimelineFramePos(timelineComment.frameId), timelinePaneRect.x, timelinePaneRect.x + timelinePaneRect.width);
                        const y = timelinePaneRect.y + timelinePaneRect.height;

                        return { x: x, y: y}
                    };
                }
                break;
        }

        return () => { return { x: 0, y: 0} };
    }

    loadComments(comments: RECORDING.IComments)
    {
        for (let id in comments)
        {
            const comment = comments[id];
            this.commentId = Math.max(this.commentId, comment.id + 1);
            this.makeComment(comment);
        }
    }

    private makeComment(recComment: RECORDING.IComment)
    {
        const wrapper = document.createElement("div");
        wrapper.classList.add("comment");

        const text = document.createElement("div");
        text.classList.add("comment-text");

        CommentContent.buildTextElement(text, recComment.text, this.callbacks.frameCallback)

        wrapper.append(text);

        let page = document.querySelector(".full-page.page-wrapper");
        page.append(wrapper);

        const origin = recComment.type == RECORDING.ECommentType.Timeline ? CommentLineOrigin.Top : CommentLineOrigin.Right;

        this.comments.set(recComment.id, {
            comment: recComment,
            element: wrapper,
            isEditing: false,
            lineController: new CommentLineController(this.getPropertySource(recComment), wrapper, origin)
        });

        // Dragging the comment around
        wrapper.addEventListener('mousedown', (e) =>
        {
            let initX = e.x;
            let initY = e.y;

            let pan = (e: MouseEvent) =>
            {
                let comment = this.comments.get(recComment.id);
                const deltaX = e.x - initX;
                const deltaY = e.y - initY;
                comment.comment.pos.x += deltaX;
                comment.comment.pos.y += deltaY;

                initX = e.x;
                initY = e.y;
    
                this.setPropertyCommentPosition(comment);
            }
                
            let stopPan = () =>
            {
                document.removeEventListener('mousemove', pan)
            }

            let comment = this.comments.get(recComment.id);
            if (!comment.isEditing)
            {
                e.preventDefault();
                document.addEventListener('mousemove', pan);
                document.addEventListener('mouseup', stopPan);
            }
        });

        // Editing
        wrapper.ondblclick = () =>
        {
            let comment = this.comments.get(recComment.id);
            if (comment.isEditing)
                return;

            comment.isEditing = true;

            Utils.setClass(comment.element, "editing", true);

            let content = comment.comment.text;
            let textarea = document.createElement("textarea");
            textarea.classList.add("comment-editing");

            let resizeArea = () => {

                // Use dummy comment to measure text
                CommentContent.buildTextElement(this.commentText, textarea.value, this.callbacks.frameCallback);

                const textRect = this.commentText.getBoundingClientRect();

                textarea.style.width = textRect.width + "px";
                textarea.style.height = textRect.height + "px";
            };

            textarea.value = content;

            textarea.onblur = () =>
            {
                const val = textarea.value;

                comment.comment.text = val;
                CommentContent.buildTextElement(text, val, this.callbacks.frameCallback);

                comment.element.removeChild(textarea);
                comment.isEditing = false;
                Utils.setClass(comment.element, "editing", false);
            }

            textarea.oninput = () =>
            {
                resizeArea();
            }

            comment.element.appendChild(textarea);
            textarea.focus();

            resizeArea();
        };

        this.setPropertyCommentPosition(this.comments.get(recComment.id));

        switch(recComment.type)
        {
            case RECORDING.ECommentType.Property:
            case RECORDING.ECommentType.EventProperty:
                this.callbacks.onCommentAdded((recComment as RECORDING.IPropertyComment).frameId, recComment.id);
                break;
            case RECORDING.ECommentType.Timeline:
                this.callbacks.onCommentAdded((recComment as RECORDING.ITimelineComment).frameId, recComment.id);
                break;
        }
    }

    addPropertyComment(recording: RECORDING.NaiveRecordedData, frameId: number, entityId: number, propertyId: number)
    {
        // Add to recording
        const id = this.nextCommentId();

        // Calc initial pos
        const propertyElement = this.callbacks.getPropertyItem(propertyId);
        const detailPane = document.getElementById("detail-pane");

        const detailPaneRect = detailPane.getBoundingClientRect();
        const propertyElementRect = propertyElement.getBoundingClientRect();

        const x = -150;
        const y = propertyElementRect.y - detailPaneRect.y;

        let propertyComment : RECORDING.IPropertyComment = {
            id: id,
            type: RECORDING.ECommentType.Property,
            text: "",
            pos: { x: x, y: y },
            frameId: frameId,
            entityId: entityId,
            propertyId: propertyId,
        };
        recording.comments[id] = propertyComment;

        this.makeComment(propertyComment);

        this.editComment(id);
    }

    addEventPropertyComment(recording: RECORDING.NaiveRecordedData, frameId: number, entityId: number, propertyId: number)
    {
        // Add to recording
        const id = this.nextCommentId();

        // Calc initial pos
        const propertyElement = this.callbacks.getPropertyItem(propertyId);
        const detailPane = document.getElementById("detail-pane");

        const detailPaneRect = detailPane.getBoundingClientRect();
        const propertyElementRect = propertyElement.getBoundingClientRect();

        const x = -150;
        const y = propertyElementRect.y - (detailPaneRect.y + detailPaneRect.height);

        let propertyComment : RECORDING.IPropertyComment = {
            id: id,
            type: RECORDING.ECommentType.EventProperty,
            text: "",
            pos: { x: x, y: y },
            frameId: frameId,
            entityId: entityId,
            propertyId: propertyId,
        };
        recording.comments[id] = propertyComment;

        this.makeComment(propertyComment);

        this.editComment(id);
    }

    addTimelineComment(recording: RECORDING.NaiveRecordedData, frameId: number)
    {
        // Add to recording
        const id = this.nextCommentId();

        // Calc initial pos
        const timelinePane = document.getElementById("timeline");

        const timelinePaneRect = timelinePane.getBoundingClientRect();

        const defaultCommentWidth = 50;
        const x = Utils.clamp(this.callbacks.getTimelineFramePos(frameId) - defaultCommentWidth, defaultCommentWidth, window.innerWidth - defaultCommentWidth * 2);
        const y = timelinePaneRect.y + 10;

        let timelineComment : RECORDING.ITimelineComment = {
            id: id,
            type: RECORDING.ECommentType.Timeline,
            text: "",
            pos: { x: x, y: y },
            frameId: frameId,
        };
        recording.comments[id] = timelineComment;

        this.makeComment(timelineComment);

        this.editComment(id);
    }

    private setPropertyCommentPosition(comment: Comment)
    {
        if (comment.comment.type == RECORDING.ECommentType.Property)
        {
            const detailPane = document.getElementById("detail-pane");

            const detailPaneRect = detailPane.getBoundingClientRect();

            comment.element.style.left = detailPaneRect.x + comment.comment.pos.x + "px";
            comment.element.style.top = detailPaneRect.y + comment.comment.pos.y + "px";
        }
        else if (comment.comment.type == RECORDING.ECommentType.EventProperty)
        {
            const detailPane = document.getElementById("detail-pane");

            const detailPaneRect = detailPane.getBoundingClientRect();

            comment.element.style.left = detailPaneRect.x + comment.comment.pos.x + "px";
            comment.element.style.top = detailPaneRect.y + detailPaneRect.height + comment.comment.pos.y + "px";
        }
        else if (comment.comment.type == RECORDING.ECommentType.Timeline)
        {
            const timelinePane = document.getElementById("timeline");
            const timelinePaneRect = timelinePane.getBoundingClientRect();

            comment.element.style.left = timelinePaneRect.x + comment.comment.pos.x + "px";
            comment.element.style.top = timelinePaneRect.y + comment.comment.pos.y + "px";
        }
    }

    private updatePropertyCommentsPos()
    {
        for (let comment of this.comments)
        {
            if (this.isCommentVisible(comment[1]))
                this.setPropertyCommentPosition(comment[1]);
        }
    }

    private editComment(id: number)
    {
        const comment = this.comments.get(id);
        if (comment)
        {
            const event = new MouseEvent('dblclick', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            });
            comment.element.dispatchEvent(event);
        }
    }
}