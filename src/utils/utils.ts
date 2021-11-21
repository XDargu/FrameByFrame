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

const colors = ["#D6A3FF", "#EB7C2B", "#5DAEDC", "#DFC956", "E5CF58"];
export function colorFromHash(hash: number) : string
{
    return colors[hash % colors.length];
}

export function componentToHex(c: number)
{
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

// Colors
export interface RGBColor
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

export function blend(color1: RGBColor, color2: RGBColor, amount: number)
{
    const bias = clamp(amount, 0, 1);
    const bias2 = 1 - bias;
    return {
        r: Math.round(color1.r * bias2 + color2.r * bias),
        g: Math.round(color1.g * bias2 + color2.g * bias),
        b: Math.round(color1.b * bias2 + color2.b * bias)
    }
}

export function swapClass(element: HTMLElement, classToRemove: string, classToAdd: string)
{
    element.classList.remove(classToRemove);
    element.classList.add(classToAdd);
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