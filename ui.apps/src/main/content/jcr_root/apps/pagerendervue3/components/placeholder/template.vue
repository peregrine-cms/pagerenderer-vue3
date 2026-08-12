<!--
  Peregrine CMS - Vue 3 Page Renderer
  Placeholder Component

  Provides drag-and-drop targets for the page editor.
  Only visible in edit/author mode.
-->
<template>
  <div
    v-if="isVisible"
    class="per-drop-target"
    :class="[
      locationClass,
      { 'per-drop-target-empty': isEmptyTarget }
    ]"
    :data-per-path="model.path"
    data-per-droptarget="true"
    :data-per-location="model.location"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <span class="per-drop-target__icon">
      <svg v-if="model.location === 'before'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
      <svg v-else-if="model.location === 'after'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M12 8v8M8 12h8"/>
      </svg>
    </span>
    <span class="per-drop-target__label">{{ displayLabel }}</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true,
    default: () => ({ path: '', component: '', location: 'into' })
  }
})

const peregrineApp = inject('peregrineApp', null)
const isVisible = ref(false)

// Computed properties
const isEmptyTarget = computed(() => {
  return props.model.location === 'into'
})

const locationClass = computed(() => {
  return `per-drop-target--${props.model.location || 'into'}`
})

const displayLabel = computed(() => {
  // Extract just the last part of the component name
  const componentName = props.model.component || 'component'
  const baseName = componentName.split('-').pop()

  if (props.model.location === 'before') return `Add before ${baseName}`
  if (props.model.location === 'after') return `Add after ${baseName}`
  return props.model.component || 'Drop components here'
})

// Event handlers
function onDragOver(event) {
  event.dataTransfer.dropEffect = 'copy'
}

function onDrop(event) {
  // The actual drop handling is done by the admin console
}

// Check edit mode
function checkEditMode() {
  // Check iframe attribute first
  if (window.frameElement && window.frameElement.attributes['data-per-mode']) {
    if (window.frameElement.attributes['data-per-mode'].value) {
      isVisible.value = false
      return
    }
  }

  // Check if we're in the admin editor iframe
  if (window.parent && window.parent !== window) {
    const adminApp = window.parent.$perAdminApp
    if (adminApp) {
      isVisible.value = true
      return
    }
  }

  isVisible.value = false
}

// Listen for edit/preview mode changes from admin
function setupEventListener() {
  if (window.parent && window.parent.$perAdminApp && window.parent.$perAdminApp.eventBus) {
    window.parent.$perAdminApp.eventBus.$on('edit-preview', (data) => {
      isVisible.value = data !== 'preview'
    })
  }
}

onMounted(() => {
  checkEditMode()
  setupEventListener()
})
</script>

<style>
.per-drop-target {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  margin: 4px 0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: all 0.15s ease;
  cursor: pointer;
}

.per-drop-target__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.per-drop-target__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Before/After - subtle inline markers */
.per-drop-target--before,
.per-drop-target--after {
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.08), transparent);
  border: 1px dashed rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.per-drop-target--before:hover,
.per-drop-target--after:hover {
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.15), transparent);
  border-color: rgba(59, 130, 246, 0.5);
}

/* Empty container - more prominent */
.per-drop-target--into,
.per-drop-target-empty {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
  border: 2px dashed rgba(16, 185, 129, 0.4);
  color: #059669;
  min-height: 80px;
  font-size: 14px;
}

.per-drop-target--into:hover,
.per-drop-target-empty:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-color: rgba(16, 185, 129, 0.6);
}

/* Drag over state */
.per-drop-target:active,
.per-drop-target[data-dragging="true"] {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  border-style: solid;
}
</style>
