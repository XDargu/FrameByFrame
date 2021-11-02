import { LogLevel } from "../frontend/ConsoleController";
import { LogChannel } from "../frontend/ConsoleController";
import { Console } from "../frontend/ConsoleController";
import Renderer from "../renderer";

export class PlaybackController {

    private renderer: Renderer;
    private isPlaying: boolean;
    private elapsedTime: number;
    private playbackSpeedFactor: number;

    constructor(renderer: Renderer) {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.renderer = renderer;
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

            // Check how many frames we have to skip
            let currentFrame = this.renderer.getCurrentFrame();
            let currentElapsedTime = this.renderer.getElapsedTimeOfFrame(currentFrame);

            while (this.elapsedTime > currentElapsedTime && currentFrame < this.renderer.getFrameCount() - 1) {
                currentFrame++;
                this.elapsedTime -= currentElapsedTime;
                currentElapsedTime = this.renderer.getElapsedTimeOfFrame(currentFrame);
            }

            this.renderer.applyFrame(currentFrame);

            // Stop in the last frame
            if (currentFrame == this.renderer.getFrameCount() - 1) {
                this.stopPlayback();
            }
        }
    }

    updateUI() {
        const recordingEmpty = this.renderer.getFrameCount() == 0;
        const isLastFrame = recordingEmpty || (this.renderer.getCurrentFrame() == this.renderer.getFrameCount() - 1);
        const isFirstFrame = recordingEmpty || (this.renderer.getCurrentFrame() == 0);

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

    onTimelinePlayClicked() {
        if (!this.isPlaying) {
            this.startPlayback();
        }

        else {
            this.stopPlayback();
        }
    }
}
