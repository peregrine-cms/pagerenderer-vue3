/**
 * Peregrine CMS - Vue 3 Page Renderer
 * Application Runtime (IIFE)
 * 
 * This is the core runtime for the Vue 3 page renderer. It handles:
 * - Vue 3 app creation and mounting
 * - Component registration and lazy loading
 * - SPA navigation with history management
 * - Editor/author mode integration
 * - Helper utilities for components
 */

(function() {
'use strict';

const { createApp, reactive, computed, provide } = Vue;

// =============================================================================
// Constants
// =============================================================================

const DATA_EXTENSION = '.data.json';
const COMPONENT_PREFIX = 'cmp';

// =============================================================================
// Logger (simplified, production-ready)
// =============================================================================

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

let globalLogLevel = LogLevel.INFO;

function createLogger(name) {
  const prefix = `[Peregrine:${name}]`;
  
  return {
    setDebugLevel() { 
      globalLogLevel = LogLevel.DEBUG; 
      return this; 
    },
    setLevel(level) { 
      globalLogLevel = level; 
      return this; 
    },
    debug(...args) { 
      if (globalLogLevel <= LogLevel.DEBUG) console.debug(prefix, ...args); 
    },
    fine(...args) { 
      if (globalLogLevel <= LogLevel.DEBUG) console.debug(prefix, ...args); 
    },
    info(...args) { 
      if (globalLogLevel <= LogLevel.INFO) console.info(prefix, ...args); 
    },
    warn(...args) { 
      if (globalLogLevel <= LogLevel.WARN) console.warn(prefix, ...args); 
    },
    error(...args) { 
      if (globalLogLevel <= LogLevel.ERROR) console.error(prefix, ...args); 
    }
  };
}

const log = createLogger('App');

// =============================================================================
// Helper Utilities (available as $helper in components)
// =============================================================================

const helpers = {
  /**
   * Check if a field value is empty
   */
  isEmpty(field) {
    if (field === undefined || field === null || field === '') return true;
    if (field === '<p><br></p>' || field === '<p></p>') return true;
    if (Array.isArray(field) && field.length === 0) return true;
    if (field === false) return true;
    return false;
  },

  /**
   * Check if all provided fields are empty
   */
  areAllEmpty(...fields) {
    return fields.every(field => helpers.isEmpty(field));
  },

  /**
   * Check if any of the provided fields is not empty
   */
  hasAnyContent(...fields) {
    return fields.some(field => !helpers.isEmpty(field));
  },

  /**
   * Convert a content path to a URL
   * - Adds .html extension if needed
   * - Preserves hash links and absolute URLs
   */
  pathToUrl(path) {
    if (!path || path.length < 1) return path;
    if (path.startsWith('#')) return path;
    
    // Check for absolute URL
    const absoluteUrl = /^(?:[a-z]+:)?\/\//i;
    if (absoluteUrl.test(path)) return path;
    
    // Check if already has file extension
    const hasExtension = /\.\w+$/.test(path);
    if (hasExtension) return path;
    
    // Add .html extension
    return `${path}.html`;
  },

  /**
   * Convert path to data URL (for fetching JSON)
   */
  pathToDataUrl(path) {
    if (!path) return path;
    
    const hasExtension = /\.[^/\\]+$/.test(path);
    if (hasExtension) {
      if (path.endsWith('.html')) {
        return path.slice(0, -5) + DATA_EXTENSION;
      }
      return path;
    }
    return path + DATA_EXTENSION;
  },

  /**
   * Extract suffix parameters from a path
   * e.g., /page.html/param1//value1/param2//value2
   */
  parsePathSuffix(path) {
    const htmlPos = path.indexOf('.html');
    if (htmlPos < 0) return { path, suffix: '', params: {} };
    
    const basePath = path.slice(0, htmlPos + 5);
    const suffix = path.slice(htmlPos + 6);
    const params = {};
    
    if (suffix) {
      const parts = suffix.split('//');
      for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i + 1] !== undefined) {
          params[parts[i]] = parts[i + 1];
        }
      }
    }
    
    return { path: basePath, suffix, params };
  }
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert resource type to Vue component name
 * e.g., "mytheme/components/richtext" -> "mytheme-components-richtext"
 */
function resourceTypeToComponentName(resourceType) {
  if (!resourceType) return null;
  return resourceType.replace(/\//g, '-').toLowerCase();
}

/**
 * Convert component name to global variable name
 * e.g., "mytheme-components-richtext" -> "cmpMythemeComponentsRichtext"
 */
function componentNameToVarName(name) {
  if (!name) return null;
  const segments = name.split('-');
  const camelCase = segments
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return COMPONENT_PREFIX + camelCase;
}

// =============================================================================
// Page State (Reactive)
// =============================================================================

const pageState = reactive({
  page: null,
  path: null,
  status: 'initial', // 'initial' | 'loading' | 'loaded' | 'error'
  error: null
});

// =============================================================================
// Component Registry
// =============================================================================

const registeredComponents = new Map();
let vueApp = null;
let vueAppInstance = null;  // The mounted root component instance
let appMounted = false;

/**
 * Load and register a component by name
 */
function loadComponent(name) {
  if (!name) return false;
  
  // Normalize name
  const normalizedName = name.includes('/') 
    ? resourceTypeToComponentName(name) 
    : name.toLowerCase();
  
  if (registeredComponents.has(normalizedName)) {
    log.debug('Component already registered:', normalizedName);
    return true;
  }

  const varName = componentNameToVarName(normalizedName);
  const component = window[varName];

  if (component) {
    if (vueApp) {
      vueApp.component(normalizedName, component);
    }
    registeredComponents.set(normalizedName, component);
    log.debug('Registered component:', normalizedName);
    
    // Share with parent frame if in editor
    try {
      if (window.parent && window.parent !== window && window.parent.$perAdminApp) {
        if (!window.parent[varName]) {
          window.parent[varName] = component;
        }
      }
    } catch (e) {
      // Cross-origin, ignore
    }
    
    return true;
  }

  log.warn('Component not found:', normalizedName, `(looking for window.${varName})`);
  return false;
}

/**
 * Walk the content tree and load all referenced components
 */
function walkTreeAndLoadComponents(node) {
  if (!node) return;

  if (node.component) {
    loadComponent(node.component);
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(walkTreeAndLoadComponents);
  }
}

// =============================================================================
// Author/Edit Mode Detection
// =============================================================================

/**
 * Check if we're in author/edit mode (inside the admin iframe)
 */
function isAuthorMode() {
  try {
    // Check iframe mode attribute first
    if (window.frameElement?.attributes['data-per-mode']) {
      const mode = window.frameElement.attributes['data-per-mode'].value;
      if (mode === 'preview' || mode === 'tutorial') {
        return false;
      }
    }
    
    // Check for admin app in parent
    if (window.parent && window.parent !== window && window.parent.$perAdminApp) {
      return true;
    }
  } catch (e) {
    // Cross-origin error, not in admin context
  }
  return false;
}

/**
 * Get a node from the admin app's view state
 */
function getAdminAppNode(path) {
  try {
    if (window.parent?.$perAdminApp) {
      // Check mode
      if (window.frameElement?.attributes['data-per-mode']?.value === 'tutorial') {
        return null;
      }
      return window.parent.$perAdminApp.getNodeFromViewOrNull(path);
    }
  } catch (e) {
    // Cross-origin
  }
  return null;
}

// =============================================================================
// View/State Management
// =============================================================================

let registeredView = null;

/**
 * Get the current view (page state container)
 */
function getView() {
  try {
    // In admin context, use parent's pageView for shared state
    if (window.parent?.$perAdminView?.pageView) {
      const mode = window.frameElement?.attributes['data-per-mode']?.value;
      if (mode !== 'tutorial') {
        return window.parent.$perAdminView.pageView;
      }
    }
  } catch (e) {
    // Cross-origin
  }
  return registeredView || pageState;
}

/**
 * Set a value at a path in an object (reactive-aware)
 */
function setAtPath(obj, path, value) {
  const parts = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Get a value at a path in an object
 */
function getAtPath(obj, path) {
  const parts = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');
  let current = obj;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  
  return current;
}

// =============================================================================
// Meta Tag Updates
// =============================================================================

function updateMetaTag(selector, content, attr = 'content') {
  const meta = document.querySelector(selector);
  if (meta) {
    if (content) {
      meta.setAttribute(attr, content);
    } else {
      meta.remove();
    }
  } else if (content) {
    const el = document.createElement('meta');
    const selectorMatch = selector.match(/\[(\w+)="?([^"\]]+)"?\]/);
    if (selectorMatch) {
      el.setAttribute(selectorMatch[1], selectorMatch[2]);
    }
    el.content = content;
    document.head.appendChild(el);
  }
}

function updatePageMeta(pageData) {
  // Title
  if (pageData.title) {
    const brand = pageData.brand ? ` | ${pageData.brand}` : '';
    document.title = pageData.title + brand;
  }

  // Description
  if (pageData.description) {
    updateMetaTag('meta[name="description"]', pageData.description);
  }

  // Canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && pageData.canonicalUrl) {
    canonical.href = pageData.canonicalUrl;
  }

  // Robots
  if (pageData.metaRobots) {
    updateMetaTag('meta[name="robots"]', pageData.metaRobots);
  }

  // Open Graph
  updateMetaTag('meta[property="og:title"]', pageData.ogTitle);
  updateMetaTag('meta[property="og:description"]', pageData.ogDescription);
  updateMetaTag('meta[property="og:image"]', pageData.absOgImage);
  updateMetaTag('meta[property="og:url"]', pageData.canonicalUrl);
}

// =============================================================================
// Content Loading & SPA Navigation
// =============================================================================

// Paths that shouldn't change the URL (for special cases)
const hiddenPaths = [];

/**
 * Process loaded content data and update state
 */
function processLoadedContent(data, path, isFirstLoad, fromPopState) {
  log.debug('Processing content for:', path);
  
  // Allow custom data processing
  if (window.$perProcessData) {
    data = window.$perProcessData(data);
  }

  // Load all components referenced in the content tree
  walkTreeAndLoadComponents(data);

  // Handle suffix-to-parameter mapping
  if (data.suffixToParameter) {
    const pathInfo = helpers.parsePathSuffix(path);
    for (let i = 0; i < data.suffixToParameter.length; i += 2) {
      const paramName = data.suffixToParameter[i];
      const targetPath = data.suffixToParameter[i + 1];
      const paramValue = pathInfo.params[paramName];
      if (paramValue !== undefined) {
        setAtPath(getView(), targetPath, paramValue);
      }
    }
  }

  // Update page state
  const view = getView();
  const newPath = path.includes('.html') ? path.slice(0, path.indexOf('.html')) : path;
  
  // Update pageState (Vue 3 reactive)
  pageState.page = data;
  pageState.path = newPath;
  pageState.status = 'loaded';
  
  // Update the registered view
  view.page = data;
  view.path = newPath;
  view.status = 'loaded';

  // Initialize Vue app on first load
  if (isFirstLoad && !appMounted) {
    initVueApp();
  }
  
  // CRITICAL: For SPA navigation after app is mounted, we need to update 
  // through Vue's reactivity system. The vueApp's data is a proxy, and 
  // modifying the original view object doesn't trigger Vue's reactivity.
  if (appMounted && vueAppInstance) {
    // Update through the mounted Vue instance to trigger reactivity
    vueAppInstance.page = data;
    vueAppInstance.path = newPath;
    vueAppInstance.status = 'loaded';
    
    // Force a re-render of the component tree
    vueAppInstance.$forceUpdate();
    
    log.debug('Updated Vue instance with new page data');
  }

  // Update meta tags
  updatePageMeta(data);

  // Handle browser history
  if (!fromPopState && document.location.pathname !== path) {
    const pagePath = path.includes('.html') ? path.slice(0, path.indexOf('.html')) : path;
    let newLocation = hiddenPaths.includes(path) ? window.location.pathname : path;
    
    // Handle domain-relative URLs for public sites
    if (window.$peregrineSiteRoot && (isPublicFacingSite() || isBetaSite())) {
      newLocation = newLocation.replace(window.$peregrineSiteRoot, '');
    }

    // Preserve hash
    if (window.location.hash) {
      newLocation += window.location.hash;
    }

    if (isFirstLoad) {
      history.replaceState({ peregrinevue: true, path }, '', newLocation);
    } else {
      history.pushState({ peregrinevue: true, path }, '', newLocation);
      window.scrollTo(0, 0);
    }
  }

  // Dispatch custom event for external listeners
  window.dispatchEvent(new CustomEvent('pageRendered', { 
    detail: { path, page: data } 
  }));

  log.info('Page loaded:', path);
}

/**
 * Load content from server or embedded JSON
 */
async function loadContent(path, isFirstLoad = false, fromPopState = false, fromEmbedded = false) {
  log.debug('Loading content:', path, { isFirstLoad, fromPopState, fromEmbedded });
  
  pageState.status = 'loading';

  try {
    let data;

    if (fromEmbedded) {
      // Load from embedded script tag
      const element = document.getElementById('perPage');
      if (!element) {
        throw new Error('Embedded page data element #perPage not found');
      }
      data = JSON.parse(element.textContent);
    } else {
      // Fetch from server
      const dataUrl = helpers.pathToDataUrl(path);
      const response = await fetch(dataUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      data = await response.json();

      // Handle server-side redirect
      if (data.serverSide === true && data.pagePath) {
        document.location = `${data.pagePath}.html`;
        return;
      }
    }

    processLoadedContent(data, path, isFirstLoad, fromPopState);

  } catch (error) {
    log.error('Failed to load content:', error);
    pageState.status = 'error';
    pageState.error = error.message;
  }
}

// =============================================================================
// Domain/Site Helpers
// =============================================================================

function getCurrentServer() {
  return window.location.protocol + '//' + window.location.hostname;
}

function isPublicFacingSite() {
  const domains = pageState.page?.domains || [];
  return domains[0] === getCurrentServer();
}

function isBetaSite() {
  const domains = (pageState.page?.domains || []).slice(1);
  return domains.includes(getCurrentServer());
}

function isAlphaSite() {
  const domains = (pageState.page?.domains || []).slice(2);
  return domains.includes(getCurrentServer());
}

// =============================================================================
// Click Handler for SPA Navigation
// =============================================================================

function findClickableAnchor(element) {
  while (element && element.nodeName !== 'A') {
    element = element.parentNode;
    if (!element || element === document.body) return null;
  }
  return element;
}

function handleGlobalClick(event) {
  const anchor = findClickableAnchor(event.target);
  if (!anchor) return;

  const href = anchor.getAttribute('href');
  const fullUrl = anchor.href;
  
  // Skip: downloads, external links, hash-only links
  if (anchor.hasAttribute('download')) return;
  if (!fullUrl || (!fullUrl.startsWith('http') && !fullUrl.startsWith('/'))) return;
  if (href?.startsWith('#')) return;

  // Skip if editor is active
  try {
    if (window.parent?.$perAdminApp) {
      const view = window.parent.$perAdminApp.getView();
      if (view?.state?.contentview?.editor?.active) {
        event.preventDefault();
        return false;
      }
    }
  } catch (e) {
    // Cross-origin
  }

  // Skip same-page hash links
  const currentUrl = window.location.href.replace(/#\w+$/, '');
  if (fullUrl.startsWith(currentUrl) && fullUrl.match(/#\w+$/)) return;

  // Handle internal navigation
  const currentServer = window.location.protocol + '//' + window.location.host + '/';
  if (fullUrl.startsWith(currentServer)) {
    event.preventDefault();
    const internalPath = '/' + fullUrl.slice(currentServer.length);
    log.debug('SPA navigation to:', internalPath);
    loadContent(internalPath, false);
    return false;
  }
}

function handlePopState(event) {
  if (event.state?.path) {
    log.debug('Popstate navigation:', event.state.path);
    loadContent(event.state.path, false, true);
  } else if (event.state) {
    // Unknown state, reload
    location.reload();
  } else {
    // No state, try current location
    loadContent(document.location?.pathname || '/', false, true);
  }
}

// =============================================================================
// Vue App Initialization
// =============================================================================

/**
 * Check if we're using the parent's Vue 2 reactive view
 */
function isUsingParentView() {
  try {
    if (window.parent?.$perAdminView?.pageView) {
      const mode = window.frameElement?.attributes['data-per-mode']?.value;
      return mode !== 'tutorial';
    }
  } catch (e) {
    // Cross-origin
  }
  return false;
}

/**
 * Set up a bridge to sync changes between Vue 2 (parent) and Vue 3 (iframe).
 * 
 * The problem: Vue 2's reactivity uses getters/setters, Vue 3 uses Proxies.
 * When Vue 2 modifies the shared object, Vue 3's proxy doesn't detect it.
 * 
 * Solution: We use Vue 2's $watch in the parent to detect changes, then
 * trigger Vue 3's reactivity by calling $forceUpdate.
 */
function setupParentViewBridge(vueAppInstance) {
  if (!isUsingParentView()) return;
  
  try {
    const parentApp = window.parent.$perAdminApp?.getApp();
    const parentView = window.parent.$perAdminView;
    
    if (!parentApp || !parentView) {
      log.warn('Parent app or view not available for bridge setup');
      return;
    }
    
    log.debug('Setting up Vue 2 <-> Vue 3 reactivity bridge');
    
    // Watch the parent's pageView.page for deep changes
    // When Vue 2 detects a change, we force Vue 3 to update
    parentApp.$watch('pageView.page', function(newVal, oldVal) {
      if (vueAppInstance && newVal) {
        log.debug('Parent page changed, syncing to Vue 3');
        // Force Vue 3 to see the change by triggering its reactivity
        const vm = vueAppInstance._instance?.proxy;
        if (vm) {
          vm.$forceUpdate();
        }
      }
    }, { deep: true });
    
    log.info('Parent view bridge established');
    
  } catch (e) {
    log.warn('Failed to setup parent view bridge:', e);
  }
}

function initVueApp() {
  if (vueApp && appMounted) return vueApp;
  
  log.info('Initializing Vue 3 app...');

  // Register base renderer components BEFORE creating the app
  // so they're available when the app compiles the DOM template
  loadComponent('pagerendervue3-structure-page');
  loadComponent('pagerendervue3-structure-container');
  loadComponent('pagerendervue3-components-base');
  loadComponent('pagerendervue3-components-placeholder');

  // Get the view - in edit mode this is window.parent.$perAdminView.pageView
  // which is shared with the admin console for two-way binding.
  const view = getView();
  const inEditMode = isUsingParentView();
  
  log.debug('Init Vue app, edit mode:', inEditMode);
  
  // CRITICAL FIX FOR VUE 2 <-> VUE 3 REACTIVITY:
  // 
  // The problem: Vue 2 (admin) and Vue 3 (iframe) have incompatible reactivity systems.
  // - Vue 2 uses Object.defineProperty (getters/setters)
  // - Vue 3 uses Proxy
  // 
  // When the admin (Vue 2) modifies pageView.page.children[0].text:
  // - Vue 2's watchers fire (it sees the change)
  // - Vue 3's Proxy doesn't see it (the change happens on the original object,
  //   not through Vue 3's proxy)
  //
  // Solution: We set up a bridge that watches Vue 2 changes and triggers Vue 3 updates.
  
  vueApp = createApp({
    data() {
      // Return the view directly - Vue 3 will make it reactive
      // For edit mode, we'll set up a bridge to sync changes
      return view;
    },
    computed: {
      // Compute the page component name from the page data
      pageComponentName() {
        if (!this.page?.component) {
          return 'pagerendervue3-structure-page';
        }
        return this.page.component.replace(/\//g, '-').toLowerCase();
      }
    }
  });

  // Provide context to all components
  vueApp.provide('peregrineApp', peregrineApp);
  
  // Make helpers available globally
  vueApp.config.globalProperties.$helper = helpers;

  // Register all components that were loaded before app creation
  registeredComponents.forEach((component, name) => {
    vueApp.component(name, component);
  });

  // Mount (uses existing DOM as template)
  const mountEl = document.getElementById('peregrine-app');
  if (mountEl) {
    // mount() returns the root component instance in Vue 3
    vueAppInstance = vueApp.mount('#peregrine-app');
    appMounted = true;
    log.info('Vue app mounted');
    
    // Set up the Vue 2 <-> Vue 3 bridge for edit mode
    if (inEditMode) {
      setupParentViewBridge(vueApp);
    }
  } else {
    log.error('Mount element #peregrine-app not found');
  }

  return vueApp;
}

// =============================================================================
// Setup Global Event Handlers
// =============================================================================

function initBrowserHandlers() {
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('popstate', handlePopState);
  log.debug('Browser handlers initialized');
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBrowserHandlers);
} else {
  initBrowserHandlers();
}

// =============================================================================
// Public API
// =============================================================================

const peregrineApp = {
  // Version
  version: '3.0.0',

  // Paths that shouldn't update the URL
  hiddenPaths,

  /**
   * Register a view object for state sharing
   */
  registerView(view) {
    registeredView = view;
    log.debug('View registered');
  },

  /**
   * Load content from a URL path
   */
  loadContent(path, firstTime = false, fromPopState = false) {
    return loadContent(path, firstTime, fromPopState, false);
  },

  /**
   * Load content from an embedded script element
   */
  loadContentFrom(elementId, path, firstTime = false, fromPopState = false) {
    return loadContent(path, firstTime, fromPopState, true);
  },

  /**
   * Create a logger instance
   */
  logger(name) {
    return createLogger(name);
  },

  /**
   * Load and register a component
   */
  loadComponent,

  /**
   * Get the Vue app instance
   */
  getVueApp() {
    return vueApp;
  },

  /**
   * Check if in author/edit mode
   */
  isAuthorMode,

  /**
   * Get the current view/state
   */
  getView,

  /**
   * Get page state
   */
  getPageState() {
    return pageState;
  },

  /**
   * Get a node from the admin app
   */
  getAdminAppNode,

  /**
   * Initialize the Vue app manually
   */
  initApp: initVueApp,

  /**
   * Domain helpers
   */
  isPublicFacingSite,
  isBetaSite,
  isAlphaSite,

  /**
   * Set language (triggers reload)
   */
  setLanguage(lang) {
    window.localStorage.lang = lang;
    window.location.reload();
  },

  /**
   * Helper utilities
   */
  helpers
};

// Export to global scope
window.$peregrineApp = peregrineApp;

})();
