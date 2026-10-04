<script setup lang="ts">
import { motion } from 'motion-v'
import {
  WHISPER_SPOTS,
  phaseForElapsed,
  pickSpot,
  pickWhisper,
} from '~/services/loadingWhispers'

interface ActiveWhisper {
  key: number
  text: string
  spot: number
}

const MAX_WHISPERS = 3

const elapsed = ref(0)
const whispers = ref<ActiveWhisper[]>([])
let whisperKey = 0
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let whisperTimer: ReturnType<typeof setInterval> | null = null

const phase = computed(() => phaseForElapsed(elapsed.value))

function pushWhisper() {
  const shown = whispers.value.map((w) => w.text)
  const taken = whispers.value.map((w) => w.spot)
  const next = [...whispers.value.slice(-(MAX_WHISPERS - 1))]

  next.push({
    key: whisperKey++,
    text: pickWhisper(shown),
    spot: pickSpot(taken),
  })
  whispers.value = next
}

function spotStyle(index: number) {
  const spot = WHISPER_SPOTS[index] ?? WHISPER_SPOTS[0]
  return {
    top: spot?.top,
    left: spot?.left,
    transform: `rotate(${spot?.rotate ?? "0deg"})`,
  }
}

onMounted(() => {
  pushWhisper()
  elapsedTimer = setInterval(() => {
    elapsed.value += 1
  }, 1000)
  whisperTimer = setInterval(pushWhisper, 2800)
})

onUnmounted(() => {
  if (elapsedTimer !== null) clearInterval(elapsedTimer)
  if (whisperTimer !== null) clearInterval(whisperTimer)
  elapsedTimer = null
  whisperTimer = null
})
</script>

<template>
  <div class="relative py-10 text-center" role="status" aria-label="Расклад готовится">
    <!-- Шёпоты по периферии: декоративные, скринридер их не читает.
         Слой выше колоды, чтобы текст никогда не обрезался. -->
    <div class="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
      <AnimatePresence>
        <motion.p
          v-for="whisper in whispers"
          :key="whisper.key"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="{ duration: 1.2, ease: 'easeOut' }"
          :style="spotStyle(whisper.spot)"
          class="font-display absolute m-0 max-w-[150px] text-note text-muted/70 italic"
        >
          {{ whisper.text }}
        </motion.p>
      </AnimatePresence>
    </div>

    <!-- Тасующаяся колода: CSS-рубашки, картинок не надо -->
    <div class="relative z-[1] flex items-start justify-center gap-3" aria-hidden="true">
      <motion.div
        v-for="i in 3"
        :key="i"
        :animate="{ rotate: [0, -5, 4, 0], y: [0, -8, 0] }"
        :transition="{ duration: 3.5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }"
        class="w-20 border border-brass-line/70 bg-raise p-1.5 shadow-card"
      >
        <div class="grid aspect-[300/527] place-items-center border border-edge-inner/60">
          <Icon name="i-game-icons-triquetra" class="text-xl text-brass/70" />
        </div>
      </motion.div>
    </div>

    <p class="font-display relative z-[1] m-0 mt-6 text-lead text-paper italic" aria-live="polite">
      {{ phase }}
    </p>
  </div>
</template>
