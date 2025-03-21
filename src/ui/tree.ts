export interface ITreeCallback {
    (item: HTMLElement) : void;
}

export interface ITreeCallbacks {
    onItemSelected: ITreeCallback;
    onItemDoubleClicked: ITreeCallback;
    onItemMouseOver: ITreeCallback;
    onItemMouseOut: ITreeCallback;
}

export interface ITreeItemOptions {
    text?: string;
    value?: string;
    tag?: string;
    collapsed?: boolean;
    selectable?: boolean;
    callbacks?: ITreeCallbacks;
    noHover?: boolean;
}

export class TreeControl {

    root: HTMLElement;
    rootValue: string;

    constructor(treeElement : HTMLElement, value: string) {
        this.root = treeElement;
        this.rootValue = value;
    }

    private setWrapperOptions(wrapper: HTMLElement, listItem: HTMLElement, options: ITreeItemOptions)
    {
        wrapper.onclick = () => {
            if (options.selectable) {
                this.markElementSelected(wrapper);
            }
            if (options.callbacks && options.callbacks.onItemSelected != null)
            {
                options.callbacks.onItemSelected(listItem);
            }
        };

        wrapper.ondblclick = () => {
            if (options.callbacks && options.callbacks.onItemDoubleClicked != null)
            {
                options.callbacks.onItemDoubleClicked(listItem);
            }
        };

        if (options.callbacks && options.callbacks.onItemMouseOver != null)
        {
            wrapper.onmouseover = () => {
                options.callbacks.onItemMouseOver(listItem);
            };
        }

        if (options.callbacks && options.callbacks.onItemMouseOut != null)
        {
            wrapper.onmouseout = () => {
                options.callbacks.onItemMouseOut(listItem);
            };
        }
    }

    buildItem(content : HTMLElement[], options: ITreeItemOptions) {

        let listItem = document.createElement("li");
        listItem.classList.add("basico-tree-leaf");

        let wrapper = document.createElement("span");
        wrapper.classList.add("basico-tree-item-wrapper");
        if (options.noHover)
            wrapper.classList.add("basico-no-hover");
        this.toggleItem(wrapper);
        listItem.appendChild(wrapper);

        let toggle = document.createElement("span");
        toggle.classList.add("basico-tree-item-toggle");
        wrapper.appendChild(toggle);

        let contentWrapper = document.createElement("span");
        contentWrapper.classList.add("basico-tree-item-content");
        for (let i=0; i<content.length; ++i) {
            contentWrapper.appendChild(content[i]);
        }
        if (options.text)
        {
            contentWrapper.insertAdjacentText("beforeend", options.text);
        }
        wrapper.appendChild(contentWrapper);

        let children = document.createElement("ul");
        listItem.appendChild(children);

        if (options.value != null)
        {
            listItem.setAttribute('data-tree-value', options.value);
        }

        if (options.tag != null && options.tag != "")
        {
            let tag = document.createElement("div");
            tag.className = "basico-tag basico-small";
            tag.innerText = options.tag;
            wrapper.appendChild(tag);
        }

        this.setWrapperOptions(wrapper, listItem, options);

        return listItem;
    }

    addItem(parentListItem : HTMLElement, content : HTMLElement[], options: ITreeItemOptions) {

        let parentList = parentListItem.querySelector("ul");

        let listItem = this.buildItem(content, options);

        parentList.appendChild(listItem);
        parentListItem.classList.remove("basico-tree-leaf");

        if (options.collapsed)
        {
            listItem.classList.add("basico-tree-closed");
        }

        return listItem;
    }

    setItem(listItem : HTMLElement, options: ITreeItemOptions)
    {
        const wrapper = this.getWrapperOfItem(listItem);
        if (options.value != null)
        {
            listItem.setAttribute('data-tree-value', options.value);
        }

        this.setWrapperOptions(wrapper, listItem, options);
    }

    getItemParent(listItem : HTMLElement) : HTMLElement {
        return listItem.parentElement.closest("li");
    }

    getWrapperOfItem(listItem : HTMLElement) : HTMLSpanElement {
        return listItem.querySelector(".basico-tree-item-wrapper");
    }

    getContentOfItem(listItem : HTMLElement) : HTMLSpanElement {
        return listItem.querySelector(".basico-tree-item-content");
    }

    getItemOfWrapper(treeItemWrapperElement : HTMLSpanElement) : HTMLElement {
        return treeItemWrapperElement.parentElement;
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

    openItem(treeItemWrapperElement : HTMLSpanElement) {

        let listItem = treeItemWrapperElement.parentElement;

        if (listItem.classList.contains("basico-tree-closed")) {
            listItem.classList.remove("basico-tree-closed");
        }
    }

    openItemRecursively(listItem : HTMLElement) {
        let currentItem = listItem;
        while(currentItem) {
            this.openItem(this.getWrapperOfItem(currentItem));
            currentItem = this.getItemParent(currentItem)
            console.log(currentItem);
        }
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

    markElementSelected(treeItemWrapperElement : HTMLElement)
    {
        this.root.querySelectorAll(".basico-tree-item-wrapper").forEach(function(node){
            node.classList.remove("basico-tree-item-active");
        });
        treeItemWrapperElement.classList.add("basico-tree-item-active");
    }

    isItemSelected(treeItemWrapperElement: HTMLElement)
    {
        return treeItemWrapperElement.classList.contains("basico-tree-item-active");
    }

    public selectElementOfValue(value : string, preventCallback: boolean = false) {
        let listItem = this.getItemWithValue(value) as HTMLElement;
        if (listItem)
        {
            let wrapper = this.getWrapperOfItem(listItem);
            if (preventCallback) {
                this.markElementSelected(wrapper);
            }
            else {
                wrapper.click();
            }
        }
    }

    public scrollToElementOfValue(value : string) {
        let listItem = this.getItemWithValue(value) as HTMLElement;
        if (listItem)
        {
            let wrapper = this.getWrapperOfItem(listItem);
            this.openItemRecursively(this.getItemOfWrapper(wrapper));
            wrapper.scrollIntoView({ block: "nearest"});
        }
        
    }
}