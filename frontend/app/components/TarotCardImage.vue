<script setup lang="ts">
const props = defineProps<{
  /** URL лицевой стороны из R2. Пусто = хранилище не настроено. */
  src: string;
  /** URL рубашки. Пусто = нет даже рубашки. */
  backSrc: string;
  alt: string;
  reversed?: boolean;
}>();

const loaded = ref(false);
const failed = ref(false);

const showFace = computed(() => props.src && !failed.value);
</script>

<template>
  <figure
    v-if="src || backSrc"
    class="m-0 mb-3 aspect-[300/527] w-full overflow-hidden rounded-card border border-edge-soft/14 bg-black/30"
  >
    <!-- Рубашка: видна пока лицо грузится или если оно не загрузилось -->
    <img
      v-if="backSrc && (!loaded || !showFace)"
      :src="backSrc"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover opacity-60"
    >
    <img
      v-if="showFace"
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover transition-opacity duration-500"
      :class="[
        reversed ? 'rotate-180' : '',
        loaded ? 'opacity-100' : 'opacity-0',
      ]"
      @load="loaded = true"
      @error="failed = true"
    >
  </figure>
</template>
