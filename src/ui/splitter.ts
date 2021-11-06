import { ResizeObserver } from 'resize-observer';

export interface SplitterSettings
{
    splitter: HTMLElement;
    panes: HTMLElement[];
    direction: string;
    minSizePane: number;
    minPane: HTMLElement;
    minSize: number;
}

export class Splitter
{
    constructor(settings: SplitterSettings)
    {
        this.dragElement(settings);
    }

    dragElement(settings: SplitterSettings)
    {
        var md: any; // remember mouse down info

        settings.splitter.onmousedown = onMouseDown;

        function getActivePane()
        {
            for (let i=0; i<settings.panes.length; ++i)
            {
                if (settings.panes[i].style.display != "none")
                    return settings.panes[i];
            }
        }

        function onMouseDown(e: MouseEvent)
        {
            md = {e,
                offsetLeft:  settings.splitter.offsetLeft,
                offsetTop:   settings.splitter.offsetTop,
                firstWidth:  getActivePane().offsetWidth,
                firstHeight: getActivePane().offsetHeight,
                minPaneWidth: settings.minPane.offsetWidth,
                minPaneHeight: settings.minPane.offsetHeight
                };

            settings.splitter.classList.add("selected");

            document.onmousemove = onMouseMove;
            document.onmouseup = () => {
                settings.splitter.classList.remove("selected");
                document.onmousemove = document.onmouseup = null;
            }
        }

        function onMouseMove(e: MouseEvent)
        {
            function ApplySize(minPaneSize: number, firstSize: number)
            {
                const paneSize = getPaneSize(e);
                const initialTotalSize = minPaneSize + firstSize;
                const maxSize = initialTotalSize - settings.minSizePane;
                const size = Math.min(Math.max(settings.minSize, paneSize), maxSize);
                applySizeToPane(size);
            }

            if (isVertical())
            {
                ApplySize(md.minPaneHeight, md.firstHeight);
            }
            else
            {
                ApplySize(md.minPaneWidth, md.firstWidth);
            }
        }

        function getPaneSize(e: MouseEvent) : number
        {
            var delta = {
                x: e.clientX - md.e.clientX,
                y: e.clientY - md.e.clientY
            };

            if (settings.direction === "L" ) // Left
                return md.firstWidth + delta.x;
            else if (settings.direction === "R" ) // Right
                return md.firstWidth - delta.x;
            else if (settings.direction === "U" ) // Up
                return md.firstHeight + delta.y;
            else if (settings.direction === "D" ) // Down
                return md.firstHeight - delta.y;
        }

        function applySizeToPane(size: number)
        {
            for (let i=0; i<settings.panes.length; ++i)
            {
                settings.panes[i].style.flex = "0 0 " + (size) + "px";

                if (isVertical())
                    settings.panes[i].style.maxHeight = size + "px";
                else
                    settings.panes[i].style.maxWidth = size + "px";
            }
        }

        function isVertical() : boolean
        {
            return (settings.direction === "U" || settings.direction == "D");
        }

        function onResize()
        {
            if (settings.splitter.offsetParent === null) // Visibility check
            {
                return;
            }

            function ApplyCorrection(paneSize: number, minPaneSize: number)
            {
                const totalSize = paneSize + minPaneSize;
                const maxAvailableSize = totalSize - settings.minSizePane;

                if (paneSize > maxAvailableSize)
                {
                    applySizeToPane(Math.max(settings.minSize, maxAvailableSize));
                }
            }

            const activePane = getActivePane();
            if (activePane)
            {
                if (isVertical())
                {
                    const paneHeight = activePane.offsetHeight;
                    const minPaneHeight = settings.minPane.offsetHeight;
                    ApplyCorrection(paneHeight, minPaneHeight);
                }
                else
                {
                    const paneWith = activePane.offsetWidth;
                    const minPaneWidth = settings.minPane.offsetWidth;
                    ApplyCorrection(paneWith, minPaneWidth);
                }
            }
        }

        var resizeObserver = new ResizeObserver(entries => { onResize(); });
        resizeObserver.observe(settings.minPane);
    }
}