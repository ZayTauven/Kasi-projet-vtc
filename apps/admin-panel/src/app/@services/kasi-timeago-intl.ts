import { Injectable, OnDestroy } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { IL10nsStrings, TimeagoIntl } from "ngx-timeago";
import { Subscription } from "rxjs";

/**
 * Libelles francais des dates relatives (pipe `timeago`).
 *
 * Le paquet expose bien `ngx-timeago/language-strings/fr`, mais ce jeu est
 * incomplet (pas de `week`/`weeks`, ce qui degrade "2 semaines" en "environ 14
 * jours") et prefixe tout d'un "environ" superflu. On garde donc nos propres
 * chaines, alignees sur le ton du panel.
 */
const TIMEAGO_FR: IL10nsStrings = {
  prefixAgo: "il y a",
  prefixFromNow: "dans",
  seconds: "moins d'une minute",
  minute: "une minute",
  minutes: "%d minutes",
  hour: "une heure",
  hours: "%d heures",
  day: "un jour",
  days: "%d jours",
  week: "une semaine",
  weeks: "%d semaines",
  month: "un mois",
  months: "%d mois",
  year: "un an",
  years: "%d ans",
};

/** Jeu anglais (conserve pour la bascule de langue du panel). */
const TIMEAGO_EN: IL10nsStrings = {
  suffixAgo: "ago",
  suffixFromNow: "from now",
  seconds: "less than a minute",
  minute: "about a minute",
  minutes: "%d minutes",
  hour: "about an hour",
  hours: "about %d hours",
  day: "a day",
  days: "%d days",
  week: "a week",
  weeks: "%d weeks",
  month: "about a month",
  months: "%d months",
  year: "about a year",
  years: "%d years",
};

/**
 * Pose la locale du pipe `timeago` globalement, et la resynchronise a chaque
 * changement de langue. Sans ce fournisseur, ngx-timeago utilise
 * `TimeagoDefaultFormatter`, qui ignore totalement `TimeagoIntl` et rend
 * toujours l'anglais ("2 weeks ago") au milieu d'une interface francaise.
 */
@Injectable()
export class KasiTimeagoIntl extends TimeagoIntl implements OnDestroy {
  private readonly langSubscription: Subscription;

  constructor(translate: TranslateService) {
    super();
    this.applyLanguage(
      translate.currentLang ?? localStorage.getItem("lang") ?? "fr",
    );
    this.langSubscription = translate.onLangChange.subscribe((event) =>
      this.applyLanguage(event.lang),
    );
  }

  ngOnDestroy(): void {
    this.langSubscription.unsubscribe();
  }

  private applyLanguage(lang: string): void {
    this.strings = lang === "fr" ? TIMEAGO_FR : TIMEAGO_EN;
    this.changes.next();
  }
}
