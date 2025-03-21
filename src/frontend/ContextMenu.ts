import * as DOMUtils from '../utils/DOMUtils';

export interface IContextMenuCallback {
    (element: HTMLElement) : void
}

export interface IContextMenuCondition {
    (element: HTMLElement) : boolean
}

export interface IContextMenuItem {
    text: string;
    icon?: string;
    callback: IContextMenuCallback;
    condition?: IContextMenuCondition;
}

function createMenuItem(element: HTMLElement, item: IContextMenuItem)
{
    let li = document.createElement("li");
    let link = document.createElement("a");
    link.href = "#";
    link.textContent = item.text;
    link.onclick = () => { item.callback(element); };

    if (item.icon != null)
    {
        let icon = document.createElement("i");
        icon.classList.add("fa", item.icon);

        link.prepend(icon);
    }

    li.append(link);
    return li;
}

function createContextMenu(posX:  number, posY: number, element: HTMLElement, items: IContextMenuItem[])
{
    let menu = document.getElementById("contextMenu");
    menu.style.display = 'block';

    // TODO: Reuse existing items if we can?
    menu.innerHTML = "";
    let list = document.createElement("ul");
    list.className = "menu";

    let filteredItems = items.filter((item) => {
        if (item.condition != undefined)
            return item.condition(element);
        return true;
    });

    const menuItems = filteredItems.map((item) => { return createMenuItem(element, item); })
    list.append(...menuItems);

    menu.append(list);

    const clampedPos = DOMUtils.clampElementToScreen(posX, posY, menu);
    
    menu.style.left = clampedPos.x + "px";
    menu.style.top = clampedPos.y + "px";

    const hideMenu = () => {
        document.getElementById("contextMenu").style.display = "none";
        document.removeEventListener("click", hideMenu);        
    };

    document.addEventListener("click", hideMenu, { passive: true });
}

export function addContextMenu(element: HTMLElement, items: IContextMenuItem[])
{
    element.oncontextmenu = (ev: MouseEvent) => {
        createContextMenu(ev.pageX, ev.pageY, ev.target as HTMLElement, items);
    };
}

export function removeContextMenu(element: HTMLElement)
{
    element.oncontextmenu = null;
}
