import { BrowserModule, Title } from "@angular/platform-browser";
import { LOCALE_ID, NgModule } from "@angular/core";
import {
  TranslateModule,
  TranslateLoader,
  TranslateService,
} from "@ngx-translate/core";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { registerLocaleData } from "@angular/common";
import en from "@angular/common/locales/en";
import { ServiceWorkerModule } from "@angular/service-worker";
import { environment } from "../environments/environment";
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr
} from "@angular/common/http";
import {
  ar_EG,
  de_DE,
  en_US,
  es_ES,
  fr_FR,
  hy_AM,
  ja_JP,
  ko_KR,
  NZ_DATE_LOCALE,
  NZ_I18N,
  pt_PT,
  ro_RO,
  ru_RU,
  zh_CN,
} from "ng-zorro-antd/i18n";
import { GraphQLModule } from "./graphql.module";
import { TimeagoModule } from "ngx-timeago";
import { NzIconModule } from "ng-zorro-antd/icon";
import {
  UserOutline,
  ContainerOutline,
  CustomerServiceOutline,
  GlobalOutline,
  BulbOutline,
  NotificationOutline,
  BankOutline,
  CarOutline,
  FundOutline,
  ControlOutline,
  PlusOutline,
  DashboardOutline,
  MenuFoldOutline,
  LogoutOutline,
  MenuUnfoldOutline,
  ArrowLeftOutline,
  DeleteOutline,
  PictureTwoTone,
  ExportOutline,
  InboxOutline,
  DownloadOutline,
  LockOutline,
  EyeInvisibleOutline,
  FieldTimeOutline,
  ScheduleOutline,
  FolderOpenOutline,
  AlertOutline,
  // Icônes du rail de la refonte P4 (console admin Kasi)
  PieChartOutline,
  RadarChartOutline,
  ClockCircleOutline,
  IdcardOutline,
  WalletOutline,
  CreditCardOutline,
  TagOutline,
  SoundOutline,
  GiftOutline,
  AuditOutline,
  TeamOutline,
  SettingOutline,
  EnvironmentOutline,
  AppstoreOutline,
  AppstoreAddOutline,
  DollarOutline,
  StopOutline,
  MessageOutline,
  PhoneOutline,
  StarOutline,
  SafetyCertificateOutline,
  UsergroupAddOutline,
  BellOutline,
  RightOutline,
  MenuOutline,
  EyeOutline,
  ArrowRightOutline,
  // Icônes des pages détail/view/settings (Lot 0)
  DownOutline,
  CheckOutline,
} from "@ant-design/icons-angular/icons";
import { IconDefinition } from "@ant-design/icons-angular";
import { ApolloModule } from "apollo-angular";
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

const icons: IconDefinition[] = [
  UserOutline,
  ContainerOutline,
  CustomerServiceOutline,
  GlobalOutline,
  BulbOutline,
  NotificationOutline,
  BankOutline,
  CarOutline,
  FundOutline,
  ControlOutline,
  PlusOutline,
  DashboardOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  LogoutOutline,
  ArrowLeftOutline,
  DeleteOutline,
  PictureTwoTone,
  ExportOutline,
  InboxOutline,
  DownloadOutline,
  LockOutline,
  EyeInvisibleOutline,
  FieldTimeOutline,
  ScheduleOutline,
  FolderOpenOutline,
  AlertOutline,
  PieChartOutline,
  RadarChartOutline,
  ClockCircleOutline,
  IdcardOutline,
  WalletOutline,
  CreditCardOutline,
  TagOutline,
  SoundOutline,
  GiftOutline,
  AuditOutline,
  TeamOutline,
  SettingOutline,
  EnvironmentOutline,
  AppstoreOutline,
  AppstoreAddOutline,
  DollarOutline,
  StopOutline,
  MessageOutline,
  PhoneOutline,
  StarOutline,
  SafetyCertificateOutline,
  UsergroupAddOutline,
  BellOutline,
  RightOutline,
  MenuOutline,
  EyeOutline,
  ArrowRightOutline,
  DownOutline,
  CheckOutline,
];
registerLocaleData(en);

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, "assets/i18n/", ".json");
}

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ApolloModule,
    SharedModule,
    GraphQLModule,
    NzIconModule.forRoot(icons),
    BrowserAnimationsModule,
    TranslateModule.forRoot({
      defaultLanguage: "fr",
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    // PWA/offline non utilisé par la console : le SW hérité de Ridy n'était
    // jamais réellement généré (pas de ngsw-config.json) mais restait enregistré,
    // laissant un service worker périmé servir un cache mort -> page blanche après
    // redéploiement. Désactivé. Un `ngsw-worker.js` de secours (auto-désinscription)
    // reste servi pour tuer les anciens SW encore actifs dans les navigateurs.
    ServiceWorkerModule.register("ngsw-worker.js", {
      enabled: false,
    }),
    TimeagoModule.forRoot(),
  ],
  providers: [
    {
      provide: NZ_DATE_LOCALE,
      useFactory: () => {
        const lang = localStorage.getItem("lang") ?? "fr";
        switch (lang) {
          case "en":
            return enUS;
          case "es":
            return es;
          case "fr":
            return fr;
          case "de":
            return de;
          case "ar":
            return ar;
          case "hy":
            return hy;
          case "ko":
            return ko;
          case "ru":
            return ru;
          case "zh":
            return zhCN;
          case "ja":
            return ja;
          case "pt":
            return pt;
          case "ro":
            return ro;
          default:
            return fr;
        }
      },
    },
    {
      provide: NZ_I18N,
      //useValue: en_US,
      useFactory: (localId: string) => {
        const lang = localStorage.getItem("lang") ?? "fr";
        switch (lang) {
          case "en":
            return en_US;
          case "es":
            return es_ES;
          case "fr":
            return fr_FR;
          case "de":
            return de_DE;
          case "ar":
            return ar_EG;
          case "hy":
            return hy_AM;
          case "ko":
            return ko_KR;
          case "ru":
            return ru_RU;
          case "zh":
            return zh_CN;
          case "ja":
            return ja_JP;
          case "pt":
            return pt_PT;
          case "ro":
            return ro_RO;
          default:
            return fr_FR;
        }
      },
      deps: [LOCALE_ID],
    },
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
})
export class AppModule {
  constructor(
    private title: Title,
    private translator: TranslateService,
  ) {
    translator.get("branding.page.title").subscribe((x) => {
      title.setTitle(x);
    });
  }
}
