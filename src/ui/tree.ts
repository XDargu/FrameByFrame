import * as Utils from '../utils/utils';

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
}

class TreeItem
{
    listItem: HTMLElement;
    wrapper: HTMLElement;
    tag: HTMLElement;
    contentWrapper: HTMLElement;
}

namespace UI
{
    export function setItem(item: TreeItem, content : HTMLElement[], options: ITreeItemOptions, treeControl: TreeControl)
    {
        Utils.addUniqueClass(item.listItem, "basico-tree-leaf");
        item.contentWrapper.innerHTML = "";

        if (options.text)
        {
            item.contentWrapper.innerText = options.text;
        }
        else
        {
            item.contentWrapper.innerText = "";
        }

        for (let i=0; i<content.length; ++i)
        {
            item.contentWrapper.appendChild(content[i]);
        }

        if (options.value != null)
        {
            item.listItem.setAttribute('data-tree-value', options.value);
        }
        else
        {
            item.listItem.removeAttribute('data-tree-value');
        }

        if (options.tag != null && options.tag != "")
        {
            item.tag.innerText = options.tag;
            item.tag.style.display = "";
        }
        else
        {
            item.tag.style.display = "none";
        }

        if (options.collapsed)
        {
            Utils.addUniqueClass(item.listItem, "basico-tree-closed");
        }
        else
        {
            item.listItem.classList.remove("basico-tree-closed");
        }

        item.wrapper.onclick = () => {
            if (options.selectable) {
                treeControl.markElementSelected(item.wrapper);
            }
            if (options.callbacks && options.callbacks.onItemSelected != null)
            {
                options.callbacks.onItemSelected(item.listItem);
            }
        };

        item.wrapper.ondblclick = () => {
            if (options.callbacks && options.callbacks.onItemDoubleClicked != null)
            {
                options.callbacks.onItemDoubleClicked(item.listItem);
            }
        };

        if (options.callbacks && options.callbacks.onItemMouseOver != null)
        {
            item.wrapper.onmouseover = () => {
                options.callbacks.onItemMouseOver(item.listItem);
            };
        }
        else
        {
            item.wrapper.onmouseover = null;
        }

        if (options.callbacks && options.callbacks.onItemMouseOut != null)
        {
            item.wrapper.onmouseout = () => {
                options.callbacks.onItemMouseOut(item.listItem);
            };
        }
        else
        {
            item.wrapper.onmouseout = null;
        }
    }

    export function buildItem(treeControl: TreeControl) : TreeItem
    {
        let listItem = document.createElement("li");
        listItem.classList.add("basico-tree-leaf");

        let wrapper = document.createElement("span");
        wrapper.classList.add("basico-tree-item-wrapper");
        treeControl.toggleItem(wrapper);
        listItem.appendChild(wrapper);

        let toggle = document.createElement("span");
        toggle.classList.add("basico-tree-item-toggle");
        wrapper.appendChild(toggle);

        let contentWrapper = document.createElement("span");
        contentWrapper.classList.add("basico-tree-item-content");
        wrapper.appendChild(contentWrapper);

        let children = document.createElement("ul");
        listItem.appendChild(children);

        let tag = document.createElement("div");
        tag.className = "basico-tag basico-small";
        wrapper.appendChild(tag);

        let item = {
            listItem: listItem,
            wrapper: wrapper,
            tag: tag,
            contentWrapper: contentWrapper
        };

        return item;
    }
}

class TreeItemPool
{
    pool: TreeItem[];
    used: TreeItem[];
    control: TreeControl;

    constructor(control: TreeControl)
    {
        this.pool = [];
        this.used = [];
        this.control = control;
    }

    public get()
    {
        if (this.pool.length == 0)
        {
            let item = UI.buildItem(this.control);
            this.used.push(item);
            return item;
        }

        let item = this.pool.pop();
        this.used.push(item);
        return item;
    }

    public freeAll()
    {
        for (let i=0; i<this.used.length; ++i)
        {
            this.pool.push(this.used[i]);
        }
        this.used = [];
    }
}

export class TreeControl {

    root: HTMLElement;
    pool: TreeItemPool;
    isPoolEnabled: boolean;

    constructor(treeElement : HTMLElement) {
        this.root = treeElement;
        this.pool = new TreeItemPool(this);
        this.isPoolEnabled = true;
    }

    setPoolEnabled(isEnabled: boolean)
    {
        this.isPoolEnabled = isEnabled;
    }

    buildItem(content : HTMLElement[], options: ITreeItemOptions)
    {
        let item = UI.buildItem(this);
        return item.listItem;
    }

    addItem(parentListItem : HTMLElement, content : HTMLElement[], options: ITreeItemOptions) {

        let parentList = parentListItem.querySelector("ul");

        let item = this.isPoolEnabled ? this.pool.get() : UI.buildItem(this);
        UI.setItem(item, content, options, this);

        parentList.appendChild(item.listItem);
        parentListItem.classList.remove("basico-tree-leaf");

        return item.listItem;
    }

    getItemParent(listItem : HTMLElement) : HTMLElement {
        return listItem.parentElement.closest("li");
    }

    getWrapperOfItem(listItem : HTMLElement) : HTMLSpanElement {
        return listItem.querySelector(".basico-tree-item-wrapper");
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
        this.pool.freeAll();
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