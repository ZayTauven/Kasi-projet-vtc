import { Injectable } from '@angular/core';

/**
 * Pilote le thème clair/sombre de la console Kasi.
 *
 * - Par défaut « suit le système » (prefers-color-scheme) tant que l'utilisateur
 *   n'a pas basculé manuellement ; le choix manuel est mémorisé (`kasi_theme`).
 * - Pose/retire la classe `.dark` sur <html> — pilote à la fois les variables CSS
 *   de marque et les variantes Tailwind `dark:` (darkMode: 'class').
 * - Échange en parallèle le CSS stock ng-zorro (thème light/dark d'Ant Design).
 *
 * NB : un script inline dans index.html pose déjà `.dark` avant le premier rendu
 * pour éviter le flash ; ce service garde l'état synchronisé côté application.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDarkMode!: boolean;

  private static readonly STORAGE_KEY = 'kasi_theme';
  private static readonly ZORRO_LINK_ID = 'kasi-zorro-theme';

  constructor() {
    const saved = localStorage.getItem(ThemeService.STORAGE_KEY);
    this.isDarkMode = saved
      ? saved === 'dark'
      : window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  switchTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(
      ThemeService.STORAGE_KEY,
      this.isDarkMode ? 'dark' : 'light'
    );
    this.updateTheme();
  }

  updateTheme(): void {
    // 1. Classe sur <html> pour les variables CSS de marque + Tailwind dark:.
    document.documentElement.classList.toggle('dark', this.isDarkMode);

    // 2. CSS stock ng-zorro (Ant Design) — un seul <link> réutilisé.
    const href = this.isDarkMode
      ? '/assets/themes/ng-zorro-antd.dark.min.css'
      : '/assets/themes/ng-zorro-antd.min.css';
    const head = document.head || document.getElementsByTagName('head')[0];
    let link = document.getElementById(
      ThemeService.ZORRO_LINK_ID
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = ThemeService.ZORRO_LINK_ID;
      link.type = 'text/css';
      link.rel = 'stylesheet';
      head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
    }
  }
}
