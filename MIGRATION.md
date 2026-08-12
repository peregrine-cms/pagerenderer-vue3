# Migrating from Vue 2 to Vue 3 Page Renderer

This guide covers migrating Peregrine CMS themes from the Vue 2 page renderer (`pagerendervue`) to the Vue 3 page renderer (`pagerendervue3`).

## Quick Migration Checklist

1. Update `sling:resourceSuperType` from `pagerendervue/structure/page` to `pagerendervue3/structure/page`
2. Update `siteJS` to use `pagerendervue3` library
3. Convert components from Options API to Composition API (optional but recommended)
4. Replace `this.$root` access with `inject('peregrineApp')`
5. Remove filters (use computed properties instead)

## Step-by-Step Migration

### 1. Update Theme's Resource Super Type

**Before (Vue 2):**
```xml
<!-- /apps/mytheme/components/page/.content.xml -->
<jcr:root 
  sling:resourceSuperType="pagerendervue/structure/page"
  .../>
```

**After (Vue 3):**
```xml
<jcr:root 
  sling:resourceSuperType="pagerendervue3/structure/page"
  .../>
```

### 2. Update Template Configuration

**Before:**
```json
{
  "siteJS": [
    "/etc/felibs/pagerendervue.js",
    "/etc/felibs/mytheme.js"
  ]
}
```

**After:**
```json
{
  "siteJS": [
    "/etc/felibs/pagerendervue3.js",
    "/etc/felibs/mytheme.js"
  ]
}
```

### 3. Migrate Components

**Before (Vue 2 Options API):**
```vue
<template>
  <div :data-per-path="model.path">
    <div v-html="model.text"></div>
  </div>
</template>

<script>
export default {
  props: ['model'],
  computed: {
    isEditMode() {
      return $peregrineApp.isAuthorMode()
    }
  }
}
</script>
```

**After (Vue 3 Composition API):**
```vue
<template>
  <div :data-per-path="model.path">
    <div v-html="model.text"></div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  model: { type: Object, required: true }
})

const peregrineApp = inject('peregrineApp')

const isEditMode = computed(() => {
  return peregrineApp?.isAuthorMode() ?? false
})
</script>
```

## Key Differences

| Vue 2 | Vue 3 |
|-------|-------|
| `new Vue()` | `createApp()` |
| `Vue.component()` | `app.component()` |
| `this.$root` | `inject('peregrineApp')` |
| `this.model` | `props.model` |
| Options API | Composition API |
| Filters | Computed properties |

## Breaking Changes

1. **Filters removed** - Use computed properties or methods
2. **Event bus removed** - Use provide/inject or external library
3. **`$on`, `$off`, `$emit` on instance** - Use external event emitter
4. **`Vue.set()` / `Vue.delete()`** - Direct assignment works with Proxy

## Resources

- [Vue 3 Migration Guide](https://v3-migration.vuejs.org/)
- [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)
