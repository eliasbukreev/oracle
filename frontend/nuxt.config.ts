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
      title: "Oracle",
      meta: [
        {
          name: "description",
          content: "Задайте вопрос и узнайте, что говорит Оракул.",
        },
        { name: "theme-color", content: "#120d24" },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
