export function hashCode(str: string): number
{
    var h: number = 0;
    for (var i = 0; i < str.length; i++) {
        h = 31 * h + str.charCodeAt(i);
    }
    return h & 0xFFFFFFFF
}

const colors = ["#D6A3FF", "#EB7C2B", "#5DAEDC", "#DFC956", "E5CF58"];
export function ColorFromHash(hash: number) : string
{
    return colors[hash % colors.length];
}