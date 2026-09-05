const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const defaultBaseURL = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || defaultBaseURL,
    head: {
      title: 'Oracle',
      meta: [
        { name: 'description', content: 'Задайте вопрос и узнайте, что говорит Оракул.' },
        { name: 'theme-color', content: '#120d24' },
      ],
    },
  },
})
