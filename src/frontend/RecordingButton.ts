import * as DOMUtils from '../utils/DOMUtils';

var recordActive = false;
var recordButton = document.getElementById("button-record");

export function initializeRecordingButton()
{
    recordButton.onclick = () => {
        toggleRecording();
    };
}

export function isRecordingActive()
{
    return recordActive;
}

export function record()
{
    recordActive = true;
    updateIcon();
}

export function stop()
{
    recordActive = false;
    updateIcon();
}

function toggleRecording()
{
    recordActive = !recordActive;
    updateIcon();
}

function updateIcon()
{
    const icon = recordButton.querySelector("i") as HTMLElement;
    if (recordActive) {
        recordButton.classList.toggle("recording");
        DOMUtils.swapClass(icon, "fa-circle", "fa-stop");
    }
    else {
        recordButton.classList.toggle("recording");
        DOMUtils.swapClass(icon, "fa-stop", "fa-circle");        
    }
}