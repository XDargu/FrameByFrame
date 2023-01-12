import * as Utils from '../utils/utils';
import { LogLevel, LogChannel, Console } from "../frontend/ConsoleController";
import Renderer from "../renderer";
import Timeline, { findEventOfEntityId, ITimelineEvent } from "./timeline";

interface PlaybackResult
{
    nextFrame: number;
    nextElapsedTime: number;
}

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

            const lastFrame = this.getLastFrame();
            const playbackResult = this.findNextPlayableFrameSameClient() || this.findNextPlayableFrameAnyClient();
            this.elapsedTime = playbackResult.nextElapsedTime;
            const nextFrame = Utils.clamp(playbackResult.nextFrame, this.renderer.getCurrentFrame(), lastFrame);
            this.renderer.applyFrame(nextFrame);

            // Stop in the last frame
            if (nextFrame == lastFrame) {
                this.stopPlayback();
            }
        }
    }

    isInSelection()
    {
        return this.timeline.getCurrentFrame() >= this.timeline.getSelectionInit() &&
            this.timeline.getCurrentFrame() <= this.timeline.getSelectionEnd();
    }

    getFirstFrame(fromSelectionOnly: boolean = false)
    {
        if (fromSelectionOnly || this.isInSelection())
            return this.timeline.getSelectionInit();
        return 0;
    }

    getLastFrame(fromSelectionOnly: boolean = false)
    {
        if (fromSelectionOnly || this.isInSelection())
            return this.timeline.getSelectionEnd();
        return this.timeline.getLength() - 1;
    }

    findNextPlayableFrameSameClient() : PlaybackResult
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

        return { nextFrame: currentFrame, nextElapsedTime: pendingElapsedTime};
    }

    findNextPlayableFrameAnyClient() : PlaybackResult
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
                pendingElapsedTime -= elapsedTimeInSeconds;
                return { nextFrame: currentFrame, nextElapsedTime: pendingElapsedTime};
            }
        }

        return { nextFrame: this.renderer.getFrameCount() - 1, nextElapsedTime: this.elapsedTime};
    }

    updateUI() {
        const firstFrame = this.getFirstFrame(true);
        const lastFrame = this.getLastFrame(true);

        const recordingEmpty = this.renderer.getFrameCount() == 0;
        const isLastFrame = recordingEmpty || (this.timeline.getCurrentFrame() == lastFrame);
        const isFirstFrame = recordingEmpty || (this.timeline.getCurrentFrame() == firstFrame);

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
        if (this.timeline.getCurrentFrame() < this.getLastFrame()) {
            this.renderer.applyFrame(this.timeline.getCurrentFrame() + 1);
            this.updateUI();
        }
    }

    onTimelinePrevClicked() {
        if (this.timeline.getCurrentFrame() > this.getFirstFrame()) {
            this.renderer.applyFrame(this.timeline.getCurrentFrame() - 1);
            this.updateUI();
        }
    }

    onTimelineFirstClicked() {
        const firstFrame = this.getFirstFrame(true);
        if (this.timeline.getCurrentFrame() != firstFrame) {
            this.renderer.applyFrame(firstFrame);
            this.updateUI();
        }
    }

    onTimelineLastClicked() {
        const lastFrame = this.getLastFrame(true);
        if (this.timeline.getCurrentFrame() != lastFrame) {
            this.renderer.applyFrame(lastFrame);
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
        const firstFrame = this.getFirstFrame();
        const entity = this.timeline.getSelectedEntity().toString();
        for (let i=this.renderer.getCurrentFrame() - 1; i>= firstFrame; --i)
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
        const lastFrame = this.getLastFrame();
        const entity = this.timeline.getSelectedEntity().toString();
        for (let i=this.renderer.getCurrentFrame() + 1; i<= lastFrame; ++i)
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
