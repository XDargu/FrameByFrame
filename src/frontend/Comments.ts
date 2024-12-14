import { ResizeObserver } from 'resize-observer';
import * as Utils from "../utils/utils";
import * as RECORDING from '../recording/RecordingData';

export interface IGetPropertyItemCallback {
    (propertyId: number) : HTMLElement;
}

interface ICommentFrameClickedCallback {
	(frame: number) : void;
}

class Comment
{
    comment: RECORDING.IComment;
    element: HTMLElement;
    isEditing: boolean;
    lineController: CommentLineController;
}

class CommentLineController
{
    private propertyId: number = 0;
    private getPropertyItem: IGetPropertyItemCallback;
    private originElement: HTMLElement;
    private targetElement: HTMLElement;
    private lineElement: HTMLElement;
    
    constructor(getPropertyItem: IGetPropertyItemCallback, originElement: HTMLElement, propertyId: number)
    {
        this.getPropertyItem = getPropertyItem;

        this.originElement = originElement;
        this.targetElement = null;
        this.propertyId = propertyId;

        this.lineElement = document.createElement("div");
        this.lineElement.classList.add("comment-line");
        this.lineElement.style.backgroundColor = `#ccc`;

        document.body.append(this.lineElement);
    }

    public setVisible(isVisible: boolean)
    {
        Utils.setClass(this.lineElement, "disabled", !isVisible);
    }

    updateShapeLine()
    {
        this.targetElement = this.getPropertyItem(this.propertyId);

        // Disable if needed
        if (this.targetElement != null)
        {
            const originRect = this.originElement.getBoundingClientRect()
            const targetRect = this.targetElement.getBoundingClientRect()

            const commentOffsetX = originRect.width;
            const commentOffsetY = originRect.height / 2;
            const propertyOffsetY = 6;

            // Find the points based off the elements left and top
            let p1 = { x: originRect.x + commentOffsetX, y: originRect.y + commentOffsetY };
            let p2 = { x: targetRect.x, y: targetRect.y + propertyOffsetY };

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
                a.target = "_blank";
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

    private getPropertyItem: IGetPropertyItemCallback;
    private frameCallback: ICommentFrameClickedCallback;

    // Dummy comment to measure sizes
    private commentWrapper: HTMLElement;
    private commentText: HTMLElement;

    constructor(getPropertyItem: IGetPropertyItemCallback, frameCallback: ICommentFrameClickedCallback)
    {
        this.comments = new Map<number, Comment>();
        this.commentId = 1;

        this.getPropertyItem = getPropertyItem;
        this.frameCallback = frameCallback;

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
        if (comment.comment.type == RECORDING.ECommentType.Property)
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
        }

        this.comments.clear();
        this.commentId = 1;
    }

    loadComments(comments: RECORDING.IComments)
    {
        for (let id in comments)
        {
            const comment = comments[id];
            this.commentId = Math.max(this.commentId, comment.id + 1);
            switch(comment.type)
            {
                case RECORDING.ECommentType.Property:
                    {
                        this.makePropertyComment(comment as RECORDING.IPropertyComment);
                    }
                    break;
                case RECORDING.ECommentType.Timeline:
                    break;
            }
        }
    }

    private makePropertyComment(recComment: RECORDING.IPropertyComment)
    {
        const wrapper = document.createElement("div");
        wrapper.classList.add("comment");

        const text = document.createElement("div");
        text.classList.add("comment-text");

        CommentContent.buildTextElement(text, recComment.text, this.frameCallback)

        wrapper.append(text);

        let page = document.querySelector(".full-page.page-wrapper");
        page.append(wrapper);

        this.comments.set(recComment.id, {
            comment: recComment,
            element: wrapper,
            isEditing: false,
            lineController: new CommentLineController(this.getPropertyItem, wrapper, recComment.propertyId)
        });

        // Dragging the comment around
        let pan = (e: MouseEvent) =>
        {
            let comment = this.comments.get(recComment.id);
            comment.comment.pos.x += e.movementX / window.devicePixelRatio;
            comment.comment.pos.y += e.movementY / window.devicePixelRatio;

            this.setPropertyCommentPosition(comment);
        }
            
        let stopPan = () =>
        {
            document.removeEventListener('mousemove', pan)
        }

        wrapper.addEventListener('mousedown', (e) =>
        {
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
                CommentContent.buildTextElement(this.commentText, textarea.value, this.frameCallback);

                const textRect = this.commentText.getBoundingClientRect();

                textarea.style.width = textRect.width + "px";
                textarea.style.height = textRect.height + "px";
            };

            textarea.value = content;

            textarea.onblur = () =>
            {
                const val = textarea.value;

                comment.comment.text = val;
                CommentContent.buildTextElement(text, val, this.frameCallback);

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
    }

    addPropertyComment(recording: RECORDING.NaiveRecordedData, frameId: number, entityId: number, propertyId: number)
    {
        // Add to recording
        const id = this.nextCommentId();

        // Calc initial pos
        const propertyElement = this.getPropertyItem(propertyId);
        const detailPane = document.getElementById("detail-pane");

        const detailPaneRect = detailPane.getBoundingClientRect();
        const propertyElementRect = propertyElement.getBoundingClientRect();

        const x = -150;
        const y = propertyElementRect.y - detailPaneRect.y;

        let propertyComment : RECORDING.IPropertyComment = {
            id: id,
            type: RECORDING.ECommentType.Property,
            text: "Example comment",
            pos: { x: x, y: y },
            frameId: frameId,
            entityId: entityId,
            propertyId: propertyId,
        };
        recording.comments[id] = propertyComment;

        this.makePropertyComment(propertyComment);
    }

    private setPropertyCommentPosition(comment: Comment)
    {
        const detailPane = document.getElementById("detail-pane");

        const detailPaneRect = detailPane.getBoundingClientRect();

        comment.element.style.left = detailPaneRect.x + comment.comment.pos.x + "px";
        comment.element.style.top = detailPaneRect.y + comment.comment.pos.y + "px";
    }

    private updatePropertyCommentsPos()
    {
        for (let comment of this.comments)
        {
            if (this.isCommentVisible(comment[1]))
                this.setPropertyCommentPosition(comment[1]);
        }
    }
}