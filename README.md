# Peregrine CMS - Vue 3 Page Renderer

A modern Vue 3 page renderer for Peregrine CMS, replacing the legacy Vue 2.x renderer.

## Features

- **Vue 3 Composition API** - Modern reactive programming with `<script setup>`, `ref`, `computed`, `inject`
- **ES Module Architecture** - Clean imports/exports, tree-shakeable
- **Proxy-based Reactivity** - More efficient and complete reactivity system
- **SPA Navigation** - Client-side page transitions with history management
- **Edit Mode Support** - Placeholders and inline editing integration
- **Helper Utilities** - `$helper.isEmpty()`, `pathToUrl()`, and more
- **TypeScript Ready** - Full TypeScript support (optional)

## Quick Start

### Build and Deploy

```bash
# Install dependencies
cd ui.apps
npm install

# Build components
npm run build:components

# Build and deploy to local Peregrine instance
cd ..
mvn clean install -PautoInstallPackage
```

### View Sample Site

After deployment, visit:
- **Preview:** http://localhost:8080/content/pagerendervue3/pages/index.html
- **Editor:** http://localhost:8080/content/admin/pages/pages/edit.html/path:/content/pagerendervue3/pages/index

### Standalone Demo

Open `demo.html` in a browser to see the renderer in action without Sling.

## API Reference

### Global: `$peregrineApp`

The main API is available globally as `window.$peregrineApp`:

```javascript
// Load content from a URL
$peregrineApp.loadContent('/content/mysite/pages/home.html')

// Load from embedded JSON element
$peregrineApp.loadContentFrom('perPage', '/content/mysite/pages/home.html', true)

// Check if in author/edit mode
if ($peregrineApp.isAuthorMode()) {
  // Show edit UI
}

// Get current page state
const state = $peregrineApp.getPageState()
// state.page - current page data
// state.path - current path
// state.status - 'initial' | 'loading' | 'loaded' | 'error'

// Register a component manually
$peregrineApp.loadComponent('mytheme-components-richtext')

// Get the Vue app instance
const app = $peregrineApp.getVueApp()

// Create a logger
const log = $peregrineApp.logger('MyComponent')
log.debug('Debug message')
log.info('Info message')
log.warn('Warning')
log.error('Error')
```

### Helper Utilities: `$helper`

Available in components via `this.$helper` or injection:

```javascript
// In a Composition API component
import { inject } from 'vue'

const peregrineApp = inject('peregrineApp')
const helpers = peregrineApp.helpers

// Or use global properties
// this.$helper in Options API

// Check if a field is empty
helpers.isEmpty('')           // true
helpers.isEmpty('<p><br></p>') // true (empty rich text)
helpers.isEmpty('content')    // false

// Check if all fields are empty
helpers.areAllEmpty('', null, undefined) // true
helpers.areAllEmpty('', 'text')          // false

// Convert path to URL
helpers.pathToUrl('/content/page')       // '/content/page.html'
helpers.pathToUrl('/content/page.html')  // '/content/page.html'
helpers.pathToUrl('#anchor')             // '#anchor'
helpers.pathToUrl('https://example.com') // 'https://example.com'
```

### Injection Context

Components can inject the Peregrine context:

```vue
<script setup>
import { inject, computed } from 'vue'

// Inject the app context
const peregrineApp = inject('peregrineApp')

// Check edit mode
const isEditMode = computed(() => peregrineApp?.isAuthorMode?.() ?? false)

// Access helpers
const isEmpty = peregrineApp.helpers.isEmpty
</script>
```

## Project Structure

```
pagerendervue3/
├── core/                           # Java Sling Models
│   └── src/main/java/.../models/
│       ├── PageModel.java          # Page component model
│       ├── Container.java          # Container component model
│       ├── BaseComponentModel.java # Base component (exports 'text')
│       └── PageRenderVue3Constants.java
│
├── ui.apps/                        # Content package
│   └── src/main/content/jcr_root/
│       ├── apps/pagerendervue3/    # Component definitions
│       │   ├── structure/
│       │   │   ├── page/           # Page component + HTL
│       │   │   └── container/      # Container component
│       │   └── components/
│       │       ├── base/           # Base component
│       │       └── placeholder/    # Editor drop targets
│       │
│       ├── content/pagerendervue3/ # Sample site
│       │   ├── pages/              # Sample pages
│       │   └── templates/          # Template with siteCSS/siteJS
│       │
│       └── etc/felibs/pagerendervue3/
│           ├── js/
│           │   └── peregrineApp.js # Core Vue 3 app (ES Module)
│           ├── css/
│           │   └── components.css  # Base styles
│           └── vue/
│               └── vue.global.js   # Vue 3 runtime
│
├── scripts/
│   └── buildvue3.js                # Vue SFC compiler (Rollup + esbuild)
├── demo.html                       # Standalone demo
├── MIGRATION.md                    # Vue 2 → Vue 3 migration guide
└── package.json
```

## Component Development

### Vue 3 SFC Template

```vue
<template>
  <div :data-per-path="model.path" :class="model.extraclasses">
    <!-- Show content or empty state -->
    <div v-if="hasContent" v-html="model.text" data-per-inline="model.text" />
    <div v-else-if="isEditMode" class="empty-state">No content defined</div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true
  }
})

// Inject Peregrine context
const peregrineApp = inject('peregrineApp')

// Check if in edit mode
const isEditMode = computed(() => peregrineApp?.isAuthorMode?.() ?? false)

// Check if we have content
const hasContent = computed(() => {
  return !peregrineApp.helpers.isEmpty(props.model.text)
})
</script>

<style scoped>
.empty-state {
  padding: 1rem;
  color: #999;
  font-style: italic;
  border: 1px dashed #ccc;
}
</style>
```

### Component Registration

Components are registered via global variables following the naming convention:

```
sling:resourceType: "mytheme/components/richtext"
        ↓
Vue component name: "mytheme-components-richtext"
        ↓
Global variable: window.cmpMythemeComponentsRichtext
```

The build script (`buildvue3.js`) compiles `.vue` files to IIFE modules.

## Comparison with Vue 2 Renderer

| Aspect | Vue 2 | Vue 3 |
|--------|-------|-------|
| API Style | Options API | Composition API |
| Reactivity | Object.defineProperty | Proxy-based |
| Context Access | `this.$root`, `Vue.set()` | `inject()`, direct mutation |
| Module Format | Mixed IIFE/ES | ES Modules |
| Helpers | `Vue.prototype.$helper` | `app.config.globalProperties` + inject |
| Build | Rollup + Buble | Rollup + esbuild (faster) |

## Events

The renderer dispatches custom events:

```javascript
// Fired after each page load
window.addEventListener('pageRendered', (event) => {
  console.log('Page loaded:', event.detail.path)
  console.log('Page data:', event.detail.page)
})
```

## Browser Support

- Chrome 87+
- Firefox 78+
- Safari 14+
- Edge 88+

(Requires ES Module and Proxy support)

## License

Apache License 2.0
