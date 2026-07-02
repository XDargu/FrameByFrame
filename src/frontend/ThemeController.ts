export type Theme = "light" | "dark";

const ThemeStorageKey = "frame-by-frame-theme";

function isTheme(value: string): value is Theme {
    return value === "light" || value === "dark";
}

function getSavedTheme(): Theme {
    try {
        const savedTheme = localStorage.getItem(ThemeStorageKey);
        if (isTheme(savedTheme)) {
            return savedTheme;
        }
    } catch {
        // Storage can be unavailable in restricted renderer contexts.
    }

    return "dark";
}

function updateThemeControl(theme: Theme): void {
    const themeToggle = document.getElementById("theme-toggle") as HTMLButtonElement;
    if (!themeToggle) {
        return;
    }

    const nextTheme = theme === "dark" ? "light" : "dark";
    const icon = themeToggle.querySelector("i");
    const label = themeToggle.querySelector(".theme-toggle-label");

    themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    themeToggle.setAttribute("title", `Switch to ${nextTheme} theme`);
    themeToggle.setAttribute("aria-pressed", (theme === "light").toString());

    if (icon) {
        icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }

    if (label) {
        label.textContent = theme === "dark" ? "Light" : "Dark";
    }
}

export function applyTheme(theme: Theme, persist: boolean = true): void {
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeControl(theme);

    if (persist) {
        try {
            localStorage.setItem(ThemeStorageKey, theme);
        } catch {
            // The visual theme still works when persistence is unavailable.
        }
    }

    window.dispatchEvent(new CustomEvent("framebyframe-themechange", {
        detail: { theme }
    }));
}

export function initializeTheme(): void {
    const initialTheme = isTheme(document.documentElement.getAttribute("data-theme"))
        ? document.documentElement.getAttribute("data-theme") as Theme
        : getSavedTheme();

    applyTheme(initialTheme, false);

    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            applyTheme(currentTheme === "dark" ? "light" : "dark");
        });
    }

    window.addEventListener("storage", (event: StorageEvent) => {
        if (event.key === ThemeStorageKey && isTheme(event.newValue)) {
            applyTheme(event.newValue, false);
        }
    });
}
