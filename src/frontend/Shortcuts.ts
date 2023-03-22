import { PlaybackController } from "../timeline/PlaybackController";
import ConnectionsList from "./ConnectionsList";

export enum ShortcutActions
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
    ClearRecording,
    ToggleHelp,
    EntityList,
    RecordingOptions,
    ConnectionList,
    InfoList,
    FilterList,
    RecentFileList,
    SettingsList,
}

export interface IShortcutCallback
{
    ():void;
}

export interface KeyBinding
{
    keyCode: string,
    ctrl?: boolean,
    alt?: boolean,
    shift?: boolean
}

export interface ShortcutDefinition
{
    name: string,
    id: ShortcutActions,
    keys: KeyBinding,
    context: string,
    callback: IShortcutCallback
}

export interface Shortcuts
{
    definitions: ShortcutDefinition[]
}

interface ShortcutAccelerator
{
    [key: string] : ShortcutDefinition[]
}

function findShortcutAction(action: ShortcutActions)
{
    for (let i=0; i<shortcutTable.definitions.length; ++i)
    {
        if (shortcutTable.definitions[i].id == action)
        {
            return shortcutTable.definitions[i];
        }
    }
}

function keyAsString(keyCode: string)
{
    if (keyCode.startsWith("Key"))
        return keyCode.substring(3);
    if (keyCode.startsWith("Digit"))
        return keyCode.substring(5);
    if (keyCode.startsWith("Arrow"))
        return keyCode.substring(5);
    return keyCode;
}

function keyBindingAsString(keys: KeyBinding) : string
{
    const baseKey = keyAsString(keys.keyCode);
    
    let text = "";
    if (keys.ctrl)
        text += "Ctrl+"
    if (keys.shift)
        text += "Shift+"
    if (keys.alt)
        text += "Alt+"
    return text + baseKey;
}

export function getShortcutAsText(action: ShortcutActions) : string
{
    const definition = findShortcutAction(action);
    if (definition)
    {
        return keyBindingAsString(definition.keys);
    }
    return "No shortcut";
}

const inputs = ['input', 'select', 'textarea'];
function canRunShortcut()
{
    const activeElement = document.activeElement;
    return activeElement && inputs.indexOf(activeElement.tagName.toLowerCase()) === -1;
}

let shortcutTable: Shortcuts = { definitions: [] };
let accelerator: ShortcutAccelerator = {};

export function getDefinitions() { return shortcutTable; }

export function registerShortcut(name: string, context: string, action: ShortcutActions, defaultBinding: KeyBinding, callback: IShortcutCallback)
{
    const definition = {
        name: name,
        context: context,
        keys: defaultBinding,
        id: action,
        callback: callback
    };
    shortcutTable.definitions.push(definition);

    if (!accelerator[defaultBinding.keyCode])
        accelerator[defaultBinding.keyCode] = [];
    
    accelerator[defaultBinding.keyCode].push(definition);
}

function findDefinition(e : KeyboardEvent) : ShortcutDefinition
{
    const definitions = accelerator[e.code];
    if (definitions)
    {
        for (let i=0; i<definitions.length; ++i)
        {
            const bindings = definitions[i].keys;
            const altVal = bindings.alt || false;
            const ctrlVal = bindings.ctrl || false;
            const shiftVal = bindings.shift || false;
            if (altVal == e.altKey && ctrlVal == e.ctrlKey && shiftVal == e.shiftKey)
            {
                return definitions[i];
            }
        }
    }
}

export function initShortcuts()
{
    document.onkeydown = (e : KeyboardEvent) => {
        console.log(e);
        if (canRunShortcut())
        {
            const definition = findDefinition(e);
            if (definition)
            {
                definition.callback();
            }
        }
    };
}