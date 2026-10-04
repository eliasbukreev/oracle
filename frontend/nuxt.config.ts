import tailwindcss from "@tailwindcss/vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const defaultBaseURL =
  process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : "/";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-15",
  modules: ["@nuxt/eslint", "@nuxt/icon", "@nuxt/fonts", "@vueuse/nuxt", "motion-v/nuxt"],
  css: ["~/assets/css/main.css"],
  fonts: {
    families: [
      {
        name: "Cormorant Garamond",
        provider: "google",
        weights: [400, 500, 600],
        styles: ["normal", "italic"],
        subsets: ["cyrillic", "latin"],
      },
      {
        name: "Manrope",
        provider: "google",
        weights: [400, 500, 600],
        styles: ["normal"],
        subsets: ["cyrillic", "latin"],
      },
    ],
  },
  icon: {
    serverBundle: "local",
    clientBundle: {
      scan: true,
    },
  },
  runtimeConfig: {
    public: {
      oracleApiUrl: process.env.NUXT_PUBLIC_ORACLE_API_URL || "",
    },
  },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || defaultBaseURL,
    head: {
      htmlAttrs: { lang: "ru" },
      title: "Оракул — расклад Таро из трёх карт",
      link: [
        { rel: "icon", type: "image/x-icon", href: "favicon.ico" },
        { rel: "canonical", href: "https://eliasbukreev.github.io/oracle/" },
      ],
      meta: [
        {
          name: "description",
          content:
            "Задайте вопрос и получите мистический расклад из трёх карт Таро: прошлое, настоящее, будущее.",
        },
        { name: "theme-color", content: "#0b0b14" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Оракул" },
        {
          property: "og:title",
          content: "Оракул — расклад Таро из трёх карт",
        },
        {
          property: "og:description",
          content:
            "Задайте вопрос и получите мистический расклад из трёх карт Таро: прошлое, настоящее, будущее.",
        },
        {
          property: "og:url",
          content: "https://eliasbukreev.github.io/oracle/",
        },
        {
          property: "og:image",
          content: "https://fivemanarmy.s3.cloud.ru/tarot/CardBacks.webp",
        },
        {
          property: "og:image:alt",
          content: "Рубашка колоды Таро",
        },
        { property: "og:image:type", content: "image/webp" },
        { property: "og:image:width", content: "300" },
        { property: "og:image:height", content: "527" },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: "Оракул — расклад Таро из трёх карт",
        },
        {
          name: "twitter:description",
          content:
            "Задайте вопрос и получите мистический расклад из трёх карт Таро: прошлое, настоящее, будущее.",
        },
        {
          name: "twitter:image",
          content: "https://fivemanarmy.s3.cloud.ru/tarot/CardBacks.webp",
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
