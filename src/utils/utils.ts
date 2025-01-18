export function clamp(value: number, min: number, max: number)
{
    return Math.min(Math.max(value, min), max);
}

export function arrayMax(arr: number[])
{
    let len = arr.length;
    let max = -Infinity;
    while (len--)
    {
        if (arr[len] > max)
        {
            max = arr[len];
        }
    }
    return max;
};

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

// Memory
export function memoryToString(bytes : number, si = false, dp = 1)
{
    const thresh = si ? 1000 : 1024;
  
    if (Math.abs(bytes) < thresh)
    {
        return bytes + ' B';
    }
  
    const units = si 
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

    let u = -1;
    const r = 10**dp;
  
    do
    {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  
    return bytes.toFixed(dp) + ' ' + units[u];
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
    return Number((BigInt(entityId) << BigInt(8)) + BigInt(clientId));
}

export function getEntityIdUniqueId(uniqueId: number)
{
    return Number(BigInt(uniqueId) >> BigInt(8));
}

export function getClientIdUniqueId(uniqueId: number)
{
    return Number(BigInt(uniqueId) & BigInt(0xFF));
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

export function delay(time: number) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time);
    });
}

// Liang-Barsky function by Daniel White @ https://www.skytopia.com/project/articles/compsci/clipping.html
export function LiangBarsky(edgeLeft: number, edgeRight: number, edgeBottom: number, edgeTop: number,   // Define the x/y clipping values for the border.
                x0src: number, y0src: number, x1src: number, y1src: number)                             // Define the start and end points of the line.
{
    let t0 = 0.0;
    let t1 = 1.0;

    const xdelta = x1src-x0src;
    const ydelta = y1src-y0src;

    let p = 0;
    let q = 0;
    let r = 0;

    for(let edge=0; edge<4; edge++) {   // Traverse through left, right, bottom, top edges.
        if (edge==0) {  p = -xdelta;    q = -(edgeLeft-x0src);  }
        if (edge==1) {  p = xdelta;     q =  (edgeRight-x0src); }
        if (edge==2) {  p = -ydelta;    q = -(edgeBottom-y0src);}
        if (edge==3) {  p = ydelta;     q =  (edgeTop-y0src);   }   
        r = q/p;
        if(p==0 && q<0) return null;   // Don't draw line at all. (parallel line outside)

        if(p<0) {
            if(r>t1) return null;         // Don't draw line at all.
            else if(r>t0) t0=r;            // Line is clipped!
        } else if(p>0) {
            if(r<t0) return null;      // Don't draw line at all.
            else if(r<t1) t1=r;         // Line is clipped!
        }
    }

    const x0clip = x0src + t0*xdelta;
    const y0clip = y0src + t0*ydelta;
    const x1clip = x0src + t1*xdelta;
    const y1clip = y0src + t1*ydelta;

    return { x0: x0clip, y0: y0clip, x1: x1clip, y1: y1clip };        // (clipped) line is drawn
}

export function compareStringArrays(arr1: string[], arr2: string[])
{
    if (arr1.length !== arr2.length)
    {
        return false;
    }

    for (let i = 0; i < arr1.length; i++)
    {
        if (arr1[i] !== arr2[i])
        {
            return false;
        }
    }

    return true;
}