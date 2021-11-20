import { EventFilter, Filter, FilterType } from "../filters/filters";

export type FilterId = number;

class FilterIdGenerator
{
    static lastId: number= 1;
    static nextId() { return ++this.lastId; }
}

interface FilterData
{
    name: string;
    filter: Filter;
    element: HTMLDivElement;
}

export interface IFilterCallback
{
    (id: FilterId) : void
}

interface IFilterParamChanged
{
    (id: FilterId, param: string) : void
}

interface EventFilterCallbacks
{
    onFilterNameChanged: IFilterParamChanged;
    onNameChanged: IFilterParamChanged;
    onTagChanged: IFilterParamChanged;
}

export default class FiltersList
{
    private addButton: HTMLButtonElement;
    private filterContainer: HTMLElement;
    private filters: Map<FilterId, FilterData>;

    constructor(addButton: HTMLButtonElement, filterContainer: HTMLElement)
    {
        this.addButton = addButton;
        this.filterContainer = filterContainer;
        this.addButton.onclick = () => { this.addEventFilter(); };
        this.filters = new Map<FilterId, FilterData>();
    }

    addEventFilter()
    {
        const filterId = FilterIdGenerator.nextId();
        const filter = new EventFilter("", "", []);
        const filterName = "Filter " + filterId;

        const filterElement = FiltersList.createEventFilter(filterId, filterName, {
            onFilterNameChanged: this.onFilterNameChanged.bind(this),
            onNameChanged: this.onFilterEventNameChanged.bind(this),
            onTagChanged: this.onFilterEventTagChanged.bind(this),
        });

        this.filters.set(filterId, { name: filterName, filter: filter, element: filterElement});
        
        this.filterContainer.appendChild(filterElement);
    }

    private onFilterChanged(id: FilterId)
    {
        console.log(this.filters.get(id));
    }

    private onFilterNameChanged(id: FilterId, filterName: string)
    {
        let filterData = this.filters.get(id);
        filterData.name = filterName;
        filterData.element.querySelector('.basico-title span').textContent = filterName;
        this.onFilterChanged(id);
    }

    private onFilterEventNameChanged(id: FilterId, name: string)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).name = name;
        }
        this.onFilterChanged(id);
    }

    private onFilterEventTagChanged(id: FilterId, tag: string)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).tag = tag;
        }
        this.onFilterChanged(id);
    }

    static createFilterTitle(name: string) : HTMLDivElement
    {
        const title = document.createElement("div");
        title.className = "basico-title basico-title-compact uppercase";

        const icon = document.createElement("div");
        icon.className = "filter-icon";

        const span = document.createElement("span");
        span.textContent = name;

        title.append(
            icon,
            span
        );

        return title;
    }

    static createFilterField(id: FilterId, labelName: string, value: string, onFieldChanged: IFilterParamChanged) : HTMLDivElement
    {
        const field = document.createElement("div");
        field.className = "basico-form-field";

        const label = document.createElement("div");
        label.className = "basico-form-field-label";
        label.textContent = labelName;
        field.appendChild(label);

        const input = document.createElement("input");
        input.className = "basico-input";
        input.type = "text";
        input.value = value;
        input.onchange = () => { onFieldChanged(id, input.value); };
        field.appendChild(input);

        return field;
    }

    static createFilterAddPropButton()
    {
        const wrapper = document.createElement("div");
        wrapper.className = "basico-form-field button-add-filter-prop";

        const button = document.createElement("button");
        button.className = "basico-button basico-small";
        wrapper.appendChild(button);

        const icon = document.createElement("i");
        icon.className = "fas fa-plus";
        button.appendChild(icon);

        const span = document.createElement("span");
        span.textContent = "Add Property";
        wrapper.appendChild(span);

        return wrapper;
    }

    static createDropdownEntry(name: string) : HTMLElement
    {
        let entry = document.createElement("a");
        entry.textContent = name;
        return entry;
    }

    static createPropertyTypeSelection() : HTMLDivElement
    {
        const dropdown = document.createElement("div");
        dropdown.className = "basico-dropdown";

        const dropdownButton = document.createElement("button");
        dropdownButton.className = "basico-dropdown-button";
        dropdownButton.textContent = "String";
        dropdown.appendChild(dropdownButton);

        const dropdownContent = document.createElement("div");
        dropdownContent.className = "basico-dropdown-content";
        dropdown.appendChild(dropdownContent);

        dropdownContent.append(
            this.createDropdownEntry("String"),
            this.createDropdownEntry("Number"),
            this.createDropdownEntry("Boolean")
        );

        return dropdown;
    }

    static createPropertyFilterSelection()
    {
        const dropdownType = document.createElement("div");
        dropdownType.className = "basico-dropdown";

        const dropdownTypeButton = document.createElement("button");
        dropdownTypeButton.className = "basico-dropdown-button";
        dropdownTypeButton.textContent = "Contains";
        dropdownType.appendChild(dropdownTypeButton);

        const dropdownTypeContent = document.createElement("div");
        dropdownTypeContent.className = "basico-dropdown-content";
        dropdownType.appendChild(dropdownTypeContent);

        dropdownTypeContent.append(
            this.createDropdownEntry("Contains"),
            this.createDropdownEntry("Equals"),
            this.createDropdownEntry("Different")
        );

        return dropdownType;
    }

    static createPropertiesTitle(text: string)
    {
        const wrapper = document.createElement("div");
        wrapper.className = "basico-form-field";

        const label = document.createElement("div");
        label.className = "basico-form-field-label";
        label.textContent = text;
        wrapper.appendChild(label);

        return wrapper;
    }

    static createProperties()
    {
        const propertiesWrapper = document.createElement("div");
        propertiesWrapper.className = "filter-property-control";

        const propertiesFormWrapper = document.createElement("div");
        propertiesFormWrapper.className = "filter-property-control-form";
        propertiesWrapper.appendChild(propertiesFormWrapper);

        const propertyWrapper = document.createElement("div");
        propertyWrapper.className = "basico-form-field filter-property-wrapper";

        const typeDropDown = this.createPropertyTypeSelection();
        propertyWrapper.appendChild(typeDropDown);

        const nameInput = document.createElement("input");
        nameInput.className = "basico-input";
        propertyWrapper.appendChild(nameInput);

        const filterWrapper = document.createElement("div");
        filterWrapper.className = "basico-form-field filter-property-wrapper";

        const propFilterDropdown = this.createPropertyFilterSelection();
        filterWrapper.appendChild(propFilterDropdown);

        const filterInput = document.createElement("input");
        filterInput.className = "basico-input";
        filterWrapper.appendChild(filterInput);

        propertiesFormWrapper.append(
            propertyWrapper,
            filterWrapper
        );

        const removeIcon = document.createElement("div");
        const icon = document.createElement("i");
        icon.className = "fa fa-trash remove-property";
        icon.onclick = () => {  }; // TODO: Remove property callback
        removeIcon.appendChild(icon);

        propertiesWrapper.appendChild(removeIcon);

        return propertiesWrapper;
    }

    static createEventFilter(id: FilterId, filterName: string, callbacks: EventFilterCallbacks) : HTMLDivElement
    {
        const wrapper = document.createElement("div");
        wrapper.className = "basico-card filter-wrapper";

        const title = this.createFilterTitle("EVENT FILTER");
        wrapper.appendChild(title);

        const card = document.createElement("div");
        card.className = "basico-card-element";
        wrapper.appendChild(card);

        const form = document.createElement("div");
        form.className = "basico-form";
        card.appendChild(form);

        const filterNameElem = this.createFilterField(id, "Filter name:", filterName, callbacks.onFilterNameChanged);
        form.appendChild(filterNameElem);

        const eventName = this.createFilterField(id, "Event name:", "", callbacks.onNameChanged);
        form.appendChild(eventName);

        const eventTag = this.createFilterField(id, "Event tag:", "", callbacks.onTagChanged);
        form.appendChild(eventTag);

        const propertiesWrapper = document.createElement("div");
        form.appendChild(propertiesWrapper);

        propertiesWrapper.appendChild(this.createPropertiesTitle("Event properties"));

        const button = this.createFilterAddPropButton();
        button.onclick = () => {
            propertiesWrapper.appendChild(this.createProperties());
            // TODO: Callbacks when adding properties
        };
        form.appendChild(button);

        return wrapper;

    }
}