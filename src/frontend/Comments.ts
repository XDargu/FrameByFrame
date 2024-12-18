import { ResizeObserver } from 'resize-observer';
import * as Utils from "../utils/utils";
import * as DOMUtils from '../utils/DOMUtils';
import * as RECORDING from '../recording/RecordingData';
import { Console, LogChannel, LogLevel } from "../frontend/ConsoleController";

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

export interface IOnCommentDeletedCallback {
	(frame: number, commentId: number) : void;
}

export interface CommentCallbacks {
    getPropertyItem: IGetPropertyItemCallback;
    frameCallback: ICommentFrameClickedCallback;
    getTimelineFramePos: IGetTimelineFramePos;
    onCommentAdded :IOnCommentAddedCallback;
    onCommentDeleted :IOnCommentDeletedCallback;
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
        DOMUtils.setClass(this.lineElement, "visible", isVisible);
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

// This class owns creation and destrution of comments, as well as comment ID handling
export class CommentsData
{
    private commentId: number;
    private comments: RECORDING.IComments;

    constructor()
    {
        this.resetId();
    }

    private nextCommentId() : number
    {
        return this.commentId++;
    }

    resetId()
    {
        this.commentId = 1;
    }

    setComments(comments: RECORDING.IComments)
    {
        this.comments = comments;

        // Ensure ID is always higher than any existing one
        for (let id in comments)
        {
            const comment = comments[id];
            this.commentId = Math.max(this.commentId, comment.id + 1);
        }
    }

    deleteComment(id: number)
    {
        delete this.comments[id];
    }

    private addComment(comment: RECORDING.IPropertyComment | RECORDING.ITimelineComment)
    {
        if (this.comments[comment.id])
            Console.log(LogLevel.Error, LogChannel.Comments, "Comment with ID already exists. The old comment will be overriden");

        this.comments[comment.id] = comment;
    }

    addPropertyComment(frameId: number, entityId: number, propertyId: number, pos: RECORDING.IVec2) : RECORDING.IPropertyComment
    {
        const id = this.nextCommentId();

        const propertyComment : RECORDING.IPropertyComment = {
            id: id,
            type: RECORDING.ECommentType.Property,
            text: "",
            pos: pos,
            frameId: frameId,
            entityId: entityId,
            propertyId: propertyId,
        };
        this.addComment(propertyComment);

        return propertyComment;
    }

    addEventPropertyComment(frameId: number, entityId: number, propertyId: number, pos: RECORDING.IVec2) : RECORDING.IPropertyComment
    {
        const id = this.nextCommentId();

        const propertyComment : RECORDING.IPropertyComment = {
            id: id,
            type: RECORDING.ECommentType.EventProperty,
            text: "",
            pos: pos,
            frameId: frameId,
            entityId: entityId,
            propertyId: propertyId,
        };
        this.addComment(propertyComment);

        return propertyComment;
    }

    addTimelineComment(frameId: number, pos: RECORDING.IVec2) : RECORDING.ITimelineComment
    {
        const id = this.nextCommentId();

        const timelineComment : RECORDING.ITimelineComment = {
            id: id,
            type: RECORDING.ECommentType.Timeline,
            text: "",
            pos: pos,
            frameId: frameId,
        };
        this.addComment(timelineComment);

        return timelineComment;
    }
}

export default class Comments
{
    private comments : Map<number, Comment>;

    private currentFrame: number;
    private currentEntityId: number;
    private displayComments: boolean;

    private callbacks: CommentCallbacks;

    // Dummy comment to measure sizes
    private commentWrapper: HTMLElement;
    private commentText: HTMLElement;

    // DOM References
    private detailsPane: HTMLElement;
    private timelinePane: HTMLElement;
    private propertiesPane: HTMLElement;
    private eventsPane: HTMLElement;
    private pagePane: HTMLElement;

    private commentsData: CommentsData;

    constructor(callbacks: CommentCallbacks, recComments: RECORDING.IComments)
    {
        this.comments = new Map<number, Comment>();

        this.callbacks = callbacks;
        console.log(callbacks);

        var resizeObserver = new ResizeObserver(entries => {
            this.updatePropertyCommentsPos();
        });

        this.detailsPane = document.getElementById("detail-pane");
        this.timelinePane = document.getElementById("timeline");
        this.propertiesPane = document.getElementById("properties-container");
        this.eventsPane = document.getElementById("events-container");
        this.pagePane = document.querySelector(".full-page.page-wrapper");

        resizeObserver.observe(this.detailsPane);

        window.requestAnimationFrame(this.update.bind(this));
        
        this.commentWrapper = document.createElement("div");
        this.commentWrapper.classList.add("comment", "visible");

        this.commentText = document.createElement("div");
        this.commentText.classList.add("comment-text");
        this.commentText.textContent = "";

        this.commentWrapper.append(this.commentText);

        this.commentWrapper.style.left = -1000 + "px";
        this.commentWrapper.style.top = -1000 + "px";
        this.commentWrapper.style.zIndex = "-10000";

        this.pagePane.append(this.commentWrapper);

        this.commentsData = new CommentsData();
        this.setCommentsData(recComments);

        this.displayComments = false;
    }

    showComments(shouldDisplayComments: boolean)
    {
        this.displayComments = shouldDisplayComments;

        this.updateComments();
    }

    setCommentsData(recComments: RECORDING.IComments)
    {
        this.commentsData.setComments(recComments);

        for (let id in recComments)
        {
            const comment = recComments[id];
            this.makeComment(comment, false);
        }

        this.updateComments();
    }

    selectionChanged(frame: number, entityId: number)
    {
        this.currentFrame = frame;
        this.currentEntityId = entityId;

        this.updateComments();
    }

    private setCommentVisible(comment: Comment, isVisible: boolean)
    {
        DOMUtils.setClass(comment.element, "visible", isVisible);
        comment.lineController.setVisible(isVisible);
    }

    private clearComment(comment: Comment)
    {
        comment.element.remove();
        comment.lineController.clear();
    }

    private updateComments()
    {
        for (let comment of this.comments)
        {
            const isVisible = this.isCommentVisible(comment[1]);
            this.setCommentVisible(comment[1], isVisible);

            if (isVisible)
            {
                this.updateCommentPosition(comment[1]);
            }
        }
    }

    private isCommentVisible(comment: Comment) : boolean
    {
        if (!this.displayComments) return false;

        switch(comment.comment.type)
        {
            case RECORDING.ECommentType.Property:
            case RECORDING.ECommentType.EventProperty:
            {
                const propComment = comment.comment as RECORDING.IPropertyComment;
                return propComment.entityId == this.currentEntityId && propComment.frameId == this.currentFrame;
            }
            case RECORDING.ECommentType.Timeline:
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

    clear()
    {
        for (let comment of this.comments)
        {
            this.clearComment(comment[1]);
        }

        this.comments.clear();
        this.commentsData.resetId();
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
                        const firstVisibleParent = DOMUtils.FindFirstVisibleTree(propElement);
                        if (firstVisibleParent)
                        {
                            const propRect = firstVisibleParent.getBoundingClientRect();
                            const parentRect = this.propertiesPane.getBoundingClientRect();

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
                    const firstVisibleParent = DOMUtils.FindFirstVisibleTree(propElement);
                    if (firstVisibleParent)
                    {
                        const propRect = firstVisibleParent.getBoundingClientRect();
                        const parentRect = this.eventsPane.getBoundingClientRect();

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

                        const timelinePaneRect = this.timelinePane.getBoundingClientRect();
            
                        const x = Utils.clamp(this.callbacks.getTimelineFramePos(timelineComment.frameId), timelinePaneRect.x, timelinePaneRect.x + timelinePaneRect.width);
                        const y = timelinePaneRect.y + timelinePaneRect.height;

                        return { x: x, y: y}
                    };
                }
                break;
        }

        return () => { return { x: 0, y: 0} };
    }

    private removeComment(recComment: RECORDING.IComment)
    {
        this.commentsData.deleteComment(recComment.id);

        let comment = this.comments.get(recComment.id);
        if (comment)
        {
            this.clearComment(comment);
        }

        this.comments.delete(recComment.id);
    }

    private makeComment(recComment: RECORDING.IComment, makeVisible: boolean = true)
    {
        const wrapper = document.createElement("div");
        wrapper.classList.add("comment");

        const text = document.createElement("div");
        text.classList.add("comment-text");

        const closeBtn = document.createElement("div");
        closeBtn.classList.add("comment-close");

        const icon = document.createElement("i");
        icon.classList.add("fas", "fa-times-circle");
        closeBtn.append(icon);

        CommentContent.buildTextElement(text, recComment.text, this.callbacks.frameCallback)

        wrapper.append(closeBtn, text);

        this.pagePane.append(wrapper);

        const origin = recComment.type == RECORDING.ECommentType.Timeline ? CommentLineOrigin.Top : CommentLineOrigin.Right;

        const comment = {
            comment: recComment,
            element: wrapper,
            isEditing: false,
            lineController: new CommentLineController(this.getPropertySource(recComment), wrapper, origin)
        };
        this.comments.set(recComment.id, comment);

        // Removing the comment
        closeBtn.onclick = () =>
        {
            this.removeComment(recComment);

            switch(recComment.type)
            {
                case RECORDING.ECommentType.Property:
                case RECORDING.ECommentType.EventProperty:
                    this.callbacks.onCommentDeleted((recComment as RECORDING.IPropertyComment).frameId, recComment.id);
                    break;
                case RECORDING.ECommentType.Timeline:
                    this.callbacks.onCommentDeleted((recComment as RECORDING.ITimelineComment).frameId, recComment.id);
                    break;
            }
        };

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
    
                this.updateCommentPosition(comment);
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

            DOMUtils.setClass(comment.element, "editing", true);

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
                DOMUtils.setClass(comment.element, "editing", false);
            }

            textarea.oninput = () =>
            {
                resizeArea();
            }

            comment.element.appendChild(textarea);
            textarea.focus();

            resizeArea();
        };

        this.updateCommentPosition(this.comments.get(recComment.id));

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

        this.setCommentVisible(comment, makeVisible);
    }

    addPropertyComment(frameId: number, entityId: number, propertyId: number)
    {
        // Calc initial pos
        const propertyElement = this.callbacks.getPropertyItem(propertyId);

        const detailPaneRect = this.detailsPane.getBoundingClientRect();
        const propertyElementRect = propertyElement.getBoundingClientRect();

        const x = -150;
        const y = propertyElementRect.y - detailPaneRect.y;

        const propertyComment = this.commentsData.addPropertyComment(frameId, entityId, propertyId, { x: x, y: y });
        this.makeComment(propertyComment);
        this.editComment(propertyComment.id);
    }

    addEventPropertyComment(frameId: number, entityId: number, propertyId: number)
    {
        // Calc initial pos
        const propertyElement = this.callbacks.getPropertyItem(propertyId);

        const detailPaneRect = this.detailsPane.getBoundingClientRect();
        const propertyElementRect = propertyElement.getBoundingClientRect();

        const x = -150;
        const y = propertyElementRect.y - (detailPaneRect.y + detailPaneRect.height);

        const propertyComment = this.commentsData.addEventPropertyComment(frameId, entityId, propertyId, { x: x, y: y });
        this.makeComment(propertyComment);
        this.editComment(propertyComment.id);
    }

    addTimelineComment(frameId: number)
    {
        // Calc initial pos
        const timelinePaneRect = this.timelinePane.getBoundingClientRect();

        const defaultCommentWidth = 50;
        const x = Utils.clamp(this.callbacks.getTimelineFramePos(frameId) - defaultCommentWidth, defaultCommentWidth, window.innerWidth - defaultCommentWidth * 2);
        const y = timelinePaneRect.y + 10;

        const timelineComment = this.commentsData.addTimelineComment(frameId, { x: x, y: y });
        this.makeComment(timelineComment);
        this.editComment(timelineComment.id);
    }

    private calcCommentPosition(comment: RECORDING.IComment) : RECORDING.IVec2
    {
        switch(comment.type)
        {
            case RECORDING.ECommentType.Property:
            {
                const detailPaneRect = this.detailsPane.getBoundingClientRect();
                return { x: detailPaneRect.x + comment.pos.x, y: detailPaneRect.y + comment.pos.y };
            }
            case RECORDING.ECommentType.EventProperty:
            {
                const detailPaneRect = this.detailsPane.getBoundingClientRect();
                return { x: detailPaneRect.x + comment.pos.x, y: detailPaneRect.y + detailPaneRect.height + comment.pos.y };
            }
            case RECORDING.ECommentType.Timeline:
            {
                const timelinePaneRect = this.timelinePane.getBoundingClientRect();
                return { x: timelinePaneRect.x + comment.pos.x, y: timelinePaneRect.y + comment.pos.y };
            }
        }
    }

    private updateCommentPosition(comment: Comment)
    {
        const pos = this.calcCommentPosition(comment.comment);

        comment.element.style.left = pos.x + "px";
        comment.element.style.top = pos.y + "px";
    }

    private updatePropertyCommentsPos()
    {
        for (let comment of this.comments)
        {
            if (this.isCommentVisible(comment[1]))
                this.updateCommentPosition(comment[1]);
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