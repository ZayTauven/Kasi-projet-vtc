import 'package:client_shared/config.dart';
import 'package:country_codes/country_codes.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lifecycle/lifecycle.dart';
import 'package:kasi_rider/chat/chat_view.dart';
import 'package:kasi_rider/location_selection/location_selection_parent_view.dart';
import 'package:kasi_rider/location_selection/welcome_card/location_history_item.dart';
import 'package:kasi_rider/login/firebase_auth_repository.dart';
import 'package:kasi_rider/login/phone_auth_repository.dart';
import 'package:kasi_rider/monitoring/crashlytics_error_reporter.dart';
import 'package:kasi_rider/security/firebase_app_integrity_checker.dart';
import 'package:kasi_rider/login/login_page.dart';
import 'package:kasi_rider/main/bloc/jwt_cubit.dart';
import 'package:kasi_rider/main/bloc/last_orders_cubit.dart';
import 'package:kasi_rider/main/bloc/rider_profile_cubit.dart';
import 'package:kasi_rider/onboarding/onboarding_view.dart';
import 'package:kasi_rider/settings/settings_page.dart';
import 'address/address_list_view.dart';
import 'announcements/announcements_list_view.dart';
import 'firebase_options.dart';
import 'history/trip_history_list_view.dart';
import 'main/bloc/current_location_cubit.dart';
import 'main/bloc/main_bloc.dart';
import 'main/graphql_provider.dart';
import 'profile/profile_view.dart';
import 'reservations/reservation_list_view.dart';
import 'package:client_shared/theme/theme.dart';
import 'wallet/wallet_view.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:geolocator/geolocator.dart';

// ignore: avoid_void_async
void main() async {
  await initHiveForFlutter();
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  await FirebaseAppIntegrityChecker().activate();
  FlutterError.onError = CrashlyticsErrorReporter().fatalErrorHandler;
  Hive.registerAdapter(LocationHistoryItemAdapter());
  await Hive.openBox<List<LocationHistoryItem>>("history2");
  await Hive.openBox("user");
  await Hive.openBox('settings');
  if (!kIsWeb) {
    await CountryCodes.init();
    final locale = CountryCodes.detailsForLocale();
    if (locale.dialCode != null) {
      defaultCountryCode = locale.dialCode!;
    }
  }
  await Geolocator.requestPermission();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<PhoneAuthRepository>(
            create: (context) => FirebasePhoneAuthRepository()),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(create: (context) => MainBloc()),
          BlocProvider(create: (context) => CurrentLocationCubit()),
          BlocProvider(create: (context) => RiderProfileCubit()),
          BlocProvider(create: (context) => JWTCubit()),
          BlocProvider(create: (context) => LastOrdersCubit())
        ],
        child: MyGraphqlProvider(
          child: ValueListenableBuilder<Box>(
              valueListenable: Hive.box('settings')
                  .listenable(keys: ['language', 'onboarding']),
              builder: (context, box, snapshot) {
                return MaterialApp(
                  debugShowCheckedModeBanner: false,
                  navigatorObservers: [defaultLifecycleObserver],
                  localizationsDelegates: S.localizationsDelegates,
                  supportedLocales: S.supportedLocales,
                  locale: Locale(box.get('language') ?? 'fr'),
                  routes: {
                    'login': (context) => const LoginView(),
                    'addresses': (context) => const AddressListView(),
                    'announcements': (context) => const AnnouncementsListView(),
                    'history': (context) => const TripHistoryListView(),
                    'wallet': (context) => const WalletView(),
                    'chat': (context) => const ChatView(),
                    'reserves': (context) => const ReservationListView(),
                    'settings': (context) => const SettingsPage(),
                    'profile': (context) => BlocProvider.value(
                          value: context.read<RiderProfileCubit>(),
                          child: BlocProvider.value(
                            value: context.read<JWTCubit>(),
                            child: const ProfileView(),
                          ),
                        )
                  },
                  theme: CustomTheme.theme1,
                  home: box.get('onboarding', defaultValue: 0) > 0
                      ? const LocationSelectionParentView()
                      : OnBoardingView(),
                );
              }),
        ),
      ),
    );
  }
}
