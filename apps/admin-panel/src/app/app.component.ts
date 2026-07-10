import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { CurrentConfigService } from './cms/current-config.service';
import { ThemeService } from './@services/theme.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet *ngIf="isLoaded"></router-outlet>',
})
export class AppComponent implements OnInit {
  isDarkMode = false;
  isCollapsed = false;
  isLoaded = false;

  constructor(
    public translate: TranslateService,
    private currentConfigService: CurrentConfigService,
    private router: Router,
    private themeService: ThemeService
  ) {
    translate.use(localStorage.getItem('lang') ?? 'fr');
  }

  ngOnInit(): void {
    this.themeService.updateTheme();
    this.loadConfiguration();
  }

  async loadConfiguration() {
    // NOTE (Kasi): the admin-panel used to lazy-load the Google Maps JS SDK
    // here using `adminPanelAPIKey`, blocking `isLoaded` until Google's
    // `initMap` callback fired. Since the 2026-07-01 decision to migrate to
    // Mapbox GL JS (see KASI_DECISIONS.md), maps are loaded independently by
    // `NgxMapboxGLModule` (see shared.module.ts) and no longer need this
    // app-bootstrap script injection. Keeping it would: (a) make an
    // unnecessary network call to Google's CDN on every load, and (b) risk
    // hanging the whole app (the `*ngIf="isLoaded"` router-outlet never
    // renders) if that call fails or is blocked, since `adminPanelAPIKey` in
    // this environment actually holds a Mapbox token, not a Google key.
    const currentConfig = await this.currentConfigService.getConfig();
    if (currentConfig.currentConfiguration.firebaseProjectPrivateKey == null) {
      this.router.navigateByUrl('config');
    }
    this.isLoaded = true;
  }
}
