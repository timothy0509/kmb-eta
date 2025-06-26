# TimoETA

A lightweight, responsive single‐page application (SPA) for fetching and displaying real‐time Estimated Time of Arrival (ETA) data for Kowloon Motor Bus (KMB) stops in Hong Kong.  
Built with plain HTML, CSS (CSS Custom Properties, flexbox, and CSS Grid), and vanilla JavaScript—no frontend framework required.

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Getting Started](#getting-started)  
4. [Usage](#usage)  
5. [Project Structure](#project-structure)  
6. [Component Breakdown](#component-breakdown)  
7. [Customization](#customization)  
8. [Contributing](#contributing)  
9. [License](#license)  
10. [Acknowledgments](#acknowledgments)  

---

## 1. Project Overview

TimoETA provides a user-friendly interface to:

- **Search** KMB bus stops by partial name.  
- **Filter** results by optional, comma-separated route numbers.  
- **Display** up to three forthcoming ETAs per matching route, with “live” times highlighted.  
- **Show Remarks** for specific ETAs or general remarks when no live ETAs are available.  
- **Auto-refresh** ETA data every 30 seconds, dynamically updating only changed values.  
- **Support multiple languages**: English, Traditional Chinese (繁體), and Simplified Chinese (简体).  
- **Offer light and dark themes**, with preference persisted in `localStorage`.  
- **Adapt seamlessly** between desktop (table view) and mobile (card view) layouts.  

---

## 2. Features

- Single-Page Application (SPA) – dynamic updates with no full-page reloads.  
- Responsive Design – table view on desktop; card view on mobile.  
- Light/Dark Theming – toggle with persisted preference.  
- Internationalization – English, 繁體, 简体.  
- Intelligent Route Sorting – “14” before “14X”, “A1” before “A2”, etc.  
- Live Data Updates – 30s auto-refresh with change animation.  
- Smart ETA Filtering – prioritizes service types 1→2→3 for most relevant ETAs.  
- Contextual Remarks – “ETA#: …” for live ETAs, general remarks when none are live.  
- Client-Side Caching – full stop list cached on first load.  
- Search Persistence – last search saved/restored from `localStorage`.  
- **Mobile Card Drill-Down** – *double-click any mobile card to view hidden details (stop code, platform number, and full remarks).*  

### Bug Fixes

- **Desktop auto-refresh** now preserves empty remarks when live ETAs exist (no longer falls back to “No ETAs available”).  

---

## 3. Getting Started

### Prerequisites

You need a modern web browser and a simple static file server to run the application locally (to avoid CORS issues with the KMB API).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/<YOUR_USERNAME>/timoeta.git
    cd timoeta
    ```

### Running Locally

Choose one of the following methods to start a local web server:

#### Option A: Using Python 3

```bash
python3 -m http.server 8000
```
Then, open your web browser and navigate to `http://localhost:8000/index.html`.

#### Option B: Using Node.js `serve` (or any other static server)

If you have Node.js installed, you can use the `serve` package:

```bash
npm install -g serve # Install serve globally if you haven't already
serve .             # Start the server in the current directory
```
The console will display the URL, e.g., `http://localhost:5000/index.html`.

---

## 4. Usage

### Main Search Page (`index.html`)

This is the primary interface for dynamic bus ETA lookups.

1.  Open `index.html` in your browser.
2.  **Language Selection**: Use the "Language" dropdown in the top-right to choose English, Traditional Chinese (繁體), or Simplified Chinese (简体).
3.  **Theme Toggle**: Click the "Dark Mode" switch to toggle between light and dark themes. Your choice will be remembered.
4.  **Enter Stop Name**: Type a partial name of a bus stop (e.g., "Kai Yip Estate") into the "Stop Name" field.
5.  **Enter Route Numbers (Optional)**: If you want to filter results to specific routes, enter them separated by commas (e.g., `14, 62P, 62X, 259D, X42C`).
6.  **Search**: Click the "Search ETAs" button.
7.  The results will be displayed below the form, either as a table (desktop) or a series of cards (mobile). The page will automatically refresh the ETA data every 30 seconds. Your search parameters and chosen language will be remembered if you close and reopen the tab.

### Predefined Stops Page (`singyin.html`)

This page is designed for displaying ETAs for a fixed set of bus stops without requiring user input for searching. It's a demonstration of how the core logic can be reused for specific scenarios.

1.  Open `singyin.html` in your browser.
2.  You will immediately see ETA information for "Pak Hung House – East Bound" and "Pak Hung House – West Bound" stops.
3.  **Language and Theme**: The language and theme toggles in the header function identically to the main `index.html` page.
4.  The ETAs will automatically refresh every 30 seconds.

---

## 5. Project Structure

```
timoeta/
├── index.html           # Main search page
├── singyin.html         # Page with predefined stops
├── README.md            # This documentation file
├── styles/
│   └── style.css        # All global CSS styles and theme definitions
└── src/
    └── app.js           # Core JavaScript logic for data fetching, UI rendering, updates, and interactions
```

---

## 6. Component Breakdown

This section details the functionality of each main file.

### `index.html`

This file provides the foundational HTML structure for the main application:

-   **Document Setup**: Standard `<!DOCTYPE html>`, `charset`, `viewport` for responsiveness, and a `<title>`.
-   **Theme Initialization Script**: An inline `<script>` in the `<head>` checks `localStorage` immediately. If a dark theme was previously selected, it applies the `dark-mode` class to the `<html>` element *before* CSS loads, preventing a "flash of unstyled content" (FOUC).
-   **CSS Link**: Links to `styles/style.css` for all visual styling.
-   **Main Container (`.container`)**: Wraps all primary content, giving it a distinct card-like appearance with shadows and rounded corners.
-   **Header (`<header>`)**: Contains the application title (`<h1>`) and the shared controls for `themeToggle` and `langSelect`, arranged using flexbox.
-   **Search Form (`#searchForm`)**: Houses the user input fields:
    -   `#stopName`: Text input for partial bus stop names.
    -   `#routeNumbers`: Optional text input for comma-separated route numbers.
    -   Search button (`type="submit"`) with `btn-primary` and `ripple` classes for styling and a click animation.
-   **Results Area (`#results`)**: An empty `div` that JavaScript dynamically populates with bus ETA tables (desktop) or cards (mobile).
-   **Footer (`.app-footer`)**: Displays "Made by Timothy".
-   **JavaScript Link**: Loads `src/app.js` at the end of the `<body>` for optimal page loading performance.

### `singyin.html`

This file is a specialized version of the application, designed to display ETAs for a predefined set of bus stops without user search input.

-   **HTML Structure**: Largely similar to `index.html` in its layout for the header, result area, and footer.
    -   **Key Difference**: It **omits the entire search form** (`#searchForm`) present in `index.html`.
-   **Integrated JavaScript**: Instead of just linking `src/app.js` and running it directly, `singyin.html` embeds its own `<script>` block *after* linking `src/app.js`.
    -   It defines a `PRESETS` array containing the hard-coded stop `id`s and `platform` codes for "Pak Hung House – East Bound" and "Pak Hung House – West Bound".
    -   It then defines `renderSingYin()` and `refreshSingYin()` functions that *reuse many helper functions* (like `getETAs`, `formatTimeOnly`, `parseRouteStr`, `compareRoute`, `routeTagClass`, `updateUIText`, `isMobile`) directly from `src/app.js`.
    -   These `renderSingYin()` and `refreshSingYin()` functions implement the logic to iterate through the `PRESETS`, fetch data for each stop, process it, and render it into tables or cards, mirroring the structure of `initialBuild()` and `refreshEtas()` from `app.js` but without the user input dependency.
    -   It also contains its own event listeners for theme and language changes, triggering `renderSingYin()` instead of `initialBuild()`.
    -   Includes a refined `resize` listener to prevent constant re-renders on mobile scroll.

### `src/app.js`

This is the core JavaScript powerhouse for the entire application (`index.html` and `singyin.html`). It handles data fetching, processing, UI rendering, and user interactions.

-   **Constants (`API`, `LANGS`, `SUFFIX`)**: Defines API endpoints, a comprehensive dictionary for internationalization strings (labels, placeholders, headers, messages), and language-to-API-field mappings.
-   **Global State Variables**:
    -   `stopListCache`: Stores the fetched list of all KMB stops to prevent redundant API calls.
    -   `rowsData`: An array that holds references to the DOM elements (`etaCells`, `remCell`, `mobileContainer`) for each displayed row/card, enabling efficient live updates.
    -   `refreshTimer`: Stores the ID for the `setInterval` used for auto-refresh.
    -   `hasBuilt`: A flag to control when auto-refresh and resize-rebuilds should start (i.e., only after the initial user search on `index.html` or direct load on `singyin.html`).
-   **Data Fetching Functions**:
    -   `getStops()`: Fetches the complete KMB stop list, caching it on the first call.
    -   `getETAs(id)`: Fetches real-time ETA data for a given bus stop ID.
-   **Utility Functions (reused by both HTML files)**:
    -   `parseStopInfo(name)`: A robust function that extracts the cleaned stop name (title), platform number (`A1`), and KMB stop code (`WT123`) from the API's stop name strings, handling various parenthetical formats and **falling back to the English name if the stop code isn't found in the current language's name**.
    -   `formatTimeOnly(iso)`: Converts ISO timestamps into "HH:MM:SS" format.
    -   `parseRouteStr(rt)` and `compareRoute(a,b)`: Used for logical sorting of route numbers (e.g., `14`, `14X`, `A1`).
    -   `routeTagClass(r)`: Assigns specific CSS classes for route badge coloring based on route type (e.g., Airport routes, Night routes).
    -   `updateUIText()`: Dynamically updates all UI text elements based on the selected language.
    -   `isMobile()`: Determines if the current viewport is considered "mobile" (<= 576px wide).
-   **Core UI Rendering Logic (`initialBuild()` for `index.html`)**:
    -   Clears previous data and timers.
    -   Gathers user input (stop name, route filter).
    -   Filters the cached stop list based on the input.
    -   Groups matching stops by their cleaned title.
    -   For each stop: fetches ETAs, applies route filters (if any), and *crucially*, filters to display ETAs from **only one service type** (prioritizing 1, then 2, then 3 if live ETAs are available, otherwise showing any live ETAs).
    -   Prepares remarks: `numberedRemarks` for live ETAs (`ETA1: ...`) and `noetaRemarks` (unnumbered) for rows without live ETAs.
    -   Conditionally renders either a responsive table (desktop) or a series of compact cards (mobile), populating `rowsData` with DOM references for live updates.
    -   Starts the `refreshTimer`.
-   **Real-time Update Logic (`refreshEtas()`)**:
    -   Called by `refreshTimer` to update displayed ETAs without full re-renders.
    -   Iterates through `rowsData`.
    -   Re-fetches ETAs for each specific `(stopId, route, destination)` combination.
    -   Applies the same **single service type filtering** as `initialBuild()`.
    -   Updates `textContent` of ETA cells and remark cells.
    -   Applies a brief `eta-updated` class for visual feedback on changed data.
    -   Handles remarks: shows numbered remarks for live ETAs, or the first unnumbered remark if no live ETAs are present.
-   **Event Listeners**:
    -   **Ripple Effect**: A global click listener adds a visual "ripple" animation to elements with the `.ripple` class.
    -   **Theme Toggle**: Listens for changes on `#themeToggle`, updates the `dark-mode` class on `<html>`, and saves the preference to `localStorage`.
    -   **Search Form (`#searchForm`)**: On submit, prevents default, calls `updateUIText()`, saves search params to `localStorage`, sets `hasBuilt = true`, and calls `initialBuild()`.
    -   **Language Selector (`#langSelect`)**: On change, calls `updateUIText()` and, if `hasBuilt` is true, calls `initialBuild()` to rebuild the UI with new language.
    -   **Window Resize**: A debounced listener (`_prevIsMobile` flag) only calls `initialBuild()` if the viewport crosses the mobile/desktop breakpoint (`576px`), preventing unnecessary re-renders during mobile scrolling.
-   **Initialization**: On script load, `updateUIText()` is called. If `localStorage` contains a `lastSearch`, it populates the form fields, sets `hasBuilt = true`, and automatically calls `initialBuild()` to load the previous search results.

### `styles/style.css`

This file governs the entire visual presentation of the application, featuring a robust theming system and responsive design.

-   **Google Sans Imports**: Imports various weights and styles of the Google Sans font families directly from Google Fonts, ensuring a consistent and modern typographic aesthetic.
-   **Theme Variables (`:root`, `html.dark-mode`)**:
    -   Defines a comprehensive set of CSS Custom Properties for colors (backgrounds, surfaces, text, accents, outlines), shadows, border-radii, and animation properties.
    -   Default values are set for the light theme in `:root`.
    -   The `html.dark-mode` selector overrides these variables with dark-theme specific values when the `dark-mode` class is present on the `<html>` element, enabling seamless theme switching.
-   **Global Styles**: Resets default browser margins/paddings, sets base `font-family`, `background`, `color`, and `line-height` for the `<body>`. Includes transitions for smooth theme changes.
-   **Container Styling (`.container`)**: Styles the main application wrapper as a Material Design-inspired card with padding, rounded corners, and subtle shadows.
-   **Animations (`@keyframes`, classes)**: Defines `fadeIn` for element appearance, `ripple` for button click effects, and `fadeInScaleUp` for table/card entry.
-   **Header/Controls Styling**: Uses flexbox for alignment. Styles custom theme switches and language dropdowns to integrate with the Material Design aesthetic.
-   **Search Controls Styling**: Uses flexbox for responsive arrangement of input fields and buttons. Styles text inputs with clear borders and focus effects, and buttons with primary colors and dynamic hover/active states.
-   **Desktop Table (`.eta-table-container`, `table.eta-results`)**:
    -   The `eta-table-container` provides a floating card-like wrapper for the table.
    -   Table styles include collapsed borders, consistent padding, sticky table headers, and hover effects for rows.
    -   Special classes (`scheduled-eta`, `eta-first`, `no-eta-row`) provide visual cues for scheduled times, first ETAs, and rows with no live data.
    -   The `remark-only-cell` class handles the merged cell display for rows without live ETAs.
-   **Route Tag Styling (`.route-tag`)**: Small, distinct badges with specific background and text color combinations based on route type (e.g., Airport, Night, Cross-Harbour). These colors are **theme-neutral** (they remain consistent in both light and dark modes).
-   **Mobile Card Styling (`.mobile-card`)**:
    -   Utilizes `@media (max-width: 576px)` to switch layouts.
    -   Hides the desktop table and displays `mobile-card` elements using CSS Grid for a compact 3-column layout (route tag, destination, times).
    -   Fixed `height` and specific font sizes ensure elements fit within cards.
    -   Destination text is set to `white-space: normal; word-break: break-word;` to allow wrapping of long names, preventing horizontal overflow.
    -   `mobile-noeta` class styles for remarks in no-ETA cards.
-   **Footer Styling (`.app-footer`)**: Simple centered text styling for the "Made by Timothy" attribution.

---

## 7. Customization

-   **Add/Modify Predefined Stops**: Edit the `PRESETS` array within `singyin.html`'s `<script>` block.
-   **Adjust Language Strings**: Modify the `LANGS` object in `src/app.js` to change any localized text.
-   **Route Tag Colors**: Update the `.route-tag.route-XXX` CSS rules in `styles/style.css` to alter route badge colors.
-   **Auto-Refresh Interval**: Change the `30000` (milliseconds) value in the `setInterval` calls within `src/app.js` and `singyin.html`.
-   **Theming**: Customize the CSS custom properties in `styles/style.css` under `:root` and `html.dark-mode` for a different color scheme.
-   **Mobile Breakpoint**: Change the `576px` value in `isMobile()` function in `src/app.js` and in the `@media (max-width: 576px)` query in `styles/style.css`.

---

## 8. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`.
3.  Commit your changes: `git commit -m "feat: Add your feature"` or `fix: Fix bug"`.
4.  Push to your branch: `git push origin feature/your-feature-name`.
5.  Open a Pull Request, describing your changes clearly.

Please adhere to the existing code style (e.g., using Prettier for formatting).

---

## 9. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 10. Acknowledgments

-   KMB ETA API provided by etabus.gov.hk
-   Google Fonts for the "Google Sans" and "Roboto" typefaces.
-   Inspired by Material Design principles for a clean and intuitive user interface.