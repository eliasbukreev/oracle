<script setup lang="ts">
import type { TarotCard, TarotResponse } from "~/types/oracle";
import { positionLabel } from "~/types/oracle";

const props = defineProps<{
  result: TarotResponse;
}>();

const emit = defineEmits<{
  reset: [];
}>();

function cardAt(position: string): TarotCard | undefined {
  return props.result.cards.find((card) => card.position === position);
}

function variantName(key: "a" | "b"): string {
  return (
    props.result.variants?.[key] ?? (key === "a" ? "Вариант А" : "Вариант Б")
  );
}

function label(position: string): string {
  return positionLabel(props.result.spread, position);
}
</script>

<template>
  <div aria-live="polite" aria-label="Итог расклада: крест выбора">
    <div class="mb-4 text-center">
      <span
        class="text-caption font-semibold tracking-overline text-brass uppercase"
        >Выбор сделан звёздами</span
      >
    </div>

    <div class="mx-auto mb-5 grid max-w-[420px] grid-cols-3 gap-2.5">
      <span aria-hidden="true" />
      <figure class="m-0 text-center">
        <TarotCardImage
          v-if="cardAt('outcomeA')"
          :src="cardAt('outcomeA')?.imageUrl ?? ''"
          :back-src="result.backImageUrl"
          :alt="cardAt('outcomeA')?.name ?? ''"
          :reversed="cardAt('outcomeA')?.orientation === 'reversed'"
        />
        <figcaption class="mt-1 text-caption text-soft">
          {{ label("outcomeA") }}
        </figcaption>
      </figure>
      <span aria-hidden="true" />

      <figure class="m-0 text-center">
        <TarotCardImage
          v-if="cardAt('optionA')"
          :src="cardAt('optionA')?.imageUrl ?? ''"
          :back-src="result.backImageUrl"
          :alt="cardAt('optionA')?.name ?? ''"
          :reversed="cardAt('optionA')?.orientation === 'reversed'"
        />
        <figcaption class="mt-1 text-caption text-soft">
          {{ variantName("a") }}
        </figcaption>
      </figure>
      <figure class="m-0 text-center">
        <TarotCardImage
          v-if="cardAt('core')"
          :src="cardAt('core')?.imageUrl ?? ''"
          :back-src="result.backImageUrl"
          :alt="cardAt('core')?.name ?? ''"
          :reversed="cardAt('core')?.orientation === 'reversed'"
        />
        <figcaption class="mt-1 text-caption text-brass">
          {{ label("core") }}
        </figcaption>
      </figure>
      <figure class="m-0 text-center">
        <TarotCardImage
          v-if="cardAt('optionB')"
          :src="cardAt('optionB')?.imageUrl ?? ''"
          :back-src="result.backImageUrl"
          :alt="cardAt('optionB')?.name ?? ''"
          :reversed="cardAt('optionB')?.orientation === 'reversed'"
        />
        <figcaption class="mt-1 text-caption text-soft">
          {{ variantName("b") }}
        </figcaption>
      </figure>

      <span aria-hidden="true" />
      <figure class="m-0 text-center">
        <TarotCardImage
          v-if="cardAt('outcomeB')"
          :src="cardAt('outcomeB')?.imageUrl ?? ''"
          :back-src="result.backImageUrl"
          :alt="cardAt('outcomeB')?.name ?? ''"
          :reversed="cardAt('outcomeB')?.orientation === 'reversed'"
        />
        <figcaption class="mt-1 text-caption text-soft">
          {{ label("outcomeB") }}
        </figcaption>
      </figure>
      <span aria-hidden="true" />
    </div>

    <div
      class="flex gap-2.5 border border-edge bg-black/20 p-4 text-note leading-[1.55] text-soft"
    >
      <Icon
        name="i-game-icons-triquetra"
        class="shrink-0 text-brass"
        aria-hidden="true"
      />
      <p class="font-display m-0 text-lead leading-[1.5]">{{ result.summary }}</p>
    </div>

    <button
      type="button"
      class="mt-5 flex min-h-13 w-full cursor-pointer items-center justify-center gap-2.25 border border-brass-line bg-edge-faint px-5 py-3.5 text-caption font-semibold tracking-overline text-brass uppercase transition-colors duration-200 hover:bg-brass hover:text-ink"
      @click="emit('reset')"
    >
      <span>Новый вопрос</span>
      <Icon
        name="i-game-icons-infinity"
        class="text-[18px] leading-none"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
