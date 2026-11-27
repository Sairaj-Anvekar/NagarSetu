<script setup>
import {
  ADMIN_DEPARTMENT,
  TRIAGE_CATEGORIES,
  isTeamMove,
} from '../../constants/triageCategories'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  predictedCategory: {
    type: String,
    default: '',
  },
  adminDepartment: {
    type: String,
    default: ADMIN_DEPARTMENT,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

function handleSelect(category) {
  if (props.disabled) return
  emit('update:modelValue', category)
}
</script>

<template>
  <div
    class="ns-category-picker"
    role="radiogroup"
    aria-label="Correct grievance category"
  >
    <div
      v-for="item in TRIAGE_CATEGORIES"
      :key="item.category"
      class="ns-category-option"
      :class="{
        'ns-category-option--selected': modelValue === item.category,
        'ns-category-option--disabled': disabled,
      }"
      role="radio"
      :aria-checked="modelValue === item.category"
      :aria-disabled="disabled"
      tabindex="0"
      @click="handleSelect(item.category)"
      @keydown.enter.prevent="handleSelect(item.category)"
      @keydown.space.prevent="handleSelect(item.category)"
    >
      <div class="ns-category-option__radio">
        <span
          class="ns-radio-dot"
          :class="{ 'ns-radio-dot--checked': modelValue === item.category }"
        ></span>
      </div>

      <div class="ns-category-option__content">
        <span class="ns-category-option__name">{{ item.category }}</span>
        <span class="ns-category-option__dept">{{ item.department }}</span>
      </div>

      <div class="ns-category-option__badge-wrap">
        <span
          v-if="!isTeamMove(item.category, adminDepartment)"
          class="ns-team-chip ns-team-chip--own"
        >
          Your team
        </span>
        <span v-else class="ns-team-chip ns-team-chip--move">
          Moves team
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-category-picker {
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-8, 8px);
}

.ns-category-option {
  display: flex;
  align-items: center;
  gap: var(--ns-space-12, 12px);
  min-height: 48px;
  padding: 10px 14px;
  border-radius: var(--ns-radius-control, 10px);
  border: 1.5px solid var(--ns-line, #D5DEE7);
  background-color: var(--ns-paper, #FFFFFF);
  cursor: pointer;
  user-select: none;
  transition: all var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-category-option:hover:not(.ns-category-option--disabled) {
  background-color: var(--ns-surface-2, #F8FAFC);
  border-color: #94A3B8;
}

.ns-category-option:focus-visible {
  outline: 2px solid var(--ns-teal-600, #0B7285) !important;
  outline-offset: var(--ns-focus-ring-offset, 2px);
}

.ns-category-option--selected {
  border-color: var(--ns-teal-600, #0B7285);
  background-color: #EFF8FA;
}

.ns-category-option--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ns-category-option__radio {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #94A3B8;
  background-color: #FFFFFF;
}

.ns-category-option--selected .ns-category-option__radio {
  border-color: #0B7285;
}

.ns-radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: transparent;
}

.ns-radio-dot--checked {
  background-color: #0B7285;
}

.ns-category-option__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.ns-category-option__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ns-ink, #0E2233);
  line-height: 1.3;
}

.ns-category-option__dept {
  font-size: 12px;
  color: var(--ns-slate, #5B6B7A);
  line-height: 1.3;
}

.ns-category-option__badge-wrap {
  flex-shrink: 0;
}

.ns-team-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 8px;
  border-radius: var(--ns-radius-pill, 999px);
}

.ns-team-chip--own {
  background-color: #D8F1F3;
  color: #0B6A7C;
}

.ns-team-chip--move {
  background-color: #FFEDE0;
  color: #B54708;
}

@media (prefers-reduced-motion: reduce) {
  .ns-category-option {
    transition: none;
  }
}
</style>
