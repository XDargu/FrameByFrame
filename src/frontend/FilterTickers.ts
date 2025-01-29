import * as Utils from '../utils/utils'
import * as DOMUtils from '../utils/DOMUtils';
import { Filter, FilterMode, filterTypeAsString } from "../filters/filters";
import { FilterId } from './FiltersList';

export interface ITickerClickedCallback
{
    (id: FilterId) : void
}

export interface ITickerVisibilityChangedCallback
{
    (id: FilterId, visible: boolean) : void
}

interface FilterTickerData
{
    element: HTMLElement;
    name: string;
    filter: Filter;
}

namespace UI
{
    export interface ITickerCreationData
    {
        id: FilterId;
        tickerData: FilterTickerData;
        onTickerVisibilityChanged: ITickerVisibilityChangedCallback;
        onTickerclicked: ITickerClickedCallback;
    }

    export function setTickerName(ticker: HTMLElement, name: string)
    {
        let nameElement = ticker.querySelector('.filter-ticker-name');
        nameElement.textContent = name;
    }

    export function createTicker(creationData: ITickerCreationData) : HTMLElement
    {
        let ticker = document.createElement('div');
        ticker.className = 'filter-ticker';
        ticker.title = 'Go to filter definition';
        ticker.onclick = () => {
            creationData.onTickerclicked(creationData.id);
        };
        const color = Utils.colorFromHash(creationData.id);
        ticker.style.borderLeft = `5px solid ${color}`;

        let tickerData = document.createElement('div');
        tickerData.className = 'filter-ticker-data';

        let tickerName = document.createElement('div');
        tickerName.className = 'filter-ticker-name';
        tickerName.textContent = creationData.tickerData.name;

        let tickerType = document.createElement('div');
        tickerType.className = 'filter-ticker-type';
        tickerType.textContent = filterTypeAsString(creationData.tickerData.filter.type);

        let tickerButtons = document.createElement('div');
        tickerButtons.className = 'basico-button-group filter-ticker-buttons';

        let tickerViewButton = document.createElement('button');
        tickerViewButton.className = 'basico-button basico-small';
        tickerViewButton.title = 'Toggle filter visibility';

        let visibilityIcon = document.createElement('i');
        visibilityIcon.className = 'fas fa-eye';

        tickerViewButton.onclick = () => {
            DOMUtils.toggleClasses(visibilityIcon, 'fa-eye', 'fa-eye-slash');
            creationData.onTickerVisibilityChanged(creationData.id, visibilityIcon.classList.contains('fa-eye'));
        };

        tickerData.append(tickerName, tickerType);
        tickerViewButton.append(visibilityIcon);
        tickerButtons.append(tickerViewButton);
        ticker.append(tickerData, tickerButtons);

        return ticker;
    }
}

export default class FilterTickers
{
    private tickers: Map<FilterId, FilterTickerData>;
    private tickerList: HTMLElement;
    private onTickerVisibilityChanged: ITickerVisibilityChangedCallback;
    private onTickerclicked: ITickerClickedCallback;

    constructor(tickerList: HTMLElement, onTickerVisibilityChanged: ITickerVisibilityChangedCallback, onTickerclicked: ITickerClickedCallback)
    {
        this.tickers = new Map<FilterId, FilterTickerData>();
        this.tickerList = tickerList;
        this.onTickerVisibilityChanged = onTickerVisibilityChanged;
        this.onTickerclicked = onTickerclicked;
    }

    addTicker(id: FilterId, name: string, filter: Filter)
    {
        let tickerData: FilterTickerData = {
            element: null,
            name: name,
            filter: filter
        };
        const ticker = UI.createTicker({
            id: id,
            tickerData: tickerData,
            onTickerVisibilityChanged: this.onTickerVisibilityChanged,
            onTickerclicked: this.onTickerclicked
        });

        tickerData.element = ticker;
        this.tickerList.append(ticker);

        this.tickers.set(id, tickerData);
    }

    removeTicker(id: FilterId)
    {
        let tickerData = this.tickers.get(id);
        if (tickerData)
        {
            tickerData.element.remove();
            this.tickers.delete(id);
        }
    }

    setTickerName(id: FilterId, name: string)
    {
        let tickerData = this.tickers.get(id);
        if (tickerData)
        {
            tickerData.name = name;
            UI.setTickerName(tickerData.element, name);
        }
    }

    setTickerActive(id: FilterId)
    {
        let tickerData = this.tickers.get(id);
        if (tickerData)
        {
            DOMUtils.addUniqueClass(tickerData.element, 'active');
        }
    }

    setAllTickersInactive()
    {
        for (let [id, tickerData]  of this.tickers)
        {
            tickerData.element.classList.remove('active');
        }
    }
}