export interface IContextMenuCallback {
    () : void
}

export interface IContextMenuItem {
    text: string;
    icon?: string;
    callback: IContextMenuCallback;
}

function createMenuItem(item: IContextMenuItem)
{
    let li = document.createElement("li");
    let link = document.createElement("a");
    link.href = "#";
    link.textContent = item.text;
    link.onclick = () => { item.callback(); };

    if (item.icon != null)
    {
        let icon = document.createElement("i");
        icon.classList.add("fa", item.icon);

        link.prepend(icon);
    }

    li.append(link);
    return li;
}

function createContextMenu(posX:  number, posY: number, items: IContextMenuItem[])
{
    let menu = document.getElementById("contextMenu");
    menu.style.display = 'block';
    menu.style.left = posX + "px";
    menu.style.top = posY + "px";

    // TODO: Reuse existing items if we can?
    menu.innerHTML = "";
    let list = document.createElement("ul");
    list.className = "menu";

    const menuItems = items.map((item) => { return createMenuItem(item); })
    list.append(...menuItems);

    menu.append(list);

    const hideMenu = () => {
        document.getElementById("contextMenu").style.display = "none";
        document.removeEventListener("click", hideMenu);        
    };

    document.addEventListener("click", hideMenu);
}

export function addContextMenu(element: HTMLElement, items: IContextMenuItem[])
{
    element.oncontextmenu = (ev: MouseEvent) => {
        createContextMenu(ev.pageX, ev.pageY, items);
    }; 
}