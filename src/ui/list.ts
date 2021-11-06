// Select from list
export interface IListCallback {
    (item: HTMLElement) : void;
}

export interface IListCallbacks {
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
        let listWrapper = this.listWrapper;
        let listControl = this;
        if (callbacks) {
            element.addEventListener("click", function() {
                listControl.markElementSelected(listWrapper, this);
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
        if (element)
        {
            if (preventCallback) {
                this.markElementSelected(this.listWrapper, element);
            }
            else {
                element.click();
            }
        }
    }

    markElementSelected(listWrapper: HTMLElement, listItem : HTMLElement)
    {
        listWrapper.querySelectorAll(".basico-list-item").forEach(function(node){
            node.classList.remove("basico-list-item-active");
        });
        listItem.classList.add("basico-list-item-active");
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