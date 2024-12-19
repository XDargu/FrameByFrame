export function addUniqueClass(element: HTMLElement, classToAdd: string)
{
    if (!element.classList.contains(classToAdd))
    {
        element.classList.add(classToAdd);
    }
}

export function swapClass(element: HTMLElement, classToRemove: string, classToAdd: string)
{
    element.classList.remove(classToRemove);
    element.classList.add(classToAdd);
}

export function toggleClasses(element: HTMLElement, class1: string, class2: string)
{
    if (element.classList.contains(class1))
    {
        swapClass(element, class1, class2)
    }
    else
    {
        swapClass(element, class2, class1);
    }
}

export function setClass(element: HTMLElement, className: string, isActive: boolean)
{
    if (isActive) {
        addUniqueClass(element, className);
    }
    else {
        element.classList.remove(className);
    }
}

export function clampElementToScreen(pageX: number, pageY: number, element: HTMLElement, offsetX: number = 0, offsetY: number = 0)
{
    const isNearRight = (window.innerWidth - pageX) < element.offsetWidth + offsetX;
    const isNearBottom = (window.innerHeight - pageY) < element.offsetHeight + offsetY;

    const x = isNearRight ? pageX - element.offsetWidth - offsetX : pageX + offsetX;
    const y = isNearBottom ? pageY - element.offsetHeight - offsetY : pageY + offsetY;

    return {x: x, y: y};
}

export function isHidden(el: HTMLElement)
{
    return (el.offsetParent === null);
}
    
export function findFirstVisibleParent(el: HTMLElement)
{
    while (el != null)
    {
        if (!isHidden(el))
            return el;

        el = el.parentElement;
    }

    return null;
}

export function FindFirstVisibleTree(el: HTMLElement)
{
    while (el != null)
    {
        if (!isHidden(el))
            return el;

        if (el.classList.contains("basico-tree"))
        {
            const title = el.previousElementSibling as HTMLElement;
            if (title && title.classList.contains("basico-title") && !isHidden(title))
            {
                return title;
            }
        }

        el = el.parentElement;
    }

    return null;
}