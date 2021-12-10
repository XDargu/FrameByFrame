import { LogLevel } from "../frontend/ConsoleController";
import { LogChannel } from "../frontend/ConsoleController";
import { Console } from "../frontend/ConsoleController";
import Renderer from "../renderer";
import Timeline, { findEventOfEntityId, ITimelineEvent } from "./timeline";

export class PlaybackController {

    private renderer: Renderer;
    private timeline: Timeline;
    private isPlaying: boolean;
    private elapsedTime: number;
    private playbackSpeedFactor: number;

    constructor(renderer: Renderer, timeline: Timeline) {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.renderer = renderer;
        this.timeline = timeline;
        this.playbackSpeedFactor = 1;

        this.initialize();
    }

    initialize()
    {
        const speeds = [0.1, 0.2, 0.5, 0.75, 1, 1.5, 2, 5, 10];
        let playBackSlider: HTMLInputElement = document.getElementById("playback-speed") as HTMLInputElement;
        let playbackDisplay: HTMLElement = document.getElementById("playback-display");
        playBackSlider.oninput = () => {
            const playbackSpeed = speeds[Number.parseInt(playBackSlider.value)];
            Console.log(LogLevel.Verbose, LogChannel.Default, "Playback speed changed to: " + playbackSpeed);
            this.playbackSpeedFactor = playbackSpeed;
            playbackDisplay.innerText = "x" + playbackSpeed;
        };
    }

    update(elapsedSeconds: number) {
        if (this.isPlaying && this.renderer.getFrameCount() == 0) {
            this.stopPlayback();
        }

        if (this.isPlaying) {
            this.elapsedTime += elapsedSeconds * this.playbackSpeedFactor;

            const nextFrame = this.findNextPlayableFrameSameClient() || this.findNextPlayableFrameAnyClient();

            this.renderer.applyFrame(nextFrame);

            // Stop in the last frame
            if (nextFrame == this.renderer.getFrameCount() - 1) {
                this.stopPlayback();
            }
        }
    }

    findNextPlayableFrameSameClient() : number
    {
        // Check how many frames we have to skip
        let currentFrame = this.renderer.getCurrentFrame();
        let currentElapsedTime = this.renderer.getElapsedTimeOfFrame(currentFrame);
        const initialClientId = this.renderer.getClientIdOfFrame(currentFrame);
        const initialServerTime = this.renderer.getServerTimeOfFrame(currentFrame);

        let pendingElapsedTime = this.elapsedTime;

        while (pendingElapsedTime > currentElapsedTime && currentFrame < this.renderer.getFrameCount() - 1) {
            currentFrame++;

            if (this.renderer.getClientIdOfFrame(currentFrame) == initialClientId) {
                pendingElapsedTime -= currentElapsedTime;
                currentElapsedTime = this.renderer.getElapsedTimeOfFrame(currentFrame);
            }

            if (this.renderer.getServerTimeOfFrame(currentFrame) - initialServerTime > 5000) {
                return null;
            }
        }

        this.elapsedTime = pendingElapsedTime;
        return currentFrame;
    }

    findNextPlayableFrameAnyClient() : number
    {
        // Check how many frames we have to skip
        let currentFrame = this.renderer.getCurrentFrame();
        const initialServerTime = this.renderer.getServerTimeOfFrame(currentFrame);

        let pendingElapsedTime = this.elapsedTime;

        while (currentFrame < this.renderer.getFrameCount() - 1) {
            currentFrame++;
            const elapsedTimeInSeconds = (this.renderer.getServerTimeOfFrame(currentFrame) - initialServerTime) / 1000;

            if (elapsedTimeInSeconds > pendingElapsedTime)
            {
                this.elapsedTime -= elapsedTimeInSeconds;
                return currentFrame;
            }
        }

        return this.renderer.getFrameCount() - 1;
    }

    updateUI() {
        const recordingEmpty = this.renderer.getFrameCount() == 0;
        const isLastFrame = recordingEmpty || (this.renderer.getCurrentFrame() == this.renderer.getFrameCount() - 1);
        const isFirstFrame = recordingEmpty || (this.renderer.getCurrentFrame() == 0);

        // TODO: Optimize this
        const prevEvent = this.getPreviousEventFrame(false);
        const nextEvent = this.getNextEventFrame(false);

        if (this.isPlaying) {
            document.getElementById("timeline-play-icon").classList.remove("fa-play");
            document.getElementById("timeline-play-icon").classList.add("fa-stop");
        }
        else {
            document.getElementById("timeline-play-icon").classList.remove("fa-stop");
            document.getElementById("timeline-play-icon").classList.add("fa-play");

            if (isLastFrame)
                document.getElementById("timeline-play").classList.add("basico-disabled");
            else
                document.getElementById("timeline-play").classList.remove("basico-disabled");
        }

        if (isFirstFrame) {
            document.getElementById("timeline-first").classList.add("basico-disabled");
            document.getElementById("timeline-prev").classList.add("basico-disabled");
        }
        else {
            document.getElementById("timeline-first").classList.remove("basico-disabled");
            document.getElementById("timeline-prev").classList.remove("basico-disabled");
        }

        if (isLastFrame) {
            document.getElementById("timeline-last").classList.add("basico-disabled");
            document.getElementById("timeline-next").classList.add("basico-disabled");
        }
        else {
            document.getElementById("timeline-last").classList.remove("basico-disabled");
            document.getElementById("timeline-next").classList.remove("basico-disabled");
        }

        if (!prevEvent) {
            document.getElementById("timeline-event-prev").classList.add("basico-disabled");
        }
        else {
            document.getElementById("timeline-event-prev").classList.remove("basico-disabled");
        }

        if (!nextEvent) {
            document.getElementById("timeline-event-next").classList.add("basico-disabled");
        }
        else {
            document.getElementById("timeline-event-next").classList.remove("basico-disabled");
        }
    }

    startPlayback() {
        if (this.renderer.getFrameCount() > 0) {
            this.isPlaying = true;
        }
        this.updateUI();
    }

    stopPlayback() {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.updateUI();
    }

    onTimelineNextClicked() {
        if (this.renderer.getCurrentFrame() < this.renderer.getFrameCount() - 1) {
            this.renderer.applyFrame(this.renderer.getCurrentFrame() + 1);
            this.updateUI();
        }
    }

    onTimelinePrevClicked() {
        if (this.renderer.getCurrentFrame() > 0) {
            this.renderer.applyFrame(this.renderer.getCurrentFrame() - 1);
            this.updateUI();
        }
    }

    onTimelineFirstClicked() {
        if (this.renderer.getCurrentFrame() != 0) {
            this.renderer.applyFrame(0);
            this.updateUI();
        }
    }

    onTimelineLastClicked() {
        if (this.renderer.getCurrentFrame() != this.renderer.getFrameCount() - 1) {
            this.renderer.applyFrame(this.renderer.getFrameCount() - 1);
            this.updateUI();
        }
    }

    onTimelinePrevEventClicked(filterSelection: boolean) {
        const prevEvent = this.getPreviousEventFrame(filterSelection);
        if (prevEvent) {
            this.renderer.applyFrame(prevEvent.frame);
            this.renderer.selectEntity(Number.parseInt(prevEvent.entityId))
            this.updateUI();
        }
    }

    onTimelineNextEventClicked(filterSelection: boolean) {
        const nextEvent = this.getNextEventFrame(filterSelection);
        if (nextEvent) {
            this.renderer.applyFrame(nextEvent.frame);
            this.renderer.selectEntity(Number.parseInt(nextEvent.entityId))
            this.updateUI();
        }
    }

    onTimelinePlayClicked() {
        if (!this.isPlaying) {
            this.startPlayback();
        }

        else {
            this.stopPlayback();
        }
    }

    getPreviousEventFrame(filterSelection: boolean) : ITimelineEvent
    {
        // TODO: Optimize this
        const entity = this.timeline.selectedEntityId.toString();
        for (let i=this.renderer.getCurrentFrame() - 1; i>= 0; --i)
        {
            const eventList = this.timeline.getEventsInFrame(i);
            if (eventList)
            {
                if (!filterSelection)
                {
                    return eventList[0];
                }
                else
                {
                    const result = findEventOfEntityId(eventList, entity);
                    if (result)
                    {
                        return result;
                    }
                }
            }
        }

        return undefined;
    }

    getNextEventFrame(filterSelection: boolean) : ITimelineEvent
    {
        // TODO: Optimize this
        const entity = this.timeline.selectedEntityId.toString();
        for (let i=this.renderer.getCurrentFrame() + 1; i< this.renderer.getFrameCount() - 1; ++i)
        {
            const eventList = this.timeline.getEventsInFrame(i);
            if (eventList)
            {
                if (!filterSelection)
                {
                    return eventList[0];
                }
                else
                {
                    const result = findEventOfEntityId(eventList, entity);
                    if (result)
                    {
                        return result;
                    }
                }
            }
        }

        return undefined;
    }
}
