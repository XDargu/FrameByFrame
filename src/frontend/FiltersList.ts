import { availableModesPerMemberType, EventFilter, Filter, FilterMode, filterModeAsString, FilterType, filterTypeAsString, getDefaultValuePerMemberType, MemberFilter, MemberFilterType, memberFilterTypeAsString, PropertyFilter } from "../filters/filters";
import * as Utils from '../utils/utils'
import { Console, LogChannel, LogLevel } from "./ConsoleController";

export type FilterId = number;

class FilterIdGenerator
{
    static lastId: number = 0;
    static nextId() { return ++this.lastId; }
}

interface FilterData
{
    name: string;
    filter: Filter;
    element: HTMLDivElement;
    visible: boolean;
}

export interface IFilterCallback
{
    (id: FilterId, name: string, filter: Filter) : void
}

interface IFilterParamChanged
{
    (id: FilterId, param: string) : void
}

export interface IFilterRemoved
{
    (id: FilterId) : void
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

interface CommonCallbacks
{
    onFilterNameChanged: IFilterParamChanged;
    onFilterRemoved: IFilterRemoved;
}

interface EventFilterCallbacks
{
    onNameChanged: IFilterParamChanged;
    onTagChanged: IFilterParamChanged;

    members: MemberCallbacks;
    common: CommonCallbacks;
}

interface PropertyFilterCallbacks
{
    onGroupChanged: IFilterParamChanged;

    members: MemberCallbacks;
    common: CommonCallbacks;
}

export interface FilterListCallbacks
{
    onFilterChanged: IFilterCallback;
    onFilterCreated: IFilterCallback;
    onFilterRemoved: IFilterRemoved;
    onFilterNameChanged: IFilterParamChanged;
}

namespace UI
{
    export function getPropertyWithIndex(filterElement: HTMLElement, index: number) : HTMLElement
    {
        const propertyList = filterElement.querySelector(".filter-properties-list");
        return propertyList.children.item(index) as HTMLElement;
    }

    export function setResultCount(filterElement: HTMLElement, count: number) 
    {
        let results = filterElement.querySelector(".filter-results-count");
        results.textContent = `${count} results`;
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

    function createFilterTitle(id: FilterId, name: string, label: string, callbacks: CommonCallbacks) : HTMLDivElement
    {
        const title = document.createElement("div");
        title.className = "basico-title basico-title-compact uppercase";

        const color = Utils.colorFromHash(id);
        const icon = document.createElement("div");
        icon.className = "filter-icon";
        icon.style.backgroundColor = color;

        const arrowIcon = document.createElement("i");
        arrowIcon.className = "fa fa-angle-down filter-arrow-icon";

        const titleContent = document.createElement("div");
        titleContent.className = "filter-title-content";

        const titleName = document.createElement("div");
        titleName.className = "filter-title-name";
        titleName.textContent = name;

        const titleType = document.createElement("div");
        titleType.className = "filter-title-type";
        titleType.textContent = label;

        titleContent.append(titleName, titleType);

        const removeButton = document.createElement("i");
        removeButton.className = "fa fa-trash remove-filter";
        removeButton.title = "Remove filter";
        removeButton.onclick = () => {
            callbacks.onFilterRemoved(id);
        };

        title.append(
            icon,
            arrowIcon,
            titleContent,
            removeButton
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
        nameInput.className = "basico-input basico-small";
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
        filterInput.className = "basico-input basico-small";
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

    function createMemberList(id: FilterId, members: MemberFilter[], memberCallbacks: MemberCallbacks) : HTMLElement[]
    {
        const propertiesWrapper = document.createElement("div");
        propertiesWrapper.className = "filter-properties-list";

        const button = createFilterAddPropButton();
        button.onclick = () => {
            const member = { name: "", type: MemberFilterType.String, value: "", mode: FilterMode.Contains};

            propertiesWrapper.appendChild(createProperties(id, member, memberCallbacks));
            memberCallbacks.onMemberAdded(id, member);
        };

        for (let i=0; i<members.length; ++i)
        {
            propertiesWrapper.appendChild(createProperties(id, members[i], memberCallbacks));
        }

        return [propertiesWrapper, button];
    }

    function createFilterWrapper(id: FilterId, filterName: string, filterLabel: string, callbacks: CommonCallbacks, filterExtraFields: HTMLElement[]) : HTMLDivElement
    {
        const color = Utils.colorFromHash(id);

        const wrapper = document.createElement("div");
        wrapper.className = "basico-card filter-wrapper";

        const title = createFilterTitle(id, filterName, filterLabel, callbacks);
        wrapper.appendChild(title);

        const card = document.createElement("div");
        card.className = "basico-card-element";
        card.style.borderBottom = "5px solid " + color;
        wrapper.appendChild(card);

        title.onclick = () => {
            card.classList.toggle("hidden");
            let arrowIcon = title.querySelector(".filter-arrow-icon") as HTMLElement;
            Utils.toggleClasses(arrowIcon, "fa-angle-down", "fa-angle-right");
        };

        const resultCount = document.createElement("div");
        resultCount.className = "filter-results-count";
        card.appendChild(resultCount);

        const form = document.createElement("div");
        form.className = "basico-form";
        card.appendChild(form);

        const filterNameElem = createFilterField(id, "Filter name:", filterName, (id, param) => {
            title.querySelector(".filter-title-name").textContent = param;
            callbacks.onFilterNameChanged(id, param);
        });
        form.appendChild(filterNameElem);

        form.append(...filterExtraFields);

        return wrapper;
    }

    export function createEventFilter(id: FilterId, filterName: string, filter: EventFilter, callbacks: EventFilterCallbacks) : HTMLDivElement
    {
        const eventName = createFilterField(id, "Event name:", filter.name, callbacks.onNameChanged);
        const eventTag = createFilterField(id, "Event tag:", filter.tag, callbacks.onTagChanged);
        const propertiesTitle = createPropertiesTitle("Event properties");
        const memberList = createMemberList(id, filter.members, callbacks.members);

        const fields = [eventName, eventTag, propertiesTitle, ...memberList];
        
        return createFilterWrapper(id, filterName, filterTypeAsString(FilterType.Event), callbacks.common, fields);
    }

    export function createPropertyFilter(id: FilterId, filterName: string, filter: PropertyFilter, callbacks: PropertyFilterCallbacks) : HTMLDivElement
    {
        const propertyGroup = createFilterField(id, "Property group:", filter.group, callbacks.onGroupChanged);
        const propertiesTitle = createPropertiesTitle("Properties");
        const memberList = createMemberList(id, filter.members, callbacks.members);

        const fields = [propertyGroup, propertiesTitle, ...memberList];
        
        return createFilterWrapper(id, filterName, filterTypeAsString(FilterType.Property), callbacks.common, fields);
    }

    export function createFilterCreationEntry(name: string)
    {
        const entry = document.createElement("a");
        entry.textContent = name;
        return entry;
    }
}

function getFilterMembers(filter: Filter) : MemberFilter[]
{
    switch(filter.type)
    {
        case FilterType.Event: return (filter as EventFilter).members;
        case FilterType.Property: return (filter as PropertyFilter).members;
    }
}

export default class FiltersList
{
    private readonly memberCallbacks = {
        onMemberAdded: this.onMemberAdded.bind(this),
        onMemberRemoved: this.onMemberRemoved.bind(this),
        onMemberNameChanged: this.onMemberNameChanged.bind(this),
        onMemberTypeChanged: this.onMemberTypeChanged.bind(this),
        onMemberModeChanged: this.onMemberModeChanged.bind(this),
        onMemberValueChanged: this.onMemberValueChanged.bind(this)
    }

    private readonly commonCallbacks = {
        onFilterNameChanged: this.onFilterNameChanged.bind(this),
        onFilterRemoved: this.onFilterRemoved.bind(this)
    }

    private readonly eventFilterCallbacks = {
        onNameChanged: this.onEventFilterNameChanged.bind(this),
        onTagChanged: this.onEventFilterTagChanged.bind(this),
        members: this.memberCallbacks,
        common: this.commonCallbacks
    };

    private readonly propertyFilterCallbacks = {
        onGroupChanged: this.onPropertyFilterGroupChanged.bind(this),
        members: this.memberCallbacks,
        common: this.commonCallbacks
    };

    private addDropdown: HTMLElement;
    private filterContainer: HTMLElement;
    private filters: Map<FilterId, FilterData>;
    private callbacks: FilterListCallbacks;

    constructor(addDropdown: HTMLElement, filterContainer: HTMLElement, callbacks: FilterListCallbacks)
    {
        this.addDropdown = addDropdown;
        this.filterContainer = filterContainer;
        this.filters = new Map<FilterId, FilterData>();
        this.callbacks = callbacks;

        this.initializeDropwdon();
    }

    initializeDropwdon()
    {
        let content = this.addDropdown.querySelector('.basico-dropdown-content') as HTMLElement;
        
        const createEventFilter = UI.createFilterCreationEntry("Event Filter");
        createEventFilter.onclick = () => { this.addEventFilter(); };

        const createPropertyFilter = UI.createFilterCreationEntry("Property Filter");
        createPropertyFilter.onclick = () => { this.addPropertyFilter(); };

        content.append(createEventFilter, createPropertyFilter);

        this.addDropdown.onmouseenter = () => {
            const isNearBottom = window.innerHeight - this.addDropdown.getBoundingClientRect().bottom < 70;
            Utils.setClass(content, "bottom", isNearBottom);
        };
    }

    getFilters()
    {
        return this.filters;
    }

    scrollToFilter(id: FilterId)
    {
        let filterData = this.filters.get(id);
        if (filterData)
        {
            filterData.element.scrollIntoView();
        }
    }

    addEventFilter()
    {
        this.addFilter(new EventFilter("", "", []));
    }

    addPropertyFilter()
    {
        this.addFilter(new PropertyFilter("", []));
    }

    addFilter(filter: Filter)
    {
        const filterId = FilterIdGenerator.nextId();
        const filterName = "Filter " + filterId;

        let filterElement = null;
        switch(filter.type)
        {
            case FilterType.Property:
                filterElement = UI.createPropertyFilter(filterId, filterName, filter as PropertyFilter, this.propertyFilterCallbacks);
                break;
            case FilterType.Event:
                filterElement = UI.createEventFilter(filterId, filterName, filter as EventFilter, this.eventFilterCallbacks);
                break;
        }

        if (filterElement)
        {
            this.filters.set(filterId, { name: filterName, filter: filter, element: filterElement, visible: true});
            
            this.filterContainer.insertBefore(filterElement, this.addDropdown);

            Console.log(LogLevel.Verbose, LogChannel.Filters, "Filter added: " + filterName);
            this.callbacks.onFilterCreated(filterId, filterName, filter);
            this.onFilterChanged(filterId);
        }
    }

    setFilterVisibility(id: FilterId, visible: boolean)
    {
        let filterData = this.filters.get(id);
        if (filterData)
        {
            filterData.visible = visible;
            this.onFilterChanged(id);
        }
    }

    isFilterVisible(id: FilterId) : boolean
    {
        const filterData = this.filters.get(id);
        if (filterData)
        {
            return filterData.visible;
        }

        return false;
    }

    setFilterResultsCount(id: FilterId, count: number)
    {
        const filterData = this.filters.get(id);
        if (filterData)
        {
            UI.setResultCount(filterData.element, count);
        }
    }

    private onFilterChanged(id: FilterId)
    {
        const filterData = this.filters.get(id);
        if (filterData)
        {
            this.callbacks.onFilterChanged(id, filterData.name, filterData.filter);
        }
        else
        {
            this.callbacks.onFilterChanged(id, "", null);
        }
    }

    private onFilterNameChanged(id: FilterId, filterName: string)
    {
        let filterData = this.filters.get(id);
        filterData.name = filterName;
        this.callbacks.onFilterNameChanged(id, filterName);
        this.onFilterChanged(id);
    }

    private onFilterRemoved(id: FilterId)
    {
        let filterData = this.filters.get(id);
        filterData.element.remove();
        Console.log(LogLevel.Verbose, LogChannel.Filters, "Filter removed: " + filterData.name);
        this.filters.delete(id);
        this.callbacks.onFilterRemoved(id);
        this.onFilterChanged(id);
    }

    private onPropertyFilterGroupChanged(id: FilterId, group: string)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Property)
        {
            (filter as PropertyFilter).group = group;
        }
        this.onFilterChanged(id);
    }

    private onEventFilterNameChanged(id: FilterId, name: string)
    {
        let filter: Filter = this.filters.get(id).filter;
        if (filter.type == FilterType.Event)
        {
            (filter as EventFilter).name = name;
        }
        this.onFilterChanged(id);
    }

    private onEventFilterTagChanged(id: FilterId, tag: string)
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
        let members = getFilterMembers(filter);
        if (members)
        {
            members.push(member);
        }
        this.onFilterChanged(id);
    }

    private onMemberRemoved(id: FilterId, index: number)
    {
        let filter: Filter = this.filters.get(id).filter;
        let members = getFilterMembers(filter);
        if (members)
        {
            members.splice(index, 1);
        }
        this.onFilterChanged(id);
    }

    private onMemberNameChanged(id: FilterId, index: number, name: string)
    {
        let filter: Filter = this.filters.get(id).filter;
        let members = getFilterMembers(filter);
        if (members)
        {
            members[index].name = name;
        }
        this.onFilterChanged(id);
    }

    private onMemberValueChanged(id: FilterId, index: number, value: string | number | boolean)
    {
        let filter: Filter = this.filters.get(id).filter;
        let members = getFilterMembers(filter);
        if (members)
        {
            members[index].value = value;
        }
        this.onFilterChanged(id);
    }

    private onMemberModeChanged(id: FilterId, index: number, mode: FilterMode)
    {
        let filter: Filter = this.filters.get(id).filter;
        let members = getFilterMembers(filter);
        if (members)
        {
            members[index].mode = mode;
        }
        this.onFilterChanged(id);
    }

    private onMemberTypeChanged(id: FilterId, index: number, type: MemberFilterType)
    {
        let filterData = this.filters.get(id);
        let filter = filterData.filter;
        let members = getFilterMembers(filter);
        if (members)
        {
            let member = members[index];
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
                const propertyElement = UI.getPropertyWithIndex(filterData.element, index);
                const memberModeEntry = propertyElement.querySelector(".filter-member-mode-val");
                let regeneratedModeEntry = UI.createModeAndValueWrapper(id, member, this.memberCallbacks);

                memberModeEntry.parentNode.insertBefore(regeneratedModeEntry, memberModeEntry);
                memberModeEntry.remove();
            }
        }

        this.onFilterChanged(id);
    }
}