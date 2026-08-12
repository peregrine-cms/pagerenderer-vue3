<!--
  Peregrine CMS - Vue 3 Page Renderer
  Base Component
  
  A minimal base component that other components can use as a pattern.
  Supports extraclasses for custom styling (per-hero, per-card, per-feature-card, etc.)
-->
<template>
  <div 
    :class="computedClasses"
    :data-per-path="model.path"
  >
    <!-- Content with inline editing support -->
    <div 
      v-if="hasContent"
      v-html="displayText"
      :data-per-inline="'model.text'"
    />
    
    <!-- Empty state (edit mode only) -->
    <div v-else-if="isEditMode" class="per-empty-state">
      No content defined
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true,
    default: () => ({ path: '', text: '', extraclasses: '' })
  }
})

const peregrineApp = inject('peregrineApp', null)

const isEditMode = computed(() => {
  return peregrineApp?.isAuthorMode?.() ?? false
})

const displayText = computed(() => {
  return props.model.text || ''
})

const hasContent = computed(() => {
  return props.model.text && props.model.text.trim() !== ''
})

// Use extraclasses if provided, otherwise fall back to per-base
const computedClasses = computed(() => {
  if (props.model.extraclasses) {
    return props.model.extraclasses
  }
  return 'per-base'
})
</script>

<style>
/* Default base styling - only applied when no extraclasses are set */
.per-base {
  position: relative;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--radius-md, 8px);
  padding: var(--spacing-lg, 1.5rem);
  margin-bottom: var(--spacing-lg, 1.5rem);
}

.per-empty-state {
  padding: 1rem;
  color: #999;
  font-style: italic;
  text-align: center;
  border: 1px dashed #ccc;
  background: #f8f8f8;
  border-radius: 4px;
}
</style>
