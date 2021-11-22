import { PlaybackController } from "../timeline/PlaybackController";
import ConnectionsList from "./ConnectionsList";

enum ShortcutActions
{
    FirstFrame,
    LastFrame,
    NextFrame,
    PrevFrame,
    NextEvent,
    PrevEvent,
    NextSelectionEvent,
    PrevSelectionEvent,
    TogglePlayback,
    ToggleRecording,
    OpenFile,
    SaveFile,
    SendTestMesage
}

interface ShortcutActionMap
{
    [key: string] : ShortcutActions
}

interface ShortcutTable
{
    control: ShortcutActionMap;
    normal: ShortcutActionMap;
    alt: ShortcutActionMap;
    controlAtl: ShortcutActionMap;
}

const shortcuts : ShortcutTable = {
    control: { 
        "ArrowLeft": ShortcutActions.FirstFrame,
        "ArrowRight": ShortcutActions.LastFrame,
        "s": ShortcutActions.SaveFile,
        "o": ShortcutActions.OpenFile,
        "r": ShortcutActions.ToggleRecording,
        "t": ShortcutActions.SendTestMesage
    },
    normal: {
        "ArrowLeft": ShortcutActions.PrevFrame,
        "ArrowRight": ShortcutActions.NextFrame,
        " ": ShortcutActions.TogglePlayback
    },
    alt: {
        "ArrowLeft": ShortcutActions.PrevEvent,
        "ArrowRight": ShortcutActions.NextEvent,
    },
    controlAtl: {
        "ArrowLeft": ShortcutActions.PrevSelectionEvent,
        "ArrowRight": ShortcutActions.NextSelectionEvent,
    }
};

function getShortcutActionMap(e : KeyboardEvent) : ShortcutActionMap
{
    if (e.ctrlKey && e.altKey)
        return shortcuts.controlAtl;
    if (e.ctrlKey)
        return shortcuts.control;
    if (e.altKey)
        return shortcuts.alt;
    return shortcuts.normal;
}

const inputs = ['input', 'select', 'textarea'];
function canRunShortcut()
{
    const activeElement = document.activeElement;
    return activeElement && inputs.indexOf(activeElement.tagName.toLowerCase()) === -1;
}

function executeShortcut(action: ShortcutActions, playbackController: PlaybackController, connectionList: ConnectionsList)
{
    switch(action)
    {
        case ShortcutActions.FirstFrame: playbackController.onTimelineFirstClicked(); break;
        case ShortcutActions.LastFrame: playbackController.onTimelineLastClicked(); break;
        case ShortcutActions.NextFrame: playbackController.onTimelineNextClicked(); break;
        case ShortcutActions.PrevFrame: playbackController.onTimelinePrevClicked(); break;
        case ShortcutActions.TogglePlayback: playbackController.onTimelinePlayClicked(); break;
        case ShortcutActions.NextEvent: playbackController.onTimelineNextEventClicked(false); break;
        case ShortcutActions.PrevEvent: playbackController.onTimelinePrevEventClicked(false); break;
        case ShortcutActions.NextSelectionEvent: playbackController.onTimelineNextEventClicked(true); break;
        case ShortcutActions.PrevSelectionEvent: playbackController.onTimelinePrevEventClicked(true); break;
        case ShortcutActions.ToggleRecording: break;
        case ShortcutActions.OpenFile: break;
        case ShortcutActions.SaveFile: break;
        case ShortcutActions.SendTestMesage: 
        {
            console.log("Send data");
            connectionList.sendToAllConnections({ 
                type: 2,
                data: {
                    name: "NavMesh",
                    enabled: true
                }
            });
        }
        break;
    }
}

export function registerShortcuts(playbackController: PlaybackController, connectionList: ConnectionsList)
{
    document.onkeydown = (e : KeyboardEvent) => {

        if (canRunShortcut())
        {
            const actionMap = getShortcutActionMap(e);
            const action = actionMap[e.key];
            if (action != undefined)
            {
                executeShortcut(action, playbackController, connectionList);
            }
        }
    };
}