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