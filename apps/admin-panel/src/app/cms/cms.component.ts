import {
  Component,
  OnInit,
  HostBinding,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy
} from "@angular/core";
import { Router, ActivatedRoute, NavigationEnd } from "@angular/router";
import { NzNotificationService } from "ng-zorro-antd/notification";
import { mainPageSwitchTransition } from "../@animations/main.animation";

import { TranslateService } from "@ngx-translate/core";
import {
  ar_EG,
  de_DE,
  en_US,
  es_ES,
  fr_FR,
  hy_AM,
  ja_JP,
  ko_KR,
  NzI18nService,
  pt_PT,
  ru_RU,
  zh_CN,
  ro_RO,
} from "ng-zorro-antd/i18n";
import {
  enUS,
  es,
  fr,
  de,
  ar,
  hy,
  ko,
  ru,
  zhCN,
  ja,
  pt,
  ro,
} from "date-fns/locale";
import {
  ComplaintSubscriptionGQL,
  NotificationsQuery,
  SosSubscriptionGQL,
} from "@kasi/admin-panel/generated/graphql";
import { filter, map, Observable, Subscription } from "rxjs";
import { ApolloClient } from "@apollo/client/core";
import { ThemeService } from "../@services/theme.service";

/** Lien de navigation simple du rail latéral. */
interface NavLink {
  labelKey: string;
  route: string;
  icon: string;
  queryParams?: Record<string, unknown>;
}

/** Groupe repliable du rail latéral. */
interface NavGroup {
  key: string;
  labelKey: string;
  icon: string;
  children: NavLink[];
}

@Component({
  selector: "app-cms",
  templateUrl: "./cms.component.html",
  styleUrls: ["./cms.component.css"],
  animations: [mainPageSwitchTransition],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CMSComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding("@mainPageSwitchTransition") state = "activated";

  /** Tiroir latéral (mobile) ouvert. */
  mobileNavOpen = false;
  /** État déplié des groupes du rail (clé -> ouvert). */
  navGroupsOpen: Record<string, boolean> = {};

  isDarkMode = false;
  stats!: Observable<ApolloClient.QueryResult<NotificationsQuery>>;
  newSos = 0;
  newComplaints = 0;
  sosSubription?: Subscription;
  complaintSubscription?: Subscription;
  private routerSub?: Subscription;

  /** Langues proposées (code -> libellé natif). */
  readonly languages: { code: string; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "it", label: "Italiano" },
    { code: "de", label: "Deutsch" },
    { code: "pt", label: "Português" },
    { code: "sv", label: "Svenska" },
    { code: "hy", label: "Հայերեն" },
    { code: "ja", label: "日本語" },
    { code: "zh", label: "中文" },
    { code: "ru", label: "русский" },
    { code: "ur", label: "اردو" },
    { code: "hi", label: "हिन्दी" },
    { code: "bn", label: "বাংলা" },
    { code: "ko", label: "한국어" },
    { code: "id", label: "Indonesian" },
    { code: "ar", label: "العربية" },
    { code: "ro", label: "Română" },
  ];

  /** Liens de tête (sans groupe). */
  readonly navTop: NavLink[] = [
    {
      labelKey: "menu.riders",
      route: "/riders",
      icon: "user",
      queryParams: { sort: "id|DESC" },
    },
    {
      labelKey: "menu.requests",
      route: "/requests",
      icon: "container",
      queryParams: { sort: "id|DESC" },
    },
    {
      labelKey: "menu.sos",
      route: "/sos",
      icon: "alert",
      queryParams: { sort: "id|DESC" },
    },
    {
      labelKey: "menu.complaints",
      route: "/complaints",
      icon: "customer-service",
      queryParams: { sort: "id|DESC" },
    },
  ];

  /** Groupes repliables. */
  readonly navGroups: NavGroup[] = [
    {
      key: "home",
      labelKey: "menu.home.header",
      icon: "dashboard",
      children: [
        {
          labelKey: "menu.home.overview",
          route: "/home/overview",
          icon: "pie-chart",
        },
        {
          labelKey: "menu.home.dispatcher",
          route: "/home/dispatcher",
          icon: "radar-chart",
        },
      ],
    },
    {
      key: "drivers",
      labelKey: "menu.driver.header",
      icon: "car",
      children: [
        {
          labelKey: "menu.driver.pendingVerification",
          route: "/drivers",
          icon: "clock-circle",
          queryParams: { filter: "status|in|PendingApproval" },
        },
        {
          labelKey: "menu.driver.all",
          route: "/drivers",
          icon: "idcard",
          queryParams: { sort: "id|DESC" },
        },
      ],
    },
    {
      key: "payouts",
      labelKey: "menu.payouts.header",
      icon: "wallet",
      children: [
        {
          labelKey: "menu.payouts.sessions",
          route: "/payouts/sessions",
          icon: "schedule",
        },
        {
          labelKey: "menu.payouts.methods",
          route: "/payouts/methods",
          icon: "credit-card",
        },
      ],
    },
    {
      key: "marketing",
      labelKey: "menu.marketing.header",
      icon: "notification",
      children: [
        {
          labelKey: "menu.marketing.coupons",
          route: "/marketing/coupons",
          icon: "tag",
        },
        {
          labelKey: "menu.marketing.giftCards",
          route: "/marketing/gift-cards",
          icon: "gift",
        },
        {
          labelKey: "menu.marketing.announcements",
          route: "/marketing/announcements",
          icon: "sound",
        },
        {
          labelKey: "menu.marketing.rewards",
          route: "/marketing/rewards",
          icon: "gift",
        },
      ],
    },
    {
      key: "accounting",
      labelKey: "menu.accounting.header",
      icon: "bank",
      children: [
        {
          labelKey: "menu.accounting.admin",
          route: "/financials/provider",
          icon: "audit",
        },
        {
          labelKey: "menu.accounting.fleets",
          route: "/financials/fleet",
          icon: "team",
        },
        {
          labelKey: "menu.accounting.drivers",
          route: "/financials/driver",
          icon: "car",
        },
        {
          labelKey: "menu.accounting.riders",
          route: "/financials/rider",
          icon: "user",
        },
      ],
    },
    {
      key: "management",
      labelKey: "menu.management.header",
      icon: "setting",
      children: [
        {
          labelKey: "menu.management.regions",
          route: "/management/regions",
          icon: "environment",
        },
        {
          labelKey: "menu.management.services",
          route: "/management/services",
          icon: "appstore",
        },
        {
          labelKey: "menu.management.serviceOptions",
          route: "/management/service-options",
          icon: "appstore-add",
        },
        {
          labelKey: "menu.management.fleets",
          route: "/management/fleets",
          icon: "team",
        },
        {
          labelKey: "menu.management.zonePrices",
          route: "/management/zone-prices",
          icon: "dollar",
        },
        {
          labelKey: "menu.management.orderCancelReasons",
          route: "/management/order-cancel-reasons",
          icon: "stop",
        },
        {
          labelKey: "menu.management.smsProviders",
          route: "/management/sms-providers",
          icon: "message",
        },
        {
          labelKey: "menu.management.emailProviders",
          route: "/management/email-providers",
          icon: "mail",
        },
        {
          labelKey: "menu.management.callMaskingProviders",
          route: "/management/call-masking-providers",
          icon: "phone",
        },
        {
          labelKey: "menu.management.shiftRules",
          route: "/management/shift-rules",
          icon: "clock-circle",
        },
        {
          labelKey: "menu.management.retention",
          route: "/management/retention",
          icon: "file-protect",
        },
        {
          labelKey: "menu.management.mapSettings",
          route: "/management/map-settings",
          icon: "environment",
        },
        {
          labelKey: "menu.management.reviewParameters",
          route: "/management/review-parameters",
          icon: "star",
        },
        {
          labelKey: "menu.management.cars",
          route: "/management/cars",
          icon: "car",
        },
        {
          labelKey: "menu.management.userRoles",
          route: "/management/user-roles",
          icon: "safety-certificate",
        },
        {
          labelKey: "menu.management.users",
          route: "/management/users",
          icon: "usergroup-add",
        },
        {
          labelKey: "menu.management.paymentGateways",
          route: "/management/payment-gateways",
          icon: "credit-card",
        },
        {
          labelKey: "menu.management.settings",
          route: "/management/settings",
          icon: "setting",
        },
      ],
    },
  ];

  /** Groupes affichés en tête du rail (avant les liens plats). */
  get navGroupsTop(): NavGroup[] {
    return this.navGroups.filter(
      (g) => g.key === "home" || g.key === "drivers",
    );
  }

  /** Groupes affichés après les liens plats (opérations & configuration). */
  get navGroupsBottom(): NavGroup[] {
    return this.navGroups.filter((g) => !["home", "drivers"].includes(g.key));
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private notification: NzNotificationService,
    private sosSub: SosSubscriptionGQL,
    private complaintSub: ComplaintSubscriptionGQL,
    private translate: TranslateService,
    private i18n: NzI18nService,
    public themeService: ThemeService,
  ) {}

  ngAfterViewInit(): void {
    this.sosSubription = this.sosSub.subscribe().subscribe((data) => {
      const sos = data.data?.sosCreated;
      if (sos == null) return;
      this.newSos += 1;
      this.playNotificationSound();
      this.notification.error("SOS", "A SOS has been made.", {
        nzKey: "sos",
      });
    });
    this.complaintSubscription = this.complaintSub
      .subscribe()
      .subscribe((data) => {
        const complaint = data.data?.complaintCreated;
        if (complaint == null) return;
        this.newComplaints += 1;
        this.playNotificationSound();
        this.notification.error("Complaint", "A Complaint has been made.", {
          nzDuration: 0,
          nzKey: "complaint",
        });
      });
  }

  ngOnDestroy(): void {
    this.sosSubription?.unsubscribe();
    this.complaintSubscription?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  playNotificationSound() {
    const audio = new Audio();
    audio.src = "/assets/sounds/notification.mp3";
    audio.load();
    audio.play();
  }

  ngOnInit(): void {
    this.stats = this.route.data.pipe(map((data) => data.notifications));

    // Déplie d'emblée le groupe contenant la route active, referme le tiroir
    // mobile à chaque navigation.
    this.syncOpenGroups(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.syncOpenGroups(e.urlAfterRedirects);
        this.mobileNavOpen = false;
      });
  }

  /** Ouvre le groupe dont un enfant correspond à l'URL courante. */
  private syncOpenGroups(url: string): void {
    for (const group of this.navGroups) {
      const active = group.children.some((c) => url.startsWith(c.route));
      if (active) this.navGroupsOpen[group.key] = true;
    }
  }

  toggleGroup(key: string): void {
    this.navGroupsOpen[key] = !this.navGroupsOpen[key];
  }

  logout() {
    localStorage.removeItem("kasi_admin_token");
    this.router.navigate(["login"], { relativeTo: this.route.root });
    window.location.reload();
  }

  changeLanguage(language: string): void {
    this.translate.use(language);
    localStorage.setItem("lang", language);
    switch (language) {
      case "en":
        this.i18n.setLocale(en_US);
        this.i18n.setDateLocale(enUS);
        break;
      case "es":
        this.i18n.setLocale(es_ES);
        this.i18n.setDateLocale(es);
        break;
      case "fr":
        this.i18n.setLocale(fr_FR);
        this.i18n.setDateLocale(fr);
        break;
      case "de":
        this.i18n.setLocale(de_DE);
        this.i18n.setDateLocale(de);
        break;
      case "ar":
        this.i18n.setLocale(ar_EG);
        this.i18n.setDateLocale(ar);
        break;
      case "hy":
        this.i18n.setLocale(hy_AM);
        this.i18n.setDateLocale(hy);
        break;
      case "ko":
        this.i18n.setLocale(ko_KR);
        this.i18n.setDateLocale(ko);
        break;
      case "ru":
        this.i18n.setLocale(ru_RU);
        this.i18n.setDateLocale(ru);
        break;
      case "zh":
        this.i18n.setLocale(zh_CN);
        this.i18n.setDateLocale(zhCN);
        break;
      case "ja":
        this.i18n.setLocale(ja_JP);
        this.i18n.setDateLocale(ja);
        break;

      case "pt":
        this.i18n.setLocale(pt_PT);
        this.i18n.setDateLocale(pt);
        break;

      case "ro":
        this.i18n.setLocale(ro_RO);
        this.i18n.setDateLocale(ro);
        break;
    }
  }
}
