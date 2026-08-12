<!--
  Peregrine CMS - Vue 3 Page Renderer
  Container Structure Component
  
  A generic container that can hold child components.
  Supports extraclasses for custom layouts (per-grid, per-container--styled, etc.)
-->
<template>
  <div 
    class="per-container"
    :data-per-path="model.path"
  >
    <!-- Before placeholder (edit mode) - full width, outside grid -->
    <pagerendervue3-components-placeholder 
      v-if="isEditMode && hasChildren"
      :model="{ path: model.path, component: componentLabel, location: 'before' }"
    />
    
    <!-- Empty container placeholder -->
    <pagerendervue3-components-placeholder 
      v-if="isEditMode && !hasChildren"
      :model="{ path: model.path, component: 'Drop components here', location: 'into' }"
    />
    
    <!-- Inner container for children - this gets the extraclasses (grid, etc.) -->
    <div v-if="hasChildren" :class="model.extraclasses || ''">
      <template v-for="child in model.children" :key="child.path">
        <component 
          :is="getComponentName(child.component)" 
          :model="child"
        />
      </template>
    </div>
    
    <!-- After placeholder (edit mode) - full width, outside grid -->
    <pagerendervue3-components-placeholder 
      v-if="isEditMode && hasChildren"
      :model="{ path: model.path, component: componentLabel, location: 'after' }"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true,
    default: () => ({ path: '', children: [], component: '', extraclasses: '' })
  }
})

const peregrineApp = inject('peregrineApp', null)

const isEditMode = computed(() => {
  return peregrineApp?.isAuthorMode?.() ?? false
})

const hasChildren = computed(() => {
  return props.model.children && props.model.children.length > 0
})

const componentLabel = computed(() => {
  if (!props.model.component) return 'container'
  // Component name comes as 'pagerendervue3-structure-container' (dashes) 
  // or 'pagerendervue3/structure/container' (slashes)
  // Extract just the last part
  const parts = props.model.component.split(/[-\/]/)
  return parts[parts.length - 1] || 'container'
})

function getComponentName(resourceType) {
  if (!resourceType) return 'div'
  return resourceType.replace(/\//g, '-').toLowerCase()
}
</script>

<style>
.per-container {
  position: relative;
  margin-bottom: var(--spacing-lg, 1.5rem);
}
</style>
