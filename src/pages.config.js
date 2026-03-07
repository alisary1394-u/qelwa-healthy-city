/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Retry dynamic imports: on failure (e.g. new deploy changed chunk hashes),
// reload the page once to get fresh HTML with correct chunk URLs.
function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      const reloaded = sessionStorage.getItem('chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {}); // never resolves — page is reloading
      }
      sessionStorage.removeItem('chunk_reload');
      return importFn(); // second attempt after reload
    })
  );
}

export const PAGES = {
    "Budget": lazyRetry(() => import('./pages/Budget')),
    "Committees": lazyRetry(() => import('./pages/Committees')),
    "Dashboard": lazyRetry(() => import('./pages/Dashboard')),
    "Files": lazyRetry(() => import('./pages/Files')),
    "Home": lazyRetry(() => import('./pages/Home')),
    "Initiatives": lazyRetry(() => import('./pages/Initiatives')),
    "Reports": lazyRetry(() => import('./pages/Reports')),
    "Settings": lazyRetry(() => import('./pages/Settings')),
    "Standards": lazyRetry(() => import('./pages/Standards')),
    "Survey": lazyRetry(() => import('./pages/Survey')),
    "Tasks": lazyRetry(() => import('./pages/Tasks')),
    "TeamManagement": lazyRetry(() => import('./pages/TeamManagement')),
    "UserSettings": lazyRetry(() => import('./pages/UserSettings')),
    "Volunteering": lazyRetry(() => import('./pages/Volunteering')),
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};