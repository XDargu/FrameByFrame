class Splitter {
    constructor()
    {
        this.dividers = [];
        this.leftPane = null;
        this.rightPane = null;
        this.splitter = null;
        this.splitterMode = null;
        this.selectedElement = null;
        this.oldPos = 0;
    }

    getPropertyValue(element, property, defaultValue)
    {
        const propertyValue = window.getComputedStyle(element, null).getPropertyValue(property);
        const numberValue = parseFloat(propertyValue);
        return isNaN(numberValue) ? defaultValue : numberValue;
    }

    getCurrentDividerRange()
    {
        if (this.splitterMode == "horizontal") {
            const sizeDivider = splitControl.selectedElement.offsetWidth;

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

                splitControl.selectedElement = this;
                splitControl.splitter = this.parentElement;
                splitControl.splitterMode = this.parentElement.getAttribute("mode");

                splitControl.leftPane = splitControl.selectedElement.previousElementSibling;
                splitControl.rightPane = splitControl.selectedElement.nextElementSibling;

                event.preventDefault();
                return false;
            };
        }

        document.onmousemove = function(event)
        {
            if (splitControl.selectedElement)
            {
                if (splitControl.splitterMode == "horizontal") {
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
}

/*var splitControl = new Splitter();

window.onload = function () {
    splitControl.init();
};*/

// Select from list
function basicoCreateList(listElement, onItemSelectedCallback) {

    let listItems = listElement.querySelectorAll(".basico-list-item");
    let i = 0;
    for (; i < listItems.length; i++) {
        let item = listItems[i];
        
        item.addEventListener("click", function() {
            listElement.querySelectorAll(".basico-list-item").forEach(function(node){
                node.classList.remove("basico-list-item-active");
            });
            this.classList.add("basico-list-item-active");

            onItemSelectedCallback(this);
        });
    }
}

class TabControl {
    constructor(tabElements, tabContentElements, defaultActiveTabIdx = 0) {
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