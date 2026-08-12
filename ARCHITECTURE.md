# Vue 3 Page Renderer - Architecture Guide

This document describes the architecture of the Vue 3 page renderer for Peregrine CMS, based on reverse-engineering the Vue 2 renderer and adapting it for Vue 3.

## Overview

The page renderer is responsible for:
1. Rendering page content as Vue components
2. Providing edit mode support (placeholders, inline editing)
3. Enabling SPA navigation between pages
4. Integrating with the Peregrine admin interface

## Project Structure

```
pagerenderer-vue3/
├── core/                                    # Java/OSGi bundle
│   └── src/main/java/com/peregrine/pagerender/vue3/
│       └── models/
│           ├── PageModel.java               # Page Sling Model
│           ├── Container.java               # Container Sling Model  
│           ├── BaseComponentModel.java      # Base component Sling Model
│           └── PageRenderVue3Constants.java # Resource type constants
│
├── ui.apps/                                 # Content package
│   ├── src/main/content/jcr_root/
│   │   ├── apps/pagerendervue3/            # Component definitions
│   │   │   ├── structure/
│   │   │   │   ├── page/                   # Page component
│   │   │   │   │   ├── .content.xml
│   │   │   │   │   ├── page.html           # HTL template
│   │   │   │   │   ├── Helper.java         # HTL use class
│   │   │   │   │   ├── template.vue        # Vue SFC
│   │   │   │   │   ├── styles.html
│   │   │   │   │   ├── renderer-pre.html
│   │   │   │   │   └── renderer.html       # Script includes
│   │   │   │   └── container/
│   │   │   │       ├── .content.xml
│   │   │   │       └── template.vue
│   │   │   └── components/
│   │   │       ├── base/
│   │   │       │   ├── .content.xml
│   │   │       │   ├── template.vue
│   │   │       │   └── dialog.json         # Edit dialog definition
│   │   │       └── placeholder/
│   │   │           └── template.vue
│   │   │
│   │   ├── content/pagerendervue3/         # Sample site content
│   │   │   ├── .content.xml                # Site definition (per:Site)
│   │   │   ├── pages/
│   │   │   │   ├── .content.xml            # Pages root (template reference)
│   │   │   │   ├── index/
│   │   │   │   ├── about/
│   │   │   │   ├── features/
│   │   │   │   └── contact/
│   │   │   └── templates/
│   │   │       ├── .content.xml            # Templates root (siteCSS, siteJS)
│   │   │       └── base/
│   │   │
│   │   └── etc/felibs/pagerendervue3/      # Frontend library
│   │       ├── .content.xml                # FeLib definition
│   │       ├── js/
│   │       │   └── peregrineApp.js         # Core app logic
│   │       ├── css/
│   │       │   └── components.css          # Component styles
│   │       └── vue/
│   │           └── vue.global.js           # Vue 3 runtime
│   │
│   ├── buildvue3.js                        # Vue SFC build script
│   └── package.json
│
└── pom.xml                                  # Parent POM
```

## Key Concepts

### 1. Sling Models for JSON Export

Each component type needs a Sling Model that exports its properties to JSON. This is how content data gets to the Vue components.

**BaseComponentModel.java:**
```java
@Model(adaptables = Resource.class,
       resourceType = "pagerendervue3/components/base",
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL,
       adapters = IComponent.class)
@Exporter(name = JACKSON, extensions = JSON)
public class BaseComponentModel extends AbstractComponent {

    @Inject
    @Default(values = "")
    private String text;

    public String getText() {
        return text == null ? "" : text;
    }
}
```

**Key points:**
- `@Model` binds to a specific `resourceType`
- `@Exporter` enables JSON serialization
- `@Inject` pulls properties from JCR nodes
- Extends `AbstractComponent` for common functionality

### 2. Content Structure & Template Inheritance

```
/content/pagerendervue3/
├── .content.xml                    # per:Site
├── templates/
│   ├── .content.xml               # Defines siteCSS, siteJS (inherited by all)
│   │   └── jcr:content
│   │       ├── siteCSS = ["/etc/felibs/.../components.css"]
│   │       └── siteJS = ["/etc/felibs/.../vue.global.js"]
│   └── base/
│       └── .content.xml           # Specific template (inherits from parent)
└── pages/
    ├── .content.xml               # template="/content/pagerendervue3/templates"
    │   └── jcr:content
    │       └── template = "/content/pagerendervue3/templates"
    └── index/
        └── .content.xml           # No template attr (inherits from parent)
            └── jcr:content
                └── content/       # Container with child components
```

**Important:** 
- `siteCSS` and `siteJS` are defined at the **templates root** level
- Individual pages reference templates via their **parent folder** (`pages/.content.xml`)
- Individual pages do **not** have a `template` attribute - they inherit

### 3. Component Definition (.content.xml)

Components must be registered as `per:Component` to appear in the admin UI:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:per="http://www.peregrine-cms.com/jcr/cms/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="per:Component"
    jcr:title="base component"/>
```

**Note:** Adding `group=".hidden"` hides the component from the Components panel.

### 4. Dialog Definition (dialog.json)

Enables content editing in the admin UI:

```json
{
  "fields": [{
    "type": "texteditor",
    "label": "Text",
    "model": "text",
    "rows": 10,
    "placeholder": "Enter text content"
  }]
}
```

The `model` field name must match:
- The JCR property name
- The Sling Model `@Inject` field
- The Vue component's expected prop

### 5. Vue Component Registration

Components are compiled to IIFE format and registered globally:

**Build output (pagerendervue3-components-base.js):**
```javascript
var cmpPagerendervue3ComponentsBase = (function(vue) {
  // Component definition
  return { /* component options */ }
})(Vue);
```

**Registration in peregrineApp.js:**
```javascript
function loadComponent(name) {
  const globalVarName = componentNameToGlobalVar(name);
  const component = window[globalVarName];
  if (component) {
    app.component(name, component);
  }
}
```

### 6. Page Data Flow

1. **Server-side:** HTL template renders initial HTML with JSON data in `#perPage` element
2. **Client-side:** `peregrineApp.js` parses JSON and creates reactive state
3. **Vue mounting:** App mounts with page data, components render recursively

```html
<script id="perPage" type="application/json">
  {"component":"pagerendervue3-structure-page","children":[...]}
</script>
```

```javascript
function loadContentFrom(elementId, path) {
  const element = document.getElementById(elementId);
  const data = JSON.parse(element.textContent);
  pageState.page = data;  // Reactive update triggers re-render
}
```

### 7. Dynamic Component Resolution

Container components render children dynamically:

```vue
<template v-for="child in model.children" :key="child.path">
  <component 
    :is="getComponentName(child.component)" 
    :model="child"
  />
</template>

<script setup>
function getComponentName(resourceType) {
  if (!resourceType) return 'div'
  // "pagerendervue3/components/base" → "pagerendervue3-components-base"
  return resourceType.replace(/\//g, '-').toLowerCase()
}
</script>
```

### 8. Edit Mode & Placeholders

Placeholders provide drop targets in edit mode:

```vue
<template>
  <div 
    v-if="isVisible"
    class="per-drop-target"
    :data-per-path="model.path"
    data-per-droptarget="true"
    :data-per-location="model.location"
  >
    {{ displayLabel }}
  </div>
</template>
```

**Visibility logic:**
- Check `window.parent.$perAdminApp` for admin iframe context
- Listen for `edit-preview` events from admin
- Show placeholders only in edit mode

**Label format:**
- Extract last part of component name: `"pagerendervue3-structure-container".split('-').pop()` → `"container"`
- Append location: `"container start"` / `"container end"`

## CSS Architecture

Base styles provide Bootstrap-like typography:

```css
/* Base Typography */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...;
  font-size: 1rem;
  line-height: 1.5;
  color: #212529;
}

/* Placeholder Styles */
.per-drop-target {
  border: 1px dashed #c0c0c0;
  background: #f8f8f8e0;
  ...
}

/* Edit Support */
#peregrine-app [data-per-inline] {
  white-space: pre-wrap;
}
```

## Build Process

### Maven Build

```bash
mvn clean install -PautoInstallPackage
```

Phases:
1. `core/` - Compiles Java, creates OSGi bundle
2. `ui.apps/` - Runs `npm install` and `npm run build`, creates content package
3. Deploys to Sling via `autoInstallPackage` profile

### Vue SFC Compilation

```bash
node buildvue3.js pagerendervue3
```

Process:
1. Find all `.vue` files in `/apps/pagerendervue3/`
2. Compile each to IIFE format using Rollup + @vitejs/plugin-vue
3. Output to `/etc/felibs/pagerendervue3/js/`
4. Extract CSS to `/etc/felibs/pagerendervue3/css/`

## Comparison with Vue 2 Renderer

| Aspect | Vue 2 | Vue 3 |
|--------|-------|-------|
| Component API | Options API | Composition API (`<script setup>`) |
| Reactivity | `Object.defineProperty` | `Proxy` |
| App Creation | `new Vue()` | `createApp()` |
| Context Access | `this.$root` | `inject('peregrineApp')` |
| Component Format | Global `Vue.component()` | App-scoped `app.component()` |
| Default CSS | Bootstrap | Minimal (Bootstrap-like typography) |

## Troubleshooting

### Content not displaying
- Check Sling Model has `@Exporter` annotation
- Verify `resourceType` matches in Model and component
- Check browser console for JSON data in `#perPage`

### Components not in admin panel
- Remove `group=".hidden"` from `.content.xml`
- Ensure `jcr:primaryType="per:Component"`

### CSS not loading
- Check `siteCSS` is defined in `templates/.content.xml` (not in individual pages)
- Verify CSS file exists in `/etc/felibs/`

### Placeholder shows wrong name
- Check `componentLabel` computed property splits on both `-` and `/`
- Browser cache may need clearing
