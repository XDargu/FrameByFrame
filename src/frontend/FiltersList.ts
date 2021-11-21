import { availableModesPerMemberType, EventFilter, Filter, FilterMode, filterModeAsString, FilterType, getDefaultValuePerMemberType, MemberFilter, MemberFilterType, memberFilterTypeAsString } from "../filters/filters";

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

interface IMemberAdded
{
    (id: FilterId, member: MemberFilter) : void
}

interface IMemberRemoved
{
    (id: FilterId, index: number) : void
}

interface IMemberNameChanged
{
    (id: FilterId, index: number, name: string) : void
}

interface IMemberTypeChanged
{
    (id: FilterId, index: number, type: MemberFilterType) : void
}

interface IMemberModeChanged
{
    (id: FilterId, index: number, mode: FilterMode) : void
}

interface IMemberValueChanged
{
    (id: FilterId, index: number, value: string | number | boolean) : void
}

interface MemberCallbacks
{
    onMemberAdded: IMemberAdded;
    onMemberRemoved: IMemberRemoved;
    onMemberNameChanged: IMemberNameChanged;
    onMemberTypeChanged: IMemberTypeChanged;
    onMemberModeChanged: IMemberModeChanged;
    onMemberValueChanged: IMemberValueChanged;
}

interface EventFilterCallbacks
{
    onFilterNameChanged: IFilterParamChanged;
    onNameChanged: IFilterParamChanged;
    onTagChanged: IFilterParamChanged;

    members: MemberCallbacks;

    /*
    onMemberNameChanged: (id: FilterId, index: number, name: string)
    onMemberTypeChanged: (id: FilterId, index: number, type: FilterMemberType)
    onMemberModeChanged: (id: FilterId, index: number, mode: FilterMode)
    onMemberValueChanged: (id: FilterId, index: number, value: string | number | boolean)
     */
}

namespace UI
{
    function getPropertyWithIndex(filterElement: HTMLElement, index: number) : HTMLElement
    {
        const propertyList = filterElement.querySelector(".filter-properties-list");
        return propertyList.children.item(index) as HTMLElement;
    }

    function getParentPropertyControl(element: HTMLElement) : HTMLElement
    {
        return element.closest(".filter-property-control");
    }

    function getIndexOfProperty(element: HTMLElement) : number
    {
        const control = getParentPropertyControl(element);
        return [...control.parentElement.childNodes].indexOf(control);
    }

    function createFilterTitle(name: string) : HTMLDivElement
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

    function createFilterField(id: FilterId, labelName: string, value: string, onFieldChanged: IFilterParamChanged) : HTMLDivElement
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
        input.onkeyup = () => { onFieldChanged(id, input.value); };
        field.appendChild(input);

        return field;
    }

    function createFilterAddPropButton()
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

    function createDropdownEntry(name: string) : HTMLElement
    {
        let entry = document.createElement("a");
        entry.textContent = name;
        return entry;
    }

    function createPropertyTypeSelection(id: FilterId, type: MemberFilterType, callbacks: MemberCallbacks) : HTMLDivElement
    {
        const dropdown = document.createElement("div");
        dropdown.className = "basico-dropdown";

        const dropdownButton = document.createElement("button");
        dropdownButton.className = "basico-dropdown-button";
        dropdownButton.textContent = memberFilterTypeAsString(type);
        dropdown.appendChild(dropdownButton);

        const dropdownContent = document.createElement("div");
        dropdownContent.className = "basico-dropdown-content";
        dropdown.appendChild(dropdownContent);

        const types = [MemberFilterType.String, MemberFilterType.Number, MemberFilterType.Boolean];
        const entries = types.map((currType) => {
            let entry = createDropdownEntry(memberFilterTypeAsString(currType));
            entry.onclick = () => {
                dropdownButton.textContent = memberFilterTypeAsString(currType);
                callbacks.onMemberTypeChanged(id, getIndexOfProperty(dropdownButton), currType);
            };
            return entry;
        });

        dropdownContent.append(...entries);
        return dropdown;
    }

    function createPropertyModeSelection(id: FilterId, type: MemberFilterType, mode: FilterMode, callbacks: MemberCallbacks)
    {
        const dropdownType = document.createElement("div");
        dropdownType.className = "basico-dropdown";

        const dropdownTypeButton = document.createElement("button");
        dropdownTypeButton.className = "basico-dropdown-button";
        dropdownTypeButton.textContent = filterModeAsString(mode);
        dropdownType.appendChild(dropdownTypeButton);

        const dropdownTypeContent = document.createElement("div");
        dropdownTypeContent.className = "basico-dropdown-content";
        dropdownType.appendChild(dropdownTypeContent);

        const availableModes = availableModesPerMemberType(type);
        const entries = availableModes.map((currMode) => {
            let entry = createDropdownEntry(filterModeAsString(currMode));
            entry.onclick = () => {
                dropdownTypeButton.textContent = filterModeAsString(currMode);
                callbacks.onMemberModeChanged(id, getIndexOfProperty(entry), currMode);
            };
            return entry;
        });
        dropdownTypeContent.append(...entries);

        return dropdownType;
    }

    function createPropertiesTitle(text: string)
    {
        const wrapper = document.createElement("div");
        wrapper.className = "basico-form-field";

        const label = document.createElement("div");
        label.className = "basico-form-field-label";
        label.textContent = text;
        wrapper.appendChild(label);

        return wrapper;
    }

    function createNameAndTypeWrapper(id: FilterId, member: MemberFilter, callbacks: MemberCallbacks)
    {
        const propertyWrapper = document.createElement("div");
        propertyWrapper.className = "basico-form-field filter-property-wrapper filter-member-name-type";

        const typeDropDown = createPropertyTypeSelection(id, member.type, callbacks);
        propertyWrapper.appendChild(typeDropDown);

        const nameInput = document.createElement("input");
        nameInput.className = "basico-input";
        nameInput.value = member.name;
        nameInput.onkeyup = () => {
            callbacks.onMemberNameChanged(id, getIndexOfProperty(nameInput), nameInput.value);
        };
        propertyWrapper.appendChild(nameInput);

        return propertyWrapper;
    }

    export function createModeAndValueWrapper(id: FilterId, member: MemberFilter, callbacks: MemberCallbacks)
    {
        const filterWrapper = document.createElement("div");
        filterWrapper.className = "basico-form-field filter-property-wrapper filter-member-mode-val";

        const propFilterDropdown = createPropertyModeSelection(id, member.type, member.mode, callbacks);
        filterWrapper.appendChild(propFilterDropdown);

        const filterInput = document.createElement("input");
        filterInput.className = "basico-input";
        filterInput.value = member.value.toString(); // TODO: Different type of inputs depending on the type
        filterInput.onkeyup = () => {
            let value: string | number | boolean = filterInput.value;
            if (member.type == MemberFilterType.Number)
                value = Number.parseFloat(value);
            if (member.type == MemberFilterType.Boolean)
                value = value == "true" ? true : false;

            callbacks.onMemberValueChanged(id, getIndexOfProperty(filterInput), value);
        };
        filterWrapper.appendChild(filterInput);

        return filterWrapper;
    }

    function createProperties(id: FilterId, member: MemberFilter, callbacks: MemberCallbacks)
    {
        const propertiesWrapper = document.createElement("div");
        propertiesWrapper.className = "filter-property-control";

        const propertiesFormWrapper = document.createElement("div");
        propertiesFormWrapper.className = "filter-property-control-form";
        propertiesWrapper.appendChild(propertiesFormWrapper);

        const propertyWrapper = createNameAndTypeWrapper(id, member, callbacks);
        const filterWrapper = createModeAndValueWrapper(id, member, callbacks);

        propertiesFormWrapper.append(
            propertyWrapper,
            filterWrapper
        );

        const removeIcon = document.createElement("div");
        const icon = document.createElement("i");
        icon.className = "fa fa-trash remove-property";
        icon.onclick = () => {
            callbacks.onMemberRemoved(id, getIndexOfProperty(icon));
            propertiesWrapper.remove();
        };
        removeIcon.appendChild(icon);

        propertiesWrapper.appendChild(removeIcon);

        return propertiesWrapper;
    }

    export function createEventFilter(id: FilterId, filterName: string, filter: EventFilter, callbacks: EventFilterCallbacks) : HTMLDivElement
    {
        const wrapper = document.createElement("div");
        wrapper.className = "basico-card filter-wrapper";

        const title = createFilterTitle(filterName + " (event)");
        wrapper.appendChild(title);

        const card = document.createElement("div");
        card.className = "basico-card-element";
        wrapper.appendChild(card);

        const form = document.createElement("div");
        form.className = "basico-form";
        card.appendChild(form);

        const filterNameElem = createFilterField(id, "Filter name:", filterName, (id, param) => {
            title.querySelector("span").textContent = param + " (event)";
            callbacks.onFilterNameChanged(id, param);
        });
        form.appendChild(filterNameElem);

        const eventName = createFilterField(id, "Event name:", filter.name, callbacks.onNameChanged);
        form.appendChild(eventName);

        const eventTag = createFilterField(id, "Event tag:", filter.tag, callbacks.onTagChanged);
        form.appendChild(eventTag);

        form.appendChild(createPropertiesTitle("Event properties"));

        const propertiesWrapper = document.createElement("div");
        propertiesWrapper.className = "filter-properties-list";
        form.appendChild(propertiesWrapper);

        const button = createFilterAddPropButton();
        button.onclick = () => {
            const member = { name: "", type: MemberFilterType.String, value: "", mode: FilterMode.Contains};

            propertiesWrapper.appendChild(createProperties(id, member, callbacks.members));
            callbacks.members.onMemberAdded(id, member);
        };
        form.appendChild(button);

        for (let i=0; i<filter.members.length; ++i)
        {
            propertiesWrapper.appendChild(createProperties(id, filter.members[i], callbacks.members));
        }

        return wrapper;
    }
}

export default class FiltersList
{
    private addButton: HTMLButtonElement;
    private filterContainer: HTMLElement;
    private filters: Map<FilterId, FilterData>;

    private memberCallbacks = {
        onMemberAdded: this.onMemberAdded.bind(this),
        onMemberRemoved: this.onMemberRemoved.bind(this),
        onMemberNameChanged: this.onMemberNameChanged.bind(this),
        onMemberTypeChanged: this.onMemberTypeChanged.bind(this),
        onMemberModeChanged: this.onMemberModeChanged.bind(this),
        onMemberValueChanged: this.onMemberValueChanged.bind(this)
    }

    private filterCallbacks = {
        onFilterNameChanged: this.onFilterNameChanged.bind(this),
        onNameChanged: this.onFilterEventNameChanged.bind(this),
        onTagChanged: this.onFilterEventTagChanged.bind(this),
        members: this.memberCallbacks
    };

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

        const filterElement = UI.createEventFilter(filterId, filterName, filter, this.filterCallbacks);

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

    private onMemberAdded(id: FilterId, member: MemberFilter)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).members.push(member);
        }
        this.onFilterChanged(id);
    }

    private onMemberRemoved(id: FilterId, index: number)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).members.splice(index, 1);
        }
        this.onFilterChanged(id);
    }

    private onMemberNameChanged(id: FilterId, index: number, name: string)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).members[index].name = name;
        }
        this.onFilterChanged(id);
    }

    private onMemberValueChanged(id: FilterId, index: number, value: string | number | boolean)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).members[index].value = value;
        }
        this.onFilterChanged(id);
    }

    private onMemberModeChanged(id: FilterId, index: number, mode: FilterMode)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).members[index].mode = mode;
        }
        this.onFilterChanged(id);
    }

    private onMemberTypeChanged(id: FilterId, index: number, type: MemberFilterType)
    {
        let filterData = this.filters.get(id);
        let filter = filterData.filter;
        if (filter.type == FilterType.Event)
        {
            let member = (filter as EventFilter).members[index];
            if (member.type != type)
            {
                member.type = type;

                // Fix value & mode
                const availableModes = availableModesPerMemberType(type);
                if (availableModes.indexOf(member.mode) == -1)
                {
                    member.mode = availableModes[0];
                }

                member.value = getDefaultValuePerMemberType(type);

                // Update mode and value
                const memberModeEntry = filterData.element.querySelector(".filter-member-mode-val");
                let regeneratedModeEntry = UI.createModeAndValueWrapper(id, member, this.memberCallbacks);

                memberModeEntry.parentNode.insertBefore(regeneratedModeEntry, memberModeEntry);
                memberModeEntry.remove();
            }
        }

        
        this.onFilterChanged(id);
    }

    private createEventFilter(id: FilterId, filter: EventFilter)
    {

    }
}