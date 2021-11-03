import { PlaybackController } from "../timeline/PlaybackController";

enum ShortcutActions
{
    FirstFrame,
    LastFrame,
    NextFrame,
    PrevFrame,
    TogglePlayback,
    ToggleRecording,
    OpenFile,
    SaveFile
}

interface ShortcutActionMap
{
    [key: string] : ShortcutActions
}

interface ShortcutTable
{
    control: ShortcutActionMap;
    normal: ShortcutActionMap;
}

const shortcuts : ShortcutTable = {
    control: { 
        "ArrowLeft": ShortcutActions.FirstFrame,
        "ArrowRight": ShortcutActions.LastFrame,
        "s": ShortcutActions.SaveFile,
        "o": ShortcutActions.OpenFile,
        "r": ShortcutActions.ToggleRecording
    },
    normal: {
        "ArrowLeft": ShortcutActions.PrevFrame,
        "ArrowRight": ShortcutActions.NextFrame,
        " ": ShortcutActions.TogglePlayback
    }
};

function getShortcutActionMap(e : KeyboardEvent) : ShortcutActionMap
{
    if (e.ctrlKey)
        return shortcuts.control;
    return shortcuts.normal;
}

const inputs = ['input', 'select', 'textarea'];
function canRunShortcut()
{
    const activeElement = document.activeElement;
    return activeElement && inputs.indexOf(activeElement.tagName.toLowerCase()) === -1;
}

function executeShortcut(action: ShortcutActions, playbackController: PlaybackController)
{
    switch(action)
    {
        case ShortcutActions.FirstFrame: playbackController.onTimelineFirstClicked(); break;
        case ShortcutActions.LastFrame: playbackController.onTimelineLastClicked(); break;
        case ShortcutActions.NextFrame: playbackController.onTimelineNextClicked(); break;
        case ShortcutActions.PrevFrame: playbackController.onTimelinePrevClicked(); break;
        case ShortcutActions.TogglePlayback: break;
        case ShortcutActions.ToggleRecording: playbackController.onTimelinePlayClicked(); break;
        case ShortcutActions.OpenFile: break;
        case ShortcutActions.SaveFile: break;
    }
}

export function registerShortcuts(playbackController: PlaybackController)
{
    document.onkeydown = (e : KeyboardEvent) => {

        if (canRunShortcut())
        {
            const actionMap = getShortcutActionMap(e);
            const action = actionMap[e.key];
            if (action)
            {
                executeShortcut(action, playbackController);
            }
        }
    };
}