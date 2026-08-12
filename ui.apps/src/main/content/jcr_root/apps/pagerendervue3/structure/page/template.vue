<!--
  Peregrine CMS - Vue 3 Page Renderer
  Page Structure Component
  
  This is the root component that wraps all page content.
-->
<template>
  <div class="per-page" :data-per-path="model.path">
    <!-- Empty page placeholder (edit mode only) -->
    <pagerendervue3-components-placeholder 
      v-if="isEditMode && isEmpty"
      :model="{ path: model.path, component: 'Drop components here', location: 'into' }"
    />
    
    <!-- Child components -->
    <template v-for="child in model.children" :key="child.path">
      <component 
        :is="getComponentName(child.component)" 
        :model="child"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, inject, provide } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true,
    default: () => ({ path: '', children: [] })
  }
})

// Inject the Peregrine app context
const peregrineApp = inject('peregrineApp', null)

// Provide page context to descendants
provide('pageModel', props.model)

// Computed properties
const isEditMode = computed(() => {
  return peregrineApp?.isAuthorMode?.() ?? false
})

const isEmpty = computed(() => {
  return !props.model.children || props.model.children.length === 0
})

// Convert sling:resourceType to Vue component name
function getComponentName(resourceType) {
  if (!resourceType) return 'div'
  return resourceType.replace(/\//g, '-').toLowerCase()
}
</script>

<style>
.per-page {
  min-height: 100vh;
  padding: var(--spacing-xl, 2rem);
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .per-page {
    padding: var(--spacing-md, 1rem);
  }
}
</style>
