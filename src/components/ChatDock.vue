<!-- ChatDock.vue -->
<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'

/**
 * Emits:
 *  - send: (text: string) => void
 *  - upload-files: (files: File[]) => void
 *  - upload-images: (files: File[]) => void
 */
const emit = defineEmits(['send', 'upload-files', 'upload-images'])

/**
 * Props:
 *  - busy: disable inputs while sending
 *  - placeholder: input placeholder
 *  - autofocus: auto focus textarea on mount
 *  - maxLength: optional max chars
 */
const props = defineProps({
  busy: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Say something in English…' },
  autofocus: { type: Boolean, default: true },
  maxLength: { type: Number, default: 0 }
})

/* Refs */
const taRef = ref(null)
const text = ref('')

/* Rows strategy */
const MIN_ROWS = 1
const MAX_ROWS = 8

function autoResize() {
  const ta = taRef.value
  if (!ta) return
  // Reset height to measure
  ta.style.height = 'auto'
  // Compute max height by line-height
  const lineHeight = parseFloat(getComputedStyle(ta).lineHeight || '20')
  const maxH = lineHeight * MAX_ROWS
  // Clamp height
  ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px'
  // Toggle scrollable class only when exceeding max
  if (ta.scrollHeight > maxH) {
    ta.classList.add('is-scrollable')
  } else {
    ta.classList.remove('is-scrollable')
  }
}

function onInput() {
  // Optional: enforce maxLength on the fly
  if (props.maxLength > 0 && text.value.length > props.maxLength) {
    text.value = text.value.slice(0, props.maxLength)
  }
  autoResize()
}

function onKeydown(e) {
  // Enter to send; Shift+Enter to newline
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    doSend()
  }
}

async function doSend() {
  if (props.busy) return
  const msg = text.value.trim()
  if (!msg) return
  emit('send', msg)
  text.value = ''
  await nextTick()
  autoResize()
}

/* Upload placeholders (optional UI hooks) */
const fileInputRef = ref(null)
const imgInputRef = ref(null)
function openFilePicker() { fileInputRef.value?.click() }
function onPickFiles(e) { emit('upload-files', Array.from(e.target.files || [])) }
function onPickImages(e) { emit('upload-images', Array.from(e.target.files || [])) }

/* Auto focus & auto resize on mount / busy changes */
onMounted(async () => {
  await nextTick()
  if (props.autofocus) taRef.value?.focus()
  autoResize()
})

watch(() => props.busy, async () => {
  // If busy ended and textarea is empty, re-focus for faster input
  if (!props.busy && !text.value) {
    await nextTick()
    taRef.value?.focus()
  }
})
</script>

<template>
  <div class="chat-dock" role="form" aria-label="Chat input area">
    <!-- Optional tools (hidden by default, keep hooks) -->
    <!--
    <div class="dock-tools">
      <button class="tool-btn" title="Upload Files" @click="openFilePicker" :disabled="busy">📎</button>
      <input ref="fileInputRef" type="file" multiple class="hidden-input" @change="onPickFiles" />
      <input ref="imgInputRef" type="file" accept="image/*" multiple class="hidden-input" @change="onPickImages" />
    </div>
    -->

    <div class="dock-editor">
      <textarea
        ref="taRef"
        v-model="text"
        :rows="MIN_ROWS"
        class="dock-textarea"
        :placeholder="placeholder"
        :maxlength="maxLength > 0 ? maxLength : undefined"
        :disabled="busy"
        @input="onInput"
        @keydown="onKeydown"
        aria-label="Type your message"
      />
      <button
        class="send-btn"
        :disabled="busy || !text.trim()"
        @click="doSend"
        aria-label="Send message"
        title="Press Enter to send (Shift+Enter for newline)"
      >
        <svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-dock{
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-rows: auto;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #eee;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 10px rgba(0,0,0,.04);
}

/* Optional tools row */
.dock-tools{ display:flex; align-items:center; gap:8px; }
.tool-btn{
  width: 30px; height: 30px;
  display:inline-flex; align-items:center; justify-content:center;
  border:1px solid #e5e7eb; border-radius:999px; background:#fff; cursor:pointer;
}
.tool-btn:hover{ background:#f7f7f7; }
.hidden-input{ display:none; }

/* Editor row */
.dock-editor{
  display: grid;
  grid-template-columns: minmax(0,1fr) max-content;
  gap: 6px;
  align-items: end;
  min-width: 0;
}

/* Textarea */
.dock-textarea{
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  resize: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;

  font: inherit;
  font-size: 12px;
  line-height: 1.4;

  padding: 6px 8px;
  background: #fff;

  /* No scrollbar by default */
  overflow-y: hidden;

  /* Stable gutter; show thumb on hover only when scrollable */
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

/* Allow scroll only when exceeding max height */
.dock-textarea.is-scrollable{
  overflow-y: auto;
}

/* Focus */
.dock-textarea:focus{
  outline: none;
  border-color: #cbd5e1;
  box-shadow: 0 0 0 3px #e5e7eb;
}

/* WebKit scrollbar cosmetics */
.dock-textarea::-webkit-scrollbar{ width: 8px; height: 8px; }
.dock-textarea::-webkit-scrollbar-thumb{
  background: transparent;
  border-radius: 4px;
}
.dock-textarea::-webkit-scrollbar-track{ background: transparent; }
.dock-textarea:hover{ scrollbar-color: rgba(0,0,0,.25) transparent; }
.dock-textarea:hover::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.25); }

/* Send button */
.send-btn{
  height: 28px;
  width: 28px;
  border-radius: 50%;
  border: 1px solid #111;
  background: #111;
  color: #fff;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.send-btn:disabled{ opacity:.45; cursor:not-allowed; }
.send-btn .icon{
  width: 12px;
  height: 12px;
  display: block;
}
</style>
