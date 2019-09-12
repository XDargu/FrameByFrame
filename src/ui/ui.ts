/*export class Splitter {

    dividers: HTMLCollectionOf<Element>;
    leftPane: HTMLElement;
    rightPane: HTMLElement;
    splitter: HTMLElement;
    splitterMode: string;
    selectedElement: HTMLElement;
    oldPos: number;

    constructor()
    {
        this.dividers = new HTMLCollection();
        this.leftPane = null;
        this.rightPane = null;
        this.splitter = null;
        this.splitterMode = null;
        this.selectedElement = null;
        this.oldPos = 0;
    }

    getPropertyValue(element : HTMLElement, property : string, defaultValue : number) : number
    {
        const propertyValue : string = window.getComputedStyle(element, null).getPropertyValue(property);
        const numberValue : number = parseFloat(propertyValue);
        return isNaN(numberValue) ? defaultValue : numberValue;
    }

    getCurrentDividerRange()
    {
        if (this.splitterMode == "horizontal") {
            const sizeDivider = this.selectedElement.offsetWidth;

            const leftPaneMinSize = this.getPropertyValue(this.leftPane, "min-width", 0);
            const leftPaneMaxSize = this.getPropertyValue(this.leftPane, "max-width", Number.MAX_VALUE);

            const rightPaneMinSize = this.getPropertyValue(this.rightPane, "min-width", 0);
            const rightPaneMaxSize = this.getPropertyValue(this.rightPane, "max-width", Number.MAX_VALUE);

            const leftPanePosition = this.leftPane.offsetLeft;
            const rightPanePosition = this.rightPane.offsetLeft;
            const rightPaneSize = this.rightPane.offsetWidth;

            const minX = Math.max(0, leftPanePosition + leftPaneMinSize, rightPanePosition + rightPaneSize - rightPaneMaxSize) - leftPanePosition;
            const maxX = Math.min(Number.MAX_VALUE, leftPanePosition + leftPaneMaxSize, rightPanePosition + rightPaneSize - rightPaneMinSize) - leftPanePosition - sizeDivider;

            return { min: minX, max: maxX};
        }
        else {
            const sizeDivider = this.selectedElement.offsetHeight;

            const leftPaneMinSize = this.getPropertyValue(this.leftPane, "min-height", 0);
            const leftPaneMaxSize = this.getPropertyValue(this.leftPane, "max-height", Number.MAX_VALUE);

            const rightPaneMinSize = this.getPropertyValue(this.rightPane, "min-height", 0);
            const rightPaneMaxSize = this.getPropertyValue(this.rightPane, "max-height", Number.MAX_VALUE);

            const leftPanePosition = this.leftPane.offsetTop;
            const rightPanePosition = this.rightPane.offsetTop;
            const rightPaneSize = this.rightPane.offsetHeight;

            const minX = Math.max(0, leftPanePosition + leftPaneMinSize, rightPanePosition + rightPaneSize - rightPaneMaxSize) - leftPanePosition;
            const maxX = Math.min(Number.MAX_VALUE, leftPanePosition + leftPaneMaxSize, rightPanePosition + rightPaneSize - rightPaneMinSize) - leftPanePosition - sizeDivider;

            return { min: minX, max: maxX};
        }
    }

    init()
    {
        this.dividers = document.getElementsByClassName("divider");

        const size = this.dividers.length;
        let i = 0;
        for (;i<size; ++i)
        {
            this.dividers[i].onmousedown = function(event) {

                this.selectedElement = this;
                this.splitter = this.parentElement;
                this.splitterMode = this.parentElement.getAttribute("mode");

                this.leftPane = this.selectedElement.previousElementSibling;
                this.rightPane = this.selectedElement.nextElementSibling;

                event.preventDefault();
                return false;
            };
        }

        document.onmousemove = function(event)
        {
            if (this.selectedElement)
            {
                if (this.splitterMode == "horizontal") {
                    const sizeDivider = splitControl.selectedElement.offsetWidth;
                    const leftPaneSize = splitControl.leftPane.offsetWidth;

                    const leftPanePosition = splitControl.leftPane.offsetLeft;
                    const leftPaneSizeToCursor = event.clientX - leftPanePosition;
                    const leftPanelFinalPos = leftPaneSizeToCursor - sizeDivider / 2;
                    const dividerRange = splitControl.getCurrentDividerRange();

                    const leftPanelNewSize = Math.min(dividerRange.max, Math.max(dividerRange.min, leftPanelFinalPos));

                    // Total flex-grow between both pannels should remain the same, and should be proportional to the width
                    const leftPanelGrow = splitControl.getPropertyValue(splitControl.leftPane, "flex-grow", 0);
                    const rightPanelGrow = splitControl.getPropertyValue(splitControl.rightPane, "flex-grow", 0);

                    const totalLRGrow = leftPanelGrow + rightPanelGrow;
                    const percentageLGrow = leftPanelGrow / totalLRGrow;

                    const leftPanelNewPercentage = leftPanelNewSize / leftPaneSize * percentageLGrow;
                    const leftPanelNewGrow = leftPanelNewPercentage * totalLRGrow;
                    const rightPanelNewGrow = totalLRGrow - leftPanelNewGrow;

                    splitControl.leftPane.style.flexGrow = "" + leftPanelNewGrow
                    splitControl.rightPane.style.flexGrow = "" + rightPanelNewGrow
                }
                else {
                    const sizeDivider = splitControl.selectedElement.offsetHeight;
                    const leftPaneSize = splitControl.leftPane.offsetHeight;

                    const leftPanePosition = splitControl.leftPane.offsetTop;
                    const leftPaneSizeToCursor = event.clientY - leftPanePosition;
                    const leftPanelFinalPos = leftPaneSizeToCursor - sizeDivider / 2;
                    const dividerRange = splitControl.getCurrentDividerRange();

                    const leftPanelNewSize = Math.min(dividerRange.max, Math.max(dividerRange.min, leftPanelFinalPos));

                    // Total flex-grow between both pannels should remain the same, and should be proportional to the width
                    const leftPanelGrow = splitControl.getPropertyValue(splitControl.leftPane, "flex-grow", 0);
                    const rightPanelGrow = splitControl.getPropertyValue(splitControl.rightPane, "flex-grow", 0);

                    const totalLRGrow = leftPanelGrow + rightPanelGrow;
                    const percentageLGrow = leftPanelGrow / totalLRGrow;

                    const leftPanelNewPercentage = leftPanelNewSize / leftPaneSize * percentageLGrow;
                    const leftPanelNewGrow = leftPanelNewPercentage * totalLRGrow;
                    const rightPanelNewGrow = totalLRGrow - leftPanelNewGrow;

                    splitControl.leftPane.style.flexGrow = "" + leftPanelNewGrow
                    splitControl.rightPane.style.flexGrow = "" + rightPanelNewGrow
                }
            }

            event.preventDefault();
            return false;
        }

        document.onmouseup = function(event)
        {
            splitControl.selectedElement = null;
            event.preventDefault();
            return false;
        }
    }
}*/

/*var splitControl = new Splitter();

window.onload = function () {
    splitControl.init();
};*/

// Select from list
interface IListCallback {
    (item: HTMLElement) : void;
}

export class ListControl {

    listWrapper: HTMLElement;

    constructor(listWrapper : HTMLElement, onItemSelectedCallback : IListCallback = null, value : string = null) {
        this.listWrapper = listWrapper;
        let listItems = this.listWrapper.querySelectorAll(".basico-list-item");
        let i = 0;
        const length = listItems.length;
        for (; i < length; i++) {
            let item = <HTMLElement>listItems[i];
            this.addElementToList(item, onItemSelectedCallback, value);
        }
    }

    appendElement(textContent : string, onItemSelectedCallback : IListCallback = null, value : string = null)
    {
        let listItem = document.createElement("div");
        listItem.classList.add("basico-list-item");
        listItem.innerText = textContent;
        this.listWrapper.appendChild(listItem);

        this.addElementToList(listItem, onItemSelectedCallback, value)
    }

    private addElementToList(element : HTMLElement, onItemSelectedCallback : IListCallback, value : string = null)
    {
        var listWrapper = this.listWrapper;
        element.addEventListener("click", function() {
            listWrapper.querySelectorAll(".basico-list-item").forEach(function(node){
                node.classList.remove("basico-list-item-active");
            });
            this.classList.add("basico-list-item-active");

            if (onItemSelectedCallback != null)
            {
                onItemSelectedCallback(this);
            }
        });

        if (value != null)
        {
            element.setAttribute('data-list-value', value);
        }
    }

    setValueOfItem(listItem : HTMLElement, value : string) {
        listItem.setAttribute('data-list-value', value);
    }

    getValueOfItem(listItem : HTMLElement) {
        return listItem.getAttribute('data-list-value');
    }

    getItemsWithValue(value : HTMLElement) {
        return this.listWrapper.querySelectorAll('[data-list-value="' + value + '"]');
    }

    getItemWithValue(value : HTMLElement) {
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

    getItemsWithValue(value : HTMLElement) {
        return this.root.querySelectorAll('[data-tree-value="' + value + '"]');
    }

    getItemWithValue(value : HTMLElement) {
        return this.root.querySelector('[data-tree-value="' + value + '"]');
    }

    clear()
    {
        let rootList = this.root.querySelector("ul");
        rootList.innerHTML = "";
    }
}

export class TabControl {

    tabElements: HTMLElement[];
    tabContentElements: HTMLElement[];
    activeTab: HTMLElement;
    activeContent: HTMLElement;

    constructor(tabElements : HTMLElement[], tabContentElements : HTMLElement[], defaultActiveTabIdx : number = 0) {
        this.tabElements = tabElements;
        this.tabContentElements = tabContentElements;
        this.activeTab = this.tabElements[defaultActiveTabIdx];
        this.activeContent = this.tabContentElements[defaultActiveTabIdx];

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
            currentContent.style.display = "none";
        }

        this.activeTab.classList.add("basico-tabs-selected");
        this.activeContent.style.display = "block";
    }
}