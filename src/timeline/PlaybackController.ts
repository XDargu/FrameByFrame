import Renderer from "../renderer";

export class PlaybackController {

    private renderer: Renderer;
    private isPlaying: boolean;
    private elapsedTime: number;

    constructor(renderer: Renderer) {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.renderer = renderer;
    }

    update(elapsedSeconds: number) {
        if (this.isPlaying && this.renderer.getFrameCount() == 0) {
            this.stopPlayback();
        }

        if (this.isPlaying) {
            this.elapsedTime += elapsedSeconds;

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
        console.log("Current frame: ");
        console.log(this.renderer.getCurrentFrame());
        console.log("Frame count: ");
        console.log(this.renderer.getFrameCount());

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
