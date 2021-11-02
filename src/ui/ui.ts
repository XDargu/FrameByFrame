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
                firstHeight: getActivePane().offsetHeight,
                minPaneWidth: settings.minPane.offsetWidth,
                minPaneHeight: settings.minPane.offsetHeight
                };

            settings.splitter.classList.add("selected");

            document.onmousemove = onMouseMove;
            document.onmouseup = () => {
                settings.splitter.classList.remove("selected");
                document.onmousemove = document.onmouseup = null;
            }
        }

        function onMouseMove(e: MouseEvent)
        {
            function ApplySize(minPaneSize: number, firstSize: number)
            {
                const paneSize = getPaneSize(e);
                const initialTotalSize = minPaneSize + firstSize;
                const maxSize = initialTotalSize - settings.minSizePane;
                const size = Math.min(Math.max(settings.minSize, paneSize), maxSize);
                applySizeToPane(size);
            }

            if (isVertical())
            {
                ApplySize(md.minPaneHeight, md.firstHeight);
            }
            else
            {
                ApplySize(md.minPaneWidth, md.firstWidth);
            }
        }

        function getPaneSize(e: MouseEvent) : number
        {
            var delta = {
                x: e.clientX - md.e.clientX,
                y: e.clientY - md.e.clientY
            };

            if (settings.direction === "L" ) // Left
                return md.firstWidth + delta.x;
            else if (settings.direction === "R" ) // Right
                return md.firstWidth - delta.x;
            else if (settings.direction === "U" ) // Up
                return md.firstHeight + delta.y;
            else if (settings.direction === "D" ) // Down
                return md.firstHeight - delta.y;
        }

        function applySizeToPane(size: number)
        {
            for (let i=0; i<settings.panes.length; ++i)
            {
                settings.panes[i].style.flex = "0 0 " + (size) + "px";

                if (isVertical())
                    settings.panes[i].style.maxHeight = size + "px";
                else
                    settings.panes[i].style.maxWidth = size + "px";
            }
        }

        function isVertical() : boolean
        {
            return (settings.direction === "U" || settings.direction == "D");
        }

        function onResize()
        {
            function ApplyCorrection(paneSize: number, minPaneSize: number)
            {
                const totalSize = paneSize + minPaneSize;
                const maxAvailableSize = totalSize - settings.minSizePane;

                if (paneSize > maxAvailableSize)
                {
                    applySizeToPane(Math.max(settings.minSize, maxAvailableSize));
                }
            }

            if (isVertical())
            {
                const paneHeight = getActivePane().offsetHeight;
                const minPaneHeight = settings.minPane.offsetHeight;
                ApplyCorrection(paneHeight, minPaneHeight);
            }
            else
            {
                const paneWith = getActivePane().offsetWidth;
                const minPaneWidth = settings.minPane.offsetWidth;
                ApplyCorrection(paneWith, minPaneWidth);
            }
        }

        var resizeObserver = new ResizeObserver(entries => { onResize(); });
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

    addItem(parentListItem : HTMLElement, content : HTMLElement[], text : string = null, hidden = false, value : string = null) {

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

        let contentWrapper = document.createElement("span");
        contentWrapper.classList.add("basico-tree-item-content");
        if (text)
        {
            contentWrapper.innerText = text;
        }
        for (let i=0; i<content.length; ++i) {
            contentWrapper.appendChild(content[i]);
        }
        wrapper.appendChild(contentWrapper);

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
        for (let i = 0; i < this.tabElements.length; i++) {

            let currentTab = this.tabElements[i];
            let currentContent = this.tabContentElements[i];

            currentTab.onclick = () => {
                this.activateTab(currentTab, currentContent);
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

    openTabByElement(tab: HTMLElement)
    {
        for (let i = 0; i < this.tabElements.length; i++) {

            let currentTab = this.tabElements[i];
            let currentContent = this.tabContentElements[i];

            if (currentTab == tab)
                this.activateTab(currentTab, currentContent);
        }
    }

    openTabByIndex(tabIndex: number)
    {
        if (tabIndex < this.tabElements.length) {
            let currentTab = this.tabElements[tabIndex];
            let currentContent = this.tabContentElements[tabIndex];

            this.activateTab(currentTab, currentContent);
        }
    }

    private activateTab(tab: HTMLElement, content: HTMLElement)
    {
        this.activeTab.classList.remove("basico-tabs-selected");
        tab.classList.add("basico-tabs-selected");
        this.activeTab = tab;

        this.activeContent.style.display = "none";
        content.style.display = "block";
        this.activeContent = content;
    }
}