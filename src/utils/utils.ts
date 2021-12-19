export function clamp(value: number, min: number, max: number)
{
    return Math.min(Math.max(value, min), max);
}

export function hashCode(str: string): number
{
    var h: number = 0;
    for (var i = 0; i < str.length; i++) {
        h = 31 * h + str.charCodeAt(i);
    }
    return h & 0xFFFFFFFF
}

export function isHexColor(hex: string)
{
    return typeof hex === 'string'
        && hex.length === 7
        && hex[0] === '#'
        && !isNaN(Number('0x' + hex.substr(1)))
}

const defaultColors = ["#D6A3FF", "#EB7C2B", "#5DAEDC", "#DFC956"];
export function colorFromHash(hash: number, colors: string[] = defaultColors) : string
{
    return colors.length > 0 ? colors[Math.abs(hash) % colors.length] : defaultColors[0];
}

export function componentToHex(c: number)
{
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// Colors
export class RGBColor
{
    r: number;
    g: number;
    b: number;
}

export class RGBColor01
{
    r: number;
    g: number;
    b: number;
}
  
export function rgbToHex(color: RGBColor)
{
    return "#" + componentToHex(color.r) + componentToHex(color.g) + componentToHex(color.b);
}

export function hexToRgb(hex: string) : RGBColor
{
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

export function RgbToRgb01(color: RGBColor) : RGBColor01
{
    return {
        r: color.r / 255,
        g: color.g / 255,
        b: color.b / 255
    };
}

export function blend(color1: RGBColor, color2: RGBColor, amount: number) : RGBColor
{
    const bias = clamp(amount, 0, 1);
    const bias2 = 1 - bias;
    return {
        r: Math.round(color1.r * bias2 + color2.r * bias),
        g: Math.round(color1.g * bias2 + color2.g * bias),
        b: Math.round(color1.b * bias2 + color2.b * bias)
    }
}

export function addUniqueClass(element: HTMLElement, classToAdd: string)
{
    if (!element.classList.contains(classToAdd))
    {
        element.classList.add(classToAdd);
    }
}

export function swapClass(element: HTMLElement, classToRemove: string, classToAdd: string)
{
    element.classList.remove(classToRemove);
    element.classList.add(classToAdd);
}

export function toggleClasses(element: HTMLElement, class1: string, class2: string)
{
    if (element.classList.contains(class1))
    {
        swapClass(element, class1, class2)
    }
    else
    {
        swapClass(element, class2, class1);
    }
}

export function setClass(element: HTMLElement, className: string, isActive: boolean)
{
    if (isActive) {
        addUniqueClass(element, className);
    }
    else {
        element.classList.remove(className);
    }
}

export function filterText(filter: string, content: string)
{
    return content.indexOf(filter) > -1;
}

export function pushUnique<Type>(array: Type[], value: Type)
{
    if (array.indexOf(value) == -1)
    {
        array.push(value);
    }
}

type Comparator<T> = (fromArray: T, value: T) => boolean;
export function searchLastSortedInsertionPos<Type>(array: Array<Type>, value: Type, comparator: Comparator<Type>) : number
{
    let i = array.length - 1;
    while (i >= 0 && comparator(array[i], value)) {
        --i;
    }
    return i + 1;
}

export function insertSorted<Type>(array: Array<Type>, value: Type, comparator: Comparator<Type>)
{
    array.splice(searchLastSortedInsertionPos(array, value, comparator), 0, value);
}

export function toUniqueID(clientId: number, entityId: number)
{
    return (entityId << 8) + clientId;
}

export function getEntityIdUniqueId(uniqueId: number)
{
    return uniqueId >> 8;
}

export function getClientIdUniqueId(uniqueId: number)
{
    return uniqueId & 0xFF;
}

export function numberToPaddedString(value: number, padding: number) : string
{
    return value.toString().padStart(padding, '0');
}

interface IFormatTable
{
    [token: string] : string;
}
export function getFormattedString(format: string, formatTable: IFormatTable) : string
{
    const re = new RegExp(Object.keys(formatTable).join("|"),"gi");
    return format.replace(re, function(matched){
        return formatTable[matched];
    });
}

export function getFormattedFilename(format: string) : string
{
    const date = new Date();
    const formatTable : IFormatTable = {
        '%h': numberToPaddedString(date.getHours(), 2),
        '%m': numberToPaddedString(date.getMinutes(), 2),
        '%s': numberToPaddedString(date.getSeconds(), 2),
        '%D': numberToPaddedString(date.getDate(), 2),
        '%M': numberToPaddedString(date.getMonth() + 1, 2),
        '%Y': numberToPaddedString(date.getFullYear(), 4),
        '%%': '%'
    }

    return getFormattedString(format, formatTable);
}

export function runAsync(callback: Function)
{
    setTimeout(callback, 0);
}

export function nextTick() {
    return new Promise(function(resolve) {
        runAsync(resolve);
    });
 }