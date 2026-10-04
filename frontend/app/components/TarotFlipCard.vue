<script setup lang="ts">
import { motion, useReducedMotion } from "motion-v";
import backUrl from "~/assets/img/CardBacks.webp?url";

const props = withDefaults(
  defineProps<{
    /** URL лицевой стороны из R2. Пусто = показать имя вместо картинки. */
    src: string;
    /** URL рубашки. По умолчанию — бандловая. */
    backSrc?: string;
    alt: string;
    reversed?: boolean;
  }>(),
  {
    backSrc: backUrl,
  },
);

const reduceMotion = useReducedMotion();
const faceLoaded = ref(false);
const faceFailed = ref(false);
const turned = ref(false);

let flipTimer: ReturnType<typeof setTimeout> | null = null;

const showFaceImg = computed(() => props.src && !faceFailed.value);

onMounted(() => {
  if (reduceMotion.value) {
    // Без анимации — сразу лицо, иначе рубашка зависнет навсегда.
    turned.value = true;
    return;
  }

  flipTimer = setTimeout(() => {
    turned.value = true;
  }, 450);
});

onUnmounted(() => {
  if (flipTimer !== null) clearTimeout(flipTimer);
  flipTimer = null;
});
</script>

<template>
  <div class="m-0 mb-3 w-full [perspective:1200px]">
    <motion.div
      :animate="{ rotateY: turned ? 180 : 0 }"
      :transition="{ duration: 0.8, ease: 'easeInOut' }"
      class="relative aspect-[300/527] w-full transform-3d"
    >
      <!-- Рубашка -->
      <div
        class="absolute inset-0 overflow-hidden border border-brass-line/70 bg-black/30 shadow-card [backface-visibility:hidden]"
      >
        <img
          :src="backSrc"
          alt=""
          aria-hidden="true"
          decoding="async"
          class="h-full w-full object-cover opacity-60"
        >
      </div>

      <!-- Лицо: предповёрнуто на 180, выезжает флипом -->
      <div
        class="absolute inset-0 overflow-hidden border border-brass-line/70 bg-raise shadow-card [backface-visibility:hidden] [transform:rotateY(180deg)]"
      >
        <img
          v-if="showFaceImg"
          :src="src"
          :alt="alt"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition-opacity duration-500"
          :class="[
            reversed ? 'rotate-180' : '',
            faceLoaded ? 'opacity-100' : 'opacity-0',
          ]"
          @load="faceLoaded = true"
          @error="faceFailed = true"
        >
        <div
          v-else
          class="font-display grid h-full place-items-center p-4 text-center text-lead text-paper"
        >
          {{ alt }}
        </div>
      </div>
    </motion.div>
  </div>
</template>
