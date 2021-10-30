import { ResizeObserver } from 'resize-observer';

export interface SplitterSettings
{
    splitter: HTMLElement;
    panes: HTMLElement[];
    direction: string;
    minSizePane: number;
    minPane: HTMLElement;
    minSize: number;
}

export class Splitter
{
    constructor(settings: SplitterSettings)
    {
        this.dragElement(settings);
    }

    dragElement(settings: SplitterSettings)
    {
        var md: any; // remember mouse down info

        settings.splitter.onmousedown = onMouseDown;

        function getActivePane()
        {
            for (let i=0; i<settings.panes.length; ++i)
            {
                if (settings.panes[i].style.display != "none")
                    return settings.panes[i];
            }
        }

        function onMouseDown(e: MouseEvent)
        {
            md = {e,
                offsetLeft:  settings.splitter.offsetLeft,
                offsetTop:   settings.splitter.offsetTop,
                firstWidth:  getActivePane().offsetWidth,
                minPaneWidth: settings.minPane.offsetWidth
                };

            document.onmousemove = onMouseMove;
            document.onmouseup = () => {
                document.onmousemove = document.onmouseup = null;
            }
        }

        function onMouseMove(e: MouseEvent)
        {
            const paneWidth = getPaneWidth(e);
            const initialTotalWidth = md.minPaneWidth + md.firstWidth;
            const maxSize = initialTotalWidth - settings.minSizePane;
            const size = Math.min(Math.max(settings.minSize, paneWidth), maxSize);
            applySizeToPane(size);
        }

        function getPaneWidth(e: MouseEvent) : number
        {
            var delta = {
                x: e.clientX - md.e.clientX,
                y: e.clientY - md.e.clientY
            };

            if (settings.direction === "L" ) // Left
                return md.firstWidth + delta.x;
            else if (settings.direction === "R" ) // Right
                return md.firstWidth - delta.x;
        }

        function applySizeToPane(size: number)
        {
            for (let i=0; i<settings.panes.length; ++i)
            {
                settings.panes[i].style.flex = "0 0 " + (size) + "px";
            }
        }

        var resizeObserver = new ResizeObserver(entries => {

            const paneWith = getActivePane().offsetWidth;
            const minPaneWidth = settings.minPane.offsetWidth;

            const totalWidth = paneWith + minPaneWidth;
            const maxAvailableWidth = totalWidth - settings.minSizePane;

            if (paneWith > maxAvailableWidth)
            {
                applySizeToPane(Math.max(settings.minSize, maxAvailableWidth));
            }

            entries[0].contentRect.width;
            entries[0].contentRect.height;
        });
        resizeObserver.observe(settings.minPane);
    }
}

// Select from list
interface IListCallback {
    (item: HTMLElement) : void;
}

interface IListCallbacks {
    onItemSelected: IListCallback;
    onItemMouseOver: IListCallback;
    onItemMouseOut: IListCallback;
}

export class ListControl {

    listWrapper: HTMLElement;

    constructor(listWrapper : HTMLElement, callbacks : IListCallbacks = null, value : string = null) {
        this.listWrapper = listWrapper;
        let listItems = this.listWrapper.querySelectorAll(".basico-list-item");
        let i = 0;
        const length = listItems.length;
        for (; i < length; i++) {
            let item = <HTMLElement>listItems[i];
            this.addElementToList(item, callbacks, value);
        }
    }

    appendElement(textContent : string, callbacks : IListCallbacks = null, value : string = null): HTMLDivElement
    {
        let listItem = document.createElement("div");
        listItem.classList.add("basico-list-item");
        if (callbacks == null) {
            listItem.classList.add("basico-no-hover");
        }
        listItem.innerText = textContent;
        this.listWrapper.appendChild(listItem);

        this.addElementToList(listItem, callbacks, value)
        return listItem;
    }

    private addElementToList(element : HTMLElement, callbacks : IListCallbacks, value : string = null)
    {
        var listWrapper = this.listWrapper;
        if (callbacks) {
            element.addEventListener("click", function() {
                listWrapper.querySelectorAll(".basico-list-item").forEach(function(node){
                    node.classList.remove("basico-list-item-active");
                });
                this.classList.add("basico-list-item-active");

                if (callbacks && callbacks.onItemSelected != null)
                {
                    callbacks.onItemSelected(this);
                }
            });
        }

        if (callbacks && callbacks.onItemMouseOver != null)
        {
            element.addEventListener("mouseover", function() {
                console.log("Mouse over");
                callbacks.onItemMouseOver(this);
            });
        }

        if (callbacks && callbacks.onItemMouseOut != null)
        {
            element.addEventListener("mouseout", function() {
                callbacks.onItemMouseOut(this);
            });
        }

        if (value != null)
        {
            element.setAttribute('data-list-value', value);
        }
    }

    public selectElementOfValue(value : string, preventCallback: boolean = false) {
        let element = this.getItemWithValue(value) as HTMLElement;
        if (element && !preventCallback)
        {
            element.click();
        }
    }

    setValueOfItem(listItem : HTMLElement, value : string) {
        listItem.setAttribute('data-list-value', value);
    }

    getValueOfItem(listItem : HTMLElement) {
        return listItem.getAttribute('data-list-value');
    }

    getItemsWithValue(value : string) {
        return this.listWrapper.querySelectorAll('[data-list-value="' + value + '"]');
    }

    getItemWithValue(value : string) {
        return this.listWrapper.querySelector('[data-list-value="' + value + '"]');
    }
}

export class TreeControl {

    root: HTMLElement;

    constructor(treeElement : HTMLElement) {
        this.root = treeElement;
    }

    addItem(parentListItem : HTMLElement, contentData : string, hidden = false, value : string = null) {

        let parentList = parentListItem.querySelector("ul");

        let listItem = document.createElement("li");
        listItem.classList.add("basico-tree-leaf");

        let wrapper = document.createElement("span");
        wrapper.classList.add("basico-tree-item-wrapper");
        this.toggleItem(wrapper);
        listItem.appendChild(wrapper);

        let toggle = document.createElement("span");
        toggle.classList.add("basico-tree-item-toggle");
        wrapper.appendChild(toggle);

        let content = document.createElement("span");
        content.classList.add("basico-tree-item-content");
        content.innerHTML = contentData;
        wrapper.appendChild(content);

        let children = document.createElement("ul");
        listItem.appendChild(children);

        parentList.appendChild(listItem);
        parentListItem.classList.remove("basico-tree-leaf");

        if (hidden)
        {
            parentListItem.classList.add("basico-tree-closed");
        }

        if (value != null)
        {
            listItem.setAttribute('data-tree-value', value);
        }

        return listItem;
    }

    toggleItem(treeItemWrapperElement : HTMLSpanElement) {

        treeItemWrapperElement.addEventListener("click", function() {
    
            let listItem = this.parentElement;
    
            if (listItem.classList.contains("basico-tree-closed")) {
                listItem.classList.remove("basico-tree-closed");
            }
            else {
                listItem.classList.add("basico-tree-closed");
            }
        });
    }

    getValueOfItem(listItem : HTMLElement) {
        return listItem.getAttribute('data-tree-value');
    }

    getItemsWithValue(value : string) {
        return this.root.querySelectorAll('[data-tree-value="' + value + '"]');
    }

    getItemWithValue(value : string) {
        return this.root.querySelector('[data-tree-value="' + value + '"]');
    }

    clear()
    {
        let rootList = this.root.querySelector("ul");
        rootList.innerHTML = "";
    }
}

export const enum TabBorder
{
    None,
    Left = "basico-border-left",
    Righ = "basico-border-right"
}

export class TabControl {

    tabElements: HTMLElement[];
    tabContentElements: HTMLElement[];
    activeTab: HTMLElement;
    activeContent: HTMLElement;
    tabBorder: TabBorder;

    constructor(tabElements : HTMLElement[], tabContentElements : HTMLElement[], defaultActiveTabIdx : number = 0, tabBorder: TabBorder = TabBorder.None) {
        this.tabElements = tabElements;
        this.tabContentElements = tabContentElements;
        this.activeTab = this.tabElements[defaultActiveTabIdx];
        this.activeContent = this.tabContentElements[defaultActiveTabIdx];
        this.tabBorder = tabBorder;

        if (this.tabElements.length != this.tabContentElements.length) {
            console.error("Tabs and tabs content have different amounts.");
        }

        this.initialize();
    }

    initialize() {
        let control = this;

        for (let i = 0; i < this.tabElements.length; i++) {

            let currentTab = this.tabElements[i];
            let currentContent = this.tabContentElements[i];

            currentTab.onclick = function() {
                control.activeTab.classList.remove("basico-tabs-selected");
                currentTab.classList.add("basico-tabs-selected");
                control.activeTab = currentTab;

                control.activeContent.style.display = "none";
                currentContent.style.display = "block";
                control.activeContent = currentContent;
            }

            currentTab.classList.remove("basico-tabs-selected");
            if (this.tabBorder != TabBorder.None) {
                currentTab.classList.add(this.tabBorder);
            }
            currentContent.style.display = "none";
        }

        this.activeTab.classList.add("basico-tabs-selected");
        this.activeContent.style.display = "block";
    }
}