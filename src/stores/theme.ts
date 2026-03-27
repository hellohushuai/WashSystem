import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeName = 'blue' | 'dark' | 'green'

const THEME_STORAGE_KEY = 'dc-theme'

export const useThemeStore = defineStore('theme', () => {
  const current = ref<ThemeName>(
    (localStorage.getItem(THEME_STORAGE_KEY) as ThemeName) || 'blue'
  )

  function setTheme(theme: ThemeName) {
    current.value = theme
  }

  watch(current, (val) => {
    localStorage.setItem(THEME_STORAGE_KEY, val)
    const html = document.documentElement
    html.className = `theme-${val}`
    if (val === 'dark') {
      html.classList.add('dark')
    }
  }, { immediate: true })

  return { current, setTheme }
})