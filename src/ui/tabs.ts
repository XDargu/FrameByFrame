export const enum TabBorder
{
    None,
    Left = "basico-border-left",
    Righ = "basico-border-right"
}

export const enum TabDisplay
{
    Block = "block",
    Flex = "flex",
}

export class TabControl {

    tabElements: HTMLElement[];
    tabContentElements: HTMLElement[];
    activeTab: HTMLElement;
    activeContent: HTMLElement;
    tabBorder: TabBorder;
    tabDisplay: TabDisplay;

    constructor(tabElements : HTMLElement[], tabContentElements : HTMLElement[], defaultActiveTabIdx : number = 0, tabBorder: TabBorder = TabBorder.None, tabDisplay: TabDisplay = TabDisplay.Block) {
        this.tabElements = tabElements;
        this.tabContentElements = tabContentElements;
        this.activeTab = this.tabElements[defaultActiveTabIdx];
        this.activeContent = this.tabContentElements[defaultActiveTabIdx];
        this.tabBorder = tabBorder;
        this.tabDisplay = tabDisplay;

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
            
            if (this.tabDisplay == TabDisplay.Flex) {
                currentContent.style.flexDirection = "column";
            }
        }

        this.activeTab.classList.add("basico-tabs-selected");
        this.activeContent.style.display = this.tabDisplay;
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

    closeAllTabs()
    {
        this.activeTab.classList.remove("basico-tabs-selected");
        this.activeContent.style.display = "none";
    }

    private activateTab(tab: HTMLElement, content: HTMLElement)
    {
        this.activeTab.classList.remove("basico-tabs-selected");
        tab.classList.add("basico-tabs-selected");
        this.activeTab = tab;

        this.activeContent.style.display = "none";
        content.style.display = this.tabDisplay;
        this.activeContent = content;
    }
}