import { ResizeObserver } from 'resize-observer';
import * as RECORDING from '../recording/RecordingData';
import * as TREE from '../ui/tree';
import * as DOMUtils from '../utils/DOMUtils';
import * as TypeSystem from "../types/typeRegistry";
import { Console, LogChannel, LogLevel } from './ConsoleController';
import { ResourcePreview } from './ResourcePreview';
import { Filtering } from '../filters/propertyFilters';

export interface IGoToEntityCallback {
    (entityId: number) : void;
}

export interface IOpenResourceCallback {
    (resourcePath: string) : void;
}

export interface IIsEntityInFrame
{
    (id: number) : boolean
}

export interface IPropertyHoverCallback {
    (propertyId: number, subIndex: number) : void;
}

export interface ICreateFilterFromPropCallback {
    (propertyId: number, subIndex: number) : void;
}

interface PropertyTreeControllerCallbacks {
    onPropertyHover: IPropertyHoverCallback;
    onPropertyStopHovering: IPropertyHoverCallback;
    onGoToEntity: IGoToEntityCallback;
    onOpenResource: IOpenResourceCallback;
    isEntityInFrame: IIsEntityInFrame;
}

namespace UI
{
    export function getPrimitiveTypeAsString(value: any, primitiveType: TypeSystem.EPrimitiveType): string {
        switch (primitiveType) {
            case TypeSystem.EPrimitiveType.Number:
                {
                    // TODO: Either check type here, or validate incomming data so this is always valid data
                    return (+value.toFixed(2)).toString();
                }
            case TypeSystem.EPrimitiveType.String:
                {
                    return value;
                }
            case TypeSystem.EPrimitiveType.Boolean:
                {
                    return value;
                }
        }
    }

    export function wrapPrimitiveType(content: string): HTMLElement
    {
        let wrapper = document.createElement("div");
        wrapper.className = "basico-tag basico-big property-primitive";
        wrapper.innerText = content;
        return wrapper;
    }

    export function wrapPropertyGroup(content: HTMLElement[]): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-group";
        for (let i=0; i<content.length; ++i) {
            wrapper.appendChild(content[i]);
        }
        return wrapper;
    }

    export function wrapPropertyName(content: string): HTMLElement
    {
        let wrapper = document.createElement("span");
        wrapper.className = "property-name";
        wrapper.innerText = content;
        return wrapper;
    }

    export function wrapPropertyIcon(icon: string, color: string = null): HTMLElement
    {
        let wrapper = document.createElement("i");
        wrapper.className = "prop-icon fas fa-" + icon;
        if (color)
            wrapper.style.color = color;
        return wrapper;
    }

    export function getLayoutOfPrimitiveType(value: any, primitiveType: TypeSystem.EPrimitiveType)
    {
        return wrapPrimitiveType(getPrimitiveTypeAsString(value, primitiveType));
    }

    export function createGoToEntityButton(id: number, callback: IGoToEntityCallback, isEnabled: boolean) : HTMLButtonElement
    {
        let resetButton: HTMLButtonElement = document.createElement("button");
        resetButton.className = "basico-button basico-small";

        let icon: HTMLElement = document.createElement("i");
        icon.className = "fa fa-arrow-circle-right";
        resetButton.append(icon);

        if (isEnabled) {
            resetButton.title = "Go to entity";
            resetButton.onclick = () => { callback(id); };
        }
        else {
            resetButton.title = "Entity unavailable";
            resetButton.disabled = true;
        }

        return resetButton;
    }

    export function createOpenResourceButton(resourcePath: string, callback: IOpenResourceCallback) : HTMLButtonElement
    {
        let resetButton: HTMLButtonElement = document.createElement("button");
        resetButton.className = "basico-button basico-small";

        let icon: HTMLElement = document.createElement("i");
        icon.className = "fa fa-folder-open";
        resetButton.append(icon);

        resetButton.title = "Open";
            resetButton.onclick = () => { callback(resourcePath); };

        return resetButton;
    }

    // Charts
    function setupCanvas(height: number) : { canvas: HTMLCanvasElement; canvasWrapper: HTMLElement; ctx: CanvasRenderingContext2D }
    {
        const canvasWrapper = document.createElement("div");
        canvasWrapper.classList.add("property-chart-wrapper");
        canvasWrapper.style.height = `${height}px`;
    
        const canvas = document.createElement("canvas");
        canvas.classList.add("property-chart");
        canvas.height = height;
        canvasWrapper.appendChild(canvas);
    
        const ctx = canvas.getContext("2d")!;
        return { canvas, canvasWrapper, ctx };
    }

    function drawAxes(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, padding: number)
    {
        ctx.strokeStyle = "#ddd";
    
        // Draw X axis
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
    
        // Draw Y axis
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(padding, padding);
        ctx.stroke();
    }

    function drawLabels(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[], xMax: number, yMax: number, padding: number)
    {
        ctx.font = "12px Arial";
        ctx.fillStyle = "#ddd";
    
        // X axis labels
        for (let i = 0; i < data.length; i++)
        {
            const x = padding + (i * (canvas.width - 2 * padding)) / (data.length - 1);
            ctx.fillText(
                Math.round((i / (data.length - 1)) * xMax) + "",
                x - 10,
                canvas.height - padding + 15
            );
        }
    
        // Y axis labels
        ctx.fillText("0", padding - 20, canvas.height - padding + 5);
        ctx.fillText(`${yMax}`, padding - 20, padding + 5);
    }

    function setupMouseHandlers(
        canvas: HTMLCanvasElement,
        data: RECORDING.ILineChartData[],
        drawChart: (hoveredIndex: number) => void,
        getHoveredIndex: (mouseX: number, mouseY: number) => number
    )
    {
        const tooltip = document.getElementById("sceneTooltip")!;
        let hoveredIndex = -1;
    
        function showTooltip(x: number, y: number, index: number)
        {
            DOMUtils.setClass(tooltip, "disabled", false);
            tooltip.style.left = `${x + 10}px`;
            tooltip.style.top = `${y - 25}px`;

            let html = "";
            for (let lineChartData of data)
            {
                const col = lineChartData.color ? lineChartData.color : "#8442B9";
                const color = '<div class="property-chart-legend" style="background-color: ' + col + '"></div>';
                const content = lineChartData.values[index];
                html += `<div>${color} ${lineChartData.ylabel}: ${content}</div>`;
            }
            tooltip.innerHTML = html;
        }
    
        function hideTooltip()
        {
            DOMUtils.setClass(tooltip, "disabled", true);
        }
    
        function checkMousePosition(event: MouseEvent)
        {
            const mouseX = event.offsetX;
            const mouseY = event.offsetY;

            const index = getHoveredIndex(mouseX, mouseY);
    
            if (index !== hoveredIndex)
            {
                hoveredIndex = index;
                drawChart(hoveredIndex); // Redraw the chart with hover effect
            }
    
            if (index === -1)
            {
                hideTooltip();
            }
            else
            {
                showTooltip(event.clientX, event.clientY, hoveredIndex);
            }
        }
    
        canvas.onmousemove = checkMousePosition;
        canvas.onmouseleave = hideTooltip;
    }

    export function createBarChart(chart: RECORDING.IPropertyLineChart, height: number): HTMLElement
    {
        const isCompact = height < 100;
        const { yscale: yMax, xscale: xMax, data } = chart;
        const chartPadding = isCompact ? 0 : 25;
        const barPadding = 4;
        const firstData = data[0]; // TODO: Remove
    
        const { canvas, canvasWrapper, ctx } = setupCanvas(height);

        function getBarMetrics(valueIdx: number, dataIdx: number, lineChartData: RECORDING.ILineChartData)
        {
            const barWidth = ((canvas.width - 2 * chartPadding) / lineChartData.values.length) / data.length;
            const x = chartPadding + (data.length * valueIdx + dataIdx) * barWidth;
            const y = canvas.height - chartPadding - (lineChartData.values[valueIdx] / yMax) * (canvas.height - 2 * chartPadding);
            const barHeight = (lineChartData.values[valueIdx] / yMax) * (canvas.height - 2 * chartPadding);

            return { x, y, barWidth, barHeight };
        } 
    
        function drawBarChart(hoveredIndex: number)
        {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!isCompact)
            {
                drawAxes(ctx, canvas, chartPadding);
                drawLabels(ctx, canvas, firstData.values, xMax, yMax, chartPadding);
            }

            for (let dataIdx = 0; dataIdx < data.length; dataIdx++)
            {
                const lineChartData = data[dataIdx]
                const color = lineChartData.color ? lineChartData.color : "#8442B9";

                for (let valueIdx = 0; valueIdx < lineChartData.values.length; valueIdx++)
                {
                    const metrics = getBarMetrics(valueIdx, dataIdx, lineChartData);
        
                    ctx.fillStyle = (valueIdx === hoveredIndex) ? "#6DE080" : color;
                    ctx.fillRect(metrics.x, metrics.y, metrics.barWidth - barPadding, metrics.barHeight);
                }
            }
        }

        function getHoveredIndex(mouseX: number, mouseY: number)
        {
            return firstData.values.findIndex((value, index) => {
                const metrics = getBarMetrics(index, 0, firstData);

                return  mouseX >= metrics.x &&
                        mouseX <= metrics.x + metrics.barWidth;
            });
        }
    
        setupMouseHandlers(canvas, data, drawBarChart, getHoveredIndex);
        drawBarChart(-1);
    
        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = height;
            drawBarChart(-1);
        });
        resizeObserver.observe(canvasWrapper);
    
        return canvasWrapper;
    }

    export function createLineChart(chart: RECORDING.IPropertyLineChart, height: number): HTMLElement
    {
        const isCompact = height < 100;
        const { yscale: yMax, xscale: xMax, data } = chart;
        const chartPadding = isCompact ? 0 : 25;
        const firstData = data[0]; // TODO: Remove
    
        const { canvas, canvasWrapper, ctx } = setupCanvas(height);

        function getLineMetrics(i: number, data: RECORDING.ILineChartData)
        {
            const width = (canvas.width - 2 * chartPadding) / data.values.length;
            const x = chartPadding + i * width;
            const y = canvas.height - chartPadding - (data.values[i] / yMax) * (canvas.height - 2 * chartPadding);

            return { x, y, width };
        } 

        function drawLineChart(hoveredIndex: number)
        {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!isCompact)
            {
                drawAxes(ctx, canvas, chartPadding);
                drawLabels(ctx, canvas, firstData.values, xMax, yMax, chartPadding);
            }

            ctx.lineWidth = 2;

            for (let lineChartData of data)
            {
                ctx.beginPath();
                ctx.moveTo(chartPadding, canvas.height - chartPadding - (lineChartData.values[0] / yMax) * (canvas.height - 2 * chartPadding));
        
                for (let i = 1; i < lineChartData.values.length; i++)
                {
                    const metrics = getLineMetrics(i, lineChartData);
                    ctx.lineTo(metrics.x, metrics.y);
                }
        
                ctx.strokeStyle = lineChartData.color ? lineChartData.color : "#8442B9";
                ctx.stroke();
    
                if (hoveredIndex != -1)
                {
                    const metrics = getLineMetrics(hoveredIndex, lineChartData);
    
                    ctx.strokeStyle = '#6DE080';
                    ctx.beginPath();
                    ctx.arc(metrics.x, metrics.y, 5, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            }

            ctx.lineWidth = 1;
        }

        function getHoveredIndex(mouseX: number, mouseY: number)
        {
            return firstData.values.findIndex((value, index) => {
                const metrics = getLineMetrics(index, firstData);

                return  mouseX >= metrics.x &&
                        mouseX <= metrics.x + metrics.width;
            });
        }
    
        setupMouseHandlers(canvas, data, drawLineChart, getHoveredIndex);
        drawLineChart(-1);
    
        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.parentElement!.offsetWidth;
            canvas.height = height;
            drawLineChart(-1);
        });
        resizeObserver.observe(canvasWrapper);
    
        return canvasWrapper;
    }
}

export class PropertyTreeController {
    propertyTree: TREE.TreeControl;
    typeRegistry: TypeSystem.TypeRegistry;

    callbacks: PropertyTreeControllerCallbacks;

    constructor(propertyTree: TREE.TreeControl, callbacks: PropertyTreeControllerCallbacks) {
        this.propertyTree = propertyTree;
        this.typeRegistry = TypeSystem.TypeRegistry.getInstance();
        this.callbacks = callbacks;
    }

    addValueToPropertyTree(parent: HTMLElement, name: string, content: HTMLElement[], propertyId: number, icon: string, iconColor: string = null)
    {
        const elements = [];
        if (icon)
            elements.push(UI.wrapPropertyIcon(icon, iconColor));
        elements.push(UI.wrapPropertyName(name));
        elements.push(UI.wrapPropertyGroup(content));

        const listItem = this.propertyTree.addItem(parent, elements, {
            value:  propertyId == null ? null : propertyId.toString(),
            selectable: false,
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        });
    }

    addTabletoPropertyTree(parent: HTMLElement, name: string, table: HTMLElement, propertyId: number)
    {
        const elements = [table];
        const listItem = this.propertyTree.addItem(parent, elements, {
            value:  propertyId == null ? null : propertyId.toString(),
            selectable: false,
            noHover: true,
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        });
    }

    addCustomTypeToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, type: TypeSystem.IType, icon: string) {
        // Complex value type
        let content = [];
        for (const [layoutId, primitiveType] of Object.entries(type.layout)) {
            const customTypeValue = property.value as RECORDING.IPropertyCustomType;
            const value = customTypeValue[layoutId];
            if (value != undefined) {
                content.push(UI.getLayoutOfPrimitiveType(value, primitiveType));
            }
        }

        this.addValueToPropertyTree(parent, property.name, content, property.id, icon);
    }

    addEntityRef(parent: HTMLElement, name: string, value: RECORDING.IEntityRef, icon: string, propertyId: number)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.name, TypeSystem.EPrimitiveType.String),
            //UI.getLayoutOfPrimitiveType(value.id, TypeSystem.EPrimitiveType.Number), // Don't display id for now, too noisy
            UI.createGoToEntityButton(value.id, this.callbacks.onGoToEntity, this.callbacks.isEntityInFrame(value.id))
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addLineChart(parent: HTMLElement, name: string, value: RECORDING.IPropertyLineChart, icon: string, propertyId: number)
    {
        const height = value.height ? value.height : 200;
        let content = [];
        if (value.chart && value.chart == "bar")
            content = [UI.createBarChart(value, height)]
        else
            content = [UI.createLineChart(value, height)];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addTable(parent: HTMLElement, name: string, value: RECORDING.IPropertyTable, propertyId: number, filter: string)
    {
        let gridContainerWrapper = document.createElement("div");
        gridContainerWrapper.className = "property-table-wrapper";

        let gridTitle = document.createElement("div");
        gridTitle.className = "property-table-title";
        gridTitle.innerText = name;

        let gridContainer = document.createElement("div");
        gridContainer.className = "property-table";

        gridContainer.style.gridTemplateColumns = "auto ".repeat(value.header.length);

        for (let item of value.header)
        {
            let content = UI.getLayoutOfPrimitiveType(item, TypeSystem.EPrimitiveType.String);
            content.classList.add("property-table-row", "property-table-header");
            gridContainer.append(content);
        }

        const hasFilter = filter != "";
        for (let i=0; i<value.rows.length; ++i)
        {
            const row = value.rows[i];

            if (!hasFilter || Filtering.filterTableRow(filter, row))
            {
                let rowGroup = document.createElement("div");
                rowGroup.classList.add("property-table-row-group");
                rowGroup.setAttribute('data-tree-subvalue', i+"");
                gridContainer.append(rowGroup);

                for (let item of row)
                {
                    let content = UI.getLayoutOfPrimitiveType(item, TypeSystem.EPrimitiveType.String);
                    content.classList.add("property-table-row");
                    rowGroup.append(content);
                }
            }
        }

        gridContainerWrapper.append(gridTitle, gridContainer);

        this.addTabletoPropertyTree(parent, name, gridContainerWrapper, propertyId);
    }

    addVec3(parent: HTMLElement, name: string, value: RECORDING.IVec3, icon: string, propertyId: number)
    {
        const content = [
            UI.getLayoutOfPrimitiveType(value.x, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.y, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.z, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addColor(parent: HTMLElement, name: string, value: RECORDING.IColor, icon: string, propertyId: number)
    {
        const content =[ 
            UI.getLayoutOfPrimitiveType(value.r, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.g, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.b, TypeSystem.EPrimitiveType.Number),
            UI.getLayoutOfPrimitiveType(value.a, TypeSystem.EPrimitiveType.Number)
        ];

        this.addValueToPropertyTree(parent, name, content, propertyId, icon);
    }

    addNumber(parent: HTMLElement, name: string, value: number, icon: string, propertyId: number)
    {
        const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.Number)
        this.addValueToPropertyTree(parent, name, [content], propertyId, icon);
    }

    addOptionalResource(parent: HTMLElement, name: string, value: string, icon: string, propertyId: number, callback: IOpenResourceCallback)
    {
        if (value && value != "")
        {
            const content = UI.getLayoutOfPrimitiveType(value, TypeSystem.EPrimitiveType.String)
            const button = UI.createOpenResourceButton(value, callback);
            this.addValueToPropertyTree(parent, name, [content, button], propertyId, icon);
            content.onmouseenter = (ev) => {
                ResourcePreview.Instance().showAtPosition(ev.pageX, ev.pageY, value);
            };
            content.onmousemove = (ev) => {
                ResourcePreview.Instance().setPosition(ev.pageX, ev.pageY);
            };
            content.onmouseout = () => {
                ResourcePreview.Instance().hide();
            }
        }
    }

    addToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty, filter: string, parentMatchedName: boolean = false)
    {
        const treeItemOptions : TREE.ITreeItemOptions = {
            text: property.name,
            value:  property.id.toString(),
            selectable: false,
            collapsed: property.flags != undefined && ((property.flags & RECORDING.EPropertyFlags.Collapsed) != 0) && filter == "",
            callbacks: {
                onItemSelected: null,
                onItemDoubleClicked: null,
                onItemMouseOver: this.onPropertyMouseEnter.bind(this),
                onItemMouseOut: this.onPropertyMouseLeave.bind(this),
            }
        };

        
        const isHidden = property.flags != undefined && ((property.flags & RECORDING.EPropertyFlags.Hidden) != 0);
        if (isHidden) return;
        
        if (!parentMatchedName && !Filtering.filterProperty(filter, property))
            return;
        
        const iconContent = property.icon ? [UI.wrapPropertyIcon(property.icon, property.icolor)] : [];

        if (property.type == TypeSystem.CorePropertyTypes.Group) {
            
            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
            const propertyGroup = property as RECORDING.IPropertyGroup;

            for (let i = 0; i < propertyGroup.value.length; ++i)
            {
                this.addToPropertyTree(addedItem, propertyGroup.value[i], filter, parentMatchedName || Filtering.filterPropertyName(filter, property));
            }
        }
        // Find type
        else
        {
            const type = this.typeRegistry.findType(property.type);
            if (type)
            {
                this.addCustomTypeToPropertyTree(parent, property, type, property.icon);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.Comment)
            {
                let comment = document.createElement("div");
                comment.classList.add("property-comment");
                if (iconContent[0])
                {
                    comment.append(iconContent[0]);
                    if (property.icolor)
                    {
                        comment.style.border = "1px solid " + property.icolor;
                        // Add DOM element with background
                        const background = document.createElement("div");
                        background.classList.add("property-comment-overlay");
                        background.style.backgroundColor = property.icolor;
                        comment.prepend(background);
                    }
                }
                comment.insertAdjacentText("beforeend", property.value as string);

                this.propertyTree.addItem(parent, [comment], {
                    value:  property.id.toString(),
                    selectable: false,
                });
            }
            else if (property.type == TypeSystem.CorePropertyTypes.Resource)
            {
                this.addOptionalResource(parent, property.name, property.value as string, property.icon, property.id, this.callbacks.onOpenResource);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.EntityRef)
            {
                this.addEntityRef(parent, property.name, property.value as RECORDING.IEntityRef, property.icon, property.id);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.LineChart)
            {
                this.addLineChart(parent, property.name, property.value as RECORDING.IPropertyLineChart, property.icon, property.id);
            }
            else if (property.type == TypeSystem.CorePropertyTypes.Table)
            {
                this.addTable(parent, property.name, property.value as RECORDING.IPropertyTable, property.id, filter);
            }
            else if (RECORDING.isPropertyShape(property))
            {
                if (property.name.length > 0)
                {
                    switch(property.type)
                    {
                        case TypeSystem.CorePropertyTypes.Sphere:
                        {
                            const sphere = property as RECORDING.IPropertySphere;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", sphere.position, "map-marker", property.id);
                            this.addNumber(addedItem, "Radius", sphere.radius, "arrows-alt-h", property.id);
                            this.addOptionalResource(addedItem, "Texture", sphere.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Capsule:
                        {
                            const capsule = property as RECORDING.IPropertyCapsule;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", capsule.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Direction", capsule.direction, "location-arrow", property.id);
                            this.addNumber(addedItem, "Radius", capsule.radius, "arrows-alt-h", property.id);
                            this.addNumber(addedItem, "Height", capsule.height, "arrows-alt-v", property.id);
                            this.addOptionalResource(addedItem, "Texture", capsule.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.AABB:
                        {
                            const aabb = property as RECORDING.IPropertyAABB;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", aabb.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Size", aabb.size, "arrows-alt", property.id);
                            this.addOptionalResource(addedItem, "Texture", aabb.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.OOBB:
                        {
                            const oobb = property as RECORDING.IPropertyOOBB;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", oobb.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Size", oobb.size, "arrows-alt", property.id);
                            this.addVec3(addedItem, "Forward", oobb.forward, "arrow-right", property.id);
                            this.addVec3(addedItem, "Up", oobb.up, "arrow-up", property.id);
                            this.addOptionalResource(addedItem, "Texture", oobb.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Plane:
                        {
                            const plane = property as RECORDING.IPropertyPlane;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Position", plane.position, "map-marker", property.id);
                            this.addVec3(addedItem, "Normal", plane.normal, "level-up-alt", property.id);
                            this.addVec3(addedItem, "Up", plane.up, "arrow-up", property.id);
                            this.addNumber(addedItem, "Width", plane.width, "arrows-alt-h", property.id);
                            this.addNumber(addedItem, "Length", plane.length, "arrows-alt-v", property.id);
                            this.addOptionalResource(addedItem, "Texture", plane.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Line:
                        {
                            const line = property as RECORDING.IPropertyLine;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Origin", line.origin, "map-marker-alt", property.id);
                            this.addVec3(addedItem, "Destination", line.destination, "flag-checkered", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Arrow:
                        {
                            const arrow = property as RECORDING.IPropertyArrow;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Origin", arrow.origin, "map-marker-alt", property.id);
                            this.addVec3(addedItem, "Destination", arrow.destination, "flag-checkered", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Vector:
                        {
                            const vector = property as RECORDING.IPropertyVector;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "Vector", vector.vector, "location-arrow", property.id);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Mesh:
                        {
                            const mesh = property as RECORDING.IPropertyMesh;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            // Ignore vertices/indices
                            this.addOptionalResource(addedItem, "Texture", mesh.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Path:
                        {
                            const path = property as RECORDING.IPropertyPath;
                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            let idx = 0;
                            for (const point of path.points)
                            {
                                this.addVec3(addedItem, `Point ${idx}`, point, "map-marker", property.id);
                                ++idx;
                            }
                            break;
                        }
                        case TypeSystem.CorePropertyTypes.Triangle:
                        {
                            const triangle = property as RECORDING.IPropertyTriangle;

                            let addedItem = this.propertyTree.addItem(parent, iconContent, treeItemOptions);
                            this.addVec3(addedItem, "p1", triangle.p1, "map-marker", property.id);
                            this.addVec3(addedItem, "p2", triangle.p2, "map-marker", property.id);
                            this.addVec3(addedItem, "p3", triangle.p3, "map-marker", property.id);
                            this.addOptionalResource(addedItem, "Texture", triangle.texture, "image", property.id, this.callbacks.onOpenResource);
                            break;
                        }
                    }
                }
            }
            else
            {
                const primitiveType = TypeSystem.buildPrimitiveType(property.type);
                const value = primitiveType ? UI.getPrimitiveTypeAsString(property.value, primitiveType) : property.value as string;
                const content = UI.wrapPrimitiveType(value);
                this.addValueToPropertyTree(parent, property.name, [content], property.id, property.icon, property.icolor);

                if (primitiveType == undefined)
                {
                    Console.log(LogLevel.Error, LogChannel.Default, `Unknown property type: ${property.type} in property ${property.name}`);
                }
            }
        }

        this.highlightSearch(property, filter);
    }

    highlightSearch(property: RECORDING.IProperty, filter: string)
    {
        if (filter != "" && Filtering.filterProperty(filter, property, false))
        {
            const item = this.propertyTree.getItemWithValue(property.id+"") as HTMLElement;
            const wrapper = item.querySelector(".basico-tree-item-wrapper") as HTMLElement;
            const itemToQuery = RECORDING.isPropertyShape(property) ? item : wrapper;
            const candidates = itemToQuery.querySelectorAll(".property-table-row, .property-table-title, .property-name, .property-primitive, .basico-tree-item-content");

            for (let candidate of candidates)
            {
                const prop = candidate as HTMLElement;

                for (const child of prop.childNodes)
                {
                    if (child.nodeType === Node.TEXT_NODE)
                    {
                        if (Filtering.filterText(filter, child.nodeValue))
                        {
                            const regex = new RegExp(`(${filter})`, 'gi');
                            const tokens = child.nodeValue.split(regex); // Split case insensitive

                            for (let i=0; i<tokens.length; ++i)
                            {
                                const token = tokens[i];

                                if (regex.test(token))
                                {
                                    const newSpan = document.createElement("span");
                                    newSpan.innerText = token;
                                    newSpan.style.backgroundColor = "#bb86fc99";
                                    prop.insertBefore(newSpan, child);
                                }
                                else
                                {
                                    const newText = document.createTextNode(token);
                                    prop.insertBefore(newText, child);
                                }
                            }

                            prop.removeChild(child);
                        }
                        break;
                    }
                }
                
            }
        }
    }

    onPropertyMouseEnter(item: HTMLElement) {
        const propertyId = this.propertyTree.getValueOfItem(item);
        if (propertyId != null)
        {
            const propertyElement = this.propertyTree.getItemWithValue(propertyId);
            let subIndex = -1;

            if (item != propertyElement)
            {
                let current = item;
                while (current.parentElement?.parentElement != propertyElement && current.parentElement != null)
                {
                    current = current.parentElement;
                }

                if (current.parentElement?.parentElement == propertyElement)
                {
                    for (let i=0; i<current.parentElement.children.length; ++i)
                    {
                        if (current.parentElement.children[i] == current)
                        {
                            subIndex = i;
                            break;
                        }
                    }
                }
            }

            this.callbacks.onPropertyHover(Number.parseInt(propertyId), subIndex);
        }
    }

    onPropertyMouseLeave(item: HTMLElement) {
        const propertyId = this.propertyTree.getValueOfItem(item);
        if (propertyId != null)
        {
            this.callbacks.onPropertyStopHovering(Number.parseInt(propertyId), -1);
        }
    }

    
}
