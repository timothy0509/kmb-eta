# KMB Real-Time Bus ETA Viewer

A web-based tool to fetch and display real-time Estimated Time of Arrival (ETA) for Kowloon Motor Bus (KMB) services in Hong Kong. This repository contains two distinct HTML interfaces: a general-purpose ETA search tool and a dedicated viewer for specific stops around "Pak Hung House."

## Live Demo

You can access the live versions here:

*   **General ETA Search:** `https://eta.hkjc.uk`
*   **Pak Hung House ETA:** `https://eta.hkjc.uk/singyin`

## Features

**Common Features (Both Pages):**

*   **Real-Time Data:** Fetches live ETA data from the official `data.etabus.gov.hk` API.
*   **Clear ETA Display:** Shows up to three upcoming ETAs per route, destination, and (where applicable) platform.
*   **Route Styling:** Color-codes bus routes based on their type (e.g., Airport 'A' routes, Overnight 'N' routes, Cross-harbour '1xx, 3xx, 6xx, 9xx' routes) for easy identification.
*   **Scheduled vs. Real-Time:** Differentiates scheduled buses (grey, italic text) from real-time tracked buses.
*   **Remarks:** Displays important remarks associated with specific departures (e.g., "Scheduled Bus", special service notes).
*   **Responsive Design:** Adapts to different screen sizes for usability on desktop and mobile devices.
*   **Dark Mode:** Includes a theme switcher (`index.html`) or defaults to dark mode (`singyin.html`) for user preference, with settings saved in local storage.
*   **Caching:**
    *   Stop list data is cached in `localStorage` to reduce API calls, with a 23-hour expiry, refreshing after 5 AM daily.
*   **Status Messages:** Provides user feedback for loading, errors, and informational messages.

**`index.html` - General KMB ETA Search:**

*   **Stop Search:** Allows users to search for bus stops by English or Chinese name.
*   **Route Filtering:** Users can filter ETAs for specific routes (e.g., "1A,271").
*   **Smart Grouping:**
    *   An optional feature that groups ETAs from multiple physical stop platforms that share a common base name (e.g., "Tsim Sha Tsui Ferry (Pier A)" and "Tsim Sha Tsui Ferry (Pier B)" would be grouped under "Tsim Sha Tsui Ferry").
    *   When smart grouping is active and a group contains multiple platforms, a "Plat." (Platform) column is shown if ETAs are from different platforms within that group.
*   **Custom Name Processing:** Formats stop and destination names to a consistent title case, with overrides for common acronyms (KMB, MTR, HSBC, etc.).
*   **Platform Parsing:** Attempts to extract platform information from stop names (e.g., "(A)", "BBI - Pier C").

**`singyin.html` - Pak Hung House Specific ETA Viewer:**

*   **Predefined Stops:** Displays ETAs for a hardcoded list of bus stops grouped as "Pak Hung House - East Bound" and "Pak Hung House - West Bound."
*   **Automatic Refresh:** ETAs automatically refresh every 60 seconds.
*   **Dedicated Platform Column:** Always shows a "Plat." column indicating the specific platform for each route's ETA.
*   **Simplified Interface:** No search or filter inputs; designed for quick, focused information.

## Technologies Used

*   **HTML5:** Structure of the web pages.
*   **CSS3:** Styling, layout, responsiveness, and theming (light/dark modes).
    *   Utilizes CSS variables for theming.
    *   Attempts to use "Google Sans" font family with "Roboto" as a fallback.
*   **JavaScript (ES6+):**
    *   Fetching data using the `fetch` API (`async/await`).
    *   DOM manipulation for displaying data.
    *   `localStorage` for caching and theme persistence.
    *   Event handling.
*   **KMB Open Data API:** The source of all bus stop and ETA information (`https://data.etabus.gov.hk`).

## File Structure

*   `index.html`: The main page for general bus stop ETA searches.
*   `singyin.html`: A specialized page for viewing ETAs for predefined stops near Pak Hung House.
*   `style.css`: Contains all the styling rules for both HTML pages, including light/dark themes and responsive design.

## How It Works

1.  **Fetch Stop Data (`index.html` & `singyin.html` - initial load/cache miss):**
    *   On initial load or if the cache is invalid, the application fetches a list of all KMB bus stops from the `/v1/transport/kmb/stop` API endpoint.
    *   This list is processed (names formatted) and cached in `localStorage`.
    *   `index.html` uses this list for searching stops.
    *   `singyin.html` can optionally use this to enrich stop details, though its primary function relies on predefined stop IDs.

2.  **User Interaction (`index.html`):**
    *   The user enters a stop name and optionally filters by route.
    *   The application searches the cached stop list for matches.
    *   If "Smart Grouping" is enabled, matched stops are grouped by their base name.

3.  **Fetch ETAs:**
    *   For each matched stop (or predefined stop in `singyin.html`), the application calls the `/v1/transport/kmb/stop-eta/{stop_id}` API endpoint.
    *   `index.html` fetches ETAs for user-selected/matched stops.
    *   `singyin.html` fetches ETAs for its predefined list of stop IDs and refreshes this data periodically.

4.  **Process and Display ETAs:**
    *   The fetched ETA data is processed:
        *   Destination names are formatted.
        *   ETAs are sorted by route number (alphanumerically) and then by platform if applicable.
        *   Up to three upcoming ETAs are selected for display.
    *   The results are rendered into HTML tables, with appropriate styling for route types, scheduled buses, and remarks.
    *   Platform information is displayed based on the context (smart grouping in `index.html`, dedicated column in `singyin.html`).

5.  **Dark Mode:**
    *   A toggle in `index.html` allows users to switch between light and dark themes.
    *   `singyin.html` defaults to dark mode.
    *   The theme preference is saved in `localStorage` and applied on subsequent visits.

## Setup

No special setup is required beyond hosting these files on a web server or opening them directly in a modern web browser. For the live API calls to work, an internet connection is necessary.

To deploy on GitHub Pages:
1.  Push the `index.html`, `singyin.html`, and `style.css` files to a GitHub repository.
2.  Enable GitHub Pages in the repository settings (usually deploying from the `main` or `master` branch).

## Potential Future Enhancements

*   **Geolocation:** Find nearby bus stops.
*   **Favorite Stops:** Allow users to save frequently used stops (`index.html`).
*   **Service Status Notifications:** Integrate KMB service alerts.
*   **PWA Features:** Offline support for cached data, add to home screen.
*   **Internationalization (i18n):** Support for multiple UI languages beyond EN/TC/SC in data.
*   **More Advanced Filtering/Sorting:** By time, by specific platform, etc.

## Author

*   Timothy


