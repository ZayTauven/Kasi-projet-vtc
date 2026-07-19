import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'messages_am.dart';
import 'messages_ar.dart';
import 'messages_bn.dart';
import 'messages_de.dart';
import 'messages_en.dart';
import 'messages_es.dart';
import 'messages_fa.dart';
import 'messages_fr.dart';
import 'messages_hi.dart';
import 'messages_hy.dart';
import 'messages_id.dart';
import 'messages_it.dart';
import 'messages_ja.dart';
import 'messages_ko.dart';
import 'messages_om.dart';
import 'messages_pt.dart';
import 'messages_ro.dart';
import 'messages_ru.dart';
import 'messages_sv.dart';
import 'messages_ur.dart';
import 'messages_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of S
/// returned by `S.of(context)`.
///
/// Applications need to include `S.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/messages.dart';
///
/// return MaterialApp(
///   localizationsDelegates: S.localizationsDelegates,
///   supportedLocales: S.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the S.supportedLocales
/// property.
abstract class S {
  S(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static S of(BuildContext context) {
    return Localizations.of<S>(context, S)!;
  }

  static const LocalizationsDelegate<S> delegate = _SDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('am'),
    Locale('ar'),
    Locale('bn'),
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fa'),
    Locale('fr'),
    Locale('hi'),
    Locale('hy'),
    Locale('id'),
    Locale('it'),
    Locale('ja'),
    Locale('ko'),
    Locale('om'),
    Locale('pt'),
    Locale('ro'),
    Locale('ru'),
    Locale('sv'),
    Locale('ur'),
    Locale('zh')
  ];

  /// No description provided for @ride_safety_title.
  ///
  /// In en, this message translates to:
  /// **'Ride Safety'**
  String get ride_safety_title;

  /// No description provided for @ride_safety_share_trip_information.
  ///
  /// In en, this message translates to:
  /// **'Share trip information'**
  String get ride_safety_share_trip_information;

  /// No description provided for @ride_safety_sos.
  ///
  /// In en, this message translates to:
  /// **'SOS'**
  String get ride_safety_sos;

  /// No description provided for @ride_safety_report_problem.
  ///
  /// In en, this message translates to:
  /// **'Report a problem'**
  String get ride_safety_report_problem;

  /// No description provided for @sos_title.
  ///
  /// In en, this message translates to:
  /// **'Distress Signal'**
  String get sos_title;

  /// No description provided for @sos_body.
  ///
  /// In en, this message translates to:
  /// **'Distress signals are for emergencies and contacting authorities, such as the police or law enforcement. Please use the distress signal in the event that you experience an emergency and require immediate assistance.'**
  String get sos_body;

  /// No description provided for @sos_sent_alert.
  ///
  /// In en, this message translates to:
  /// **'SOS is sent'**
  String get sos_sent_alert;

  /// No description provided for @sos_ok_action.
  ///
  /// In en, this message translates to:
  /// **'It\'s an emergency'**
  String get sos_ok_action;

  /// No description provided for @share_trip_text_locations.
  ///
  /// In en, this message translates to:
  /// **'I am on my way to {destination} from {pickup}.'**
  String share_trip_text_locations(Object destination, Object pickup);

  /// No description provided for @share_trip_text_client.
  ///
  /// In en, this message translates to:
  /// **' My client is {firstName} {lastName}, the mobile number is +{mobileNumber}.'**
  String share_trip_text_client(
      Object firstName, Object lastName, Object mobileNumber);

  /// No description provided for @statusOffline.
  ///
  /// In en, this message translates to:
  /// **'Go Online'**
  String get statusOffline;

  /// No description provided for @statusOnline.
  ///
  /// In en, this message translates to:
  /// **'Go Offline'**
  String get statusOnline;

  /// No description provided for @message_notification_permission_title.
  ///
  /// In en, this message translates to:
  /// **'Notification Permission'**
  String get message_notification_permission_title;

  /// No description provided for @message_notification_permission_denined_message.
  ///
  /// In en, this message translates to:
  /// **'Notification permission was denied previously. In order to get new order notifications, you can enable the permission from app settings.'**
  String get message_notification_permission_denined_message;

  /// No description provided for @action_ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get action_ok;

  /// No description provided for @menu_logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get menu_logout;

  /// No description provided for @menu_about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get menu_about;

  /// No description provided for @menu_wallet.
  ///
  /// In en, this message translates to:
  /// **'Wallet'**
  String get menu_wallet;

  /// No description provided for @menu_trip_history.
  ///
  /// In en, this message translates to:
  /// **'Trip History'**
  String get menu_trip_history;

  /// No description provided for @menu_announcements.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get menu_announcements;

  /// No description provided for @message_unknown_error.
  ///
  /// In en, this message translates to:
  /// **'Unknown error'**
  String get message_unknown_error;

  /// No description provided for @title_success.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get title_success;

  /// No description provided for @driver_register_profile_submitted_message.
  ///
  /// In en, this message translates to:
  /// **'Your profile is submitted for admin approval. You can check back later to see the status of your submission.'**
  String get driver_register_profile_submitted_message;

  /// No description provided for @driver_registration_approved_demo_mode.
  ///
  /// In en, this message translates to:
  /// **'Typically, at this point, the administrator would have to review and approve the driver\'s submission through the Admin Panel. However, for the purpose of this demonstration, your profile has been automatically approved and is now ready for use.'**
  String get driver_registration_approved_demo_mode;

  /// No description provided for @title_important.
  ///
  /// In en, this message translates to:
  /// **'IMPORTANT!'**
  String get title_important;

  /// No description provided for @cell_number.
  ///
  /// In en, this message translates to:
  /// **'Cell Number'**
  String get cell_number;

  /// No description provided for @phone_number_empty.
  ///
  /// In en, this message translates to:
  /// **'Please enter the phone number'**
  String get phone_number_empty;

  /// No description provided for @driver_registration_step_verify_number_title.
  ///
  /// In en, this message translates to:
  /// **'Verify Number'**
  String get driver_registration_step_verify_number_title;

  /// No description provided for @driver_register_verification_code_textfield_hint.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get driver_register_verification_code_textfield_hint;

  /// No description provided for @driver_register_contact_details_title.
  ///
  /// In en, this message translates to:
  /// **'Contact Details'**
  String get driver_register_contact_details_title;

  /// No description provided for @firstname.
  ///
  /// In en, this message translates to:
  /// **'First Name'**
  String get firstname;

  /// No description provided for @lastname.
  ///
  /// In en, this message translates to:
  /// **'Last Name'**
  String get lastname;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'E-Mail'**
  String get email;

  /// No description provided for @certificate_number.
  ///
  /// In en, this message translates to:
  /// **'Certificate Number'**
  String get certificate_number;

  /// No description provided for @gender.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get gender;

  /// No description provided for @gender_male.
  ///
  /// In en, this message translates to:
  /// **'Male'**
  String get gender_male;

  /// No description provided for @gender_female.
  ///
  /// In en, this message translates to:
  /// **'Female'**
  String get gender_female;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get address;

  /// No description provided for @driver_register_ride_details_step_title.
  ///
  /// In en, this message translates to:
  /// **'Ride Details'**
  String get driver_register_ride_details_step_title;

  /// No description provided for @plate_number.
  ///
  /// In en, this message translates to:
  /// **'Plate Number'**
  String get plate_number;

  /// No description provided for @car_production_year.
  ///
  /// In en, this message translates to:
  /// **'Production Year'**
  String get car_production_year;

  /// No description provided for @car_model.
  ///
  /// In en, this message translates to:
  /// **'Car Model'**
  String get car_model;

  /// No description provided for @car_color.
  ///
  /// In en, this message translates to:
  /// **'Car Color'**
  String get car_color;

  /// No description provided for @driver_register_step_payout_details_title.
  ///
  /// In en, this message translates to:
  /// **'Payout Details'**
  String get driver_register_step_payout_details_title;

  /// No description provided for @bank_name.
  ///
  /// In en, this message translates to:
  /// **'Bank Name'**
  String get bank_name;

  /// No description provided for @account_number.
  ///
  /// In en, this message translates to:
  /// **'Account Number'**
  String get account_number;

  /// No description provided for @bank_swift.
  ///
  /// In en, this message translates to:
  /// **'Swift Code'**
  String get bank_swift;

  /// No description provided for @bankRoutingNumber.
  ///
  /// In en, this message translates to:
  /// **'Bank Routing Number'**
  String get bankRoutingNumber;

  /// No description provided for @driver_register_step_documents_title.
  ///
  /// In en, this message translates to:
  /// **'Upload Documents'**
  String get driver_register_step_documents_title;

  /// No description provided for @driver_register_step_documents_heading.
  ///
  /// In en, this message translates to:
  /// **'In order to verify above documents, we require below documents being uploaded'**
  String get driver_register_step_documents_heading;

  /// No description provided for @driver_register_document_first.
  ///
  /// In en, this message translates to:
  /// **'1-ID'**
  String get driver_register_document_first;

  /// No description provided for @driver_register_document_second.
  ///
  /// In en, this message translates to:
  /// **'2-Driver\'s License'**
  String get driver_register_document_second;

  /// No description provided for @driver_register_document_third.
  ///
  /// In en, this message translates to:
  /// **'3-Vehicle Registration'**
  String get driver_register_document_third;

  /// No description provided for @action_upload_document.
  ///
  /// In en, this message translates to:
  /// **'Upload Document'**
  String get action_upload_document;

  /// No description provided for @trip_history_empty_state.
  ///
  /// In en, this message translates to:
  /// **'No past order has been recorded.'**
  String get trip_history_empty_state;

  /// No description provided for @wallet_empty_state_message.
  ///
  /// In en, this message translates to:
  /// **'No history recorded.'**
  String get wallet_empty_state_message;

  /// No description provided for @enum_unknown.
  ///
  /// In en, this message translates to:
  /// **'Unkonwn'**
  String get enum_unknown;

  /// No description provided for @top_up_sheet_pay_button.
  ///
  /// In en, this message translates to:
  /// **'Pay'**
  String get top_up_sheet_pay_button;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'LOADING'**
  String get loading;

  /// No description provided for @available_order_action_accept.
  ///
  /// In en, this message translates to:
  /// **'Accept Order'**
  String get available_order_action_accept;

  /// No description provided for @order_status_action_received_cash.
  ///
  /// In en, this message translates to:
  /// **'Cash Payment received'**
  String get order_status_action_received_cash;

  /// No description provided for @action_cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get action_cancel;

  /// No description provided for @order_status_action_navigate.
  ///
  /// In en, this message translates to:
  /// **'Navigate'**
  String get order_status_action_navigate;

  /// No description provided for @order_status_action_arrived.
  ///
  /// In en, this message translates to:
  /// **'Arrived to pickup location'**
  String get order_status_action_arrived;

  /// No description provided for @order_status_action_start.
  ///
  /// In en, this message translates to:
  /// **'Start Trip'**
  String get order_status_action_start;

  /// No description provided for @order_status_action_finished.
  ///
  /// In en, this message translates to:
  /// **'Finish'**
  String get order_status_action_finished;

  /// No description provided for @swipe_to_confirm_arrival.
  ///
  /// In en, this message translates to:
  /// **'Swipe to confirm arrival'**
  String get swipe_to_confirm_arrival;

  /// No description provided for @swipe_to_start.
  ///
  /// In en, this message translates to:
  /// **'Swipe to start the trip'**
  String get swipe_to_start;

  /// No description provided for @swipe_to_finish.
  ///
  /// In en, this message translates to:
  /// **'Swipe to finish'**
  String get swipe_to_finish;

  /// No description provided for @swipe_to_next_stop.
  ///
  /// In en, this message translates to:
  /// **'Swipe for next stop'**
  String get swipe_to_next_stop;

  /// No description provided for @ride_late_badge.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get ride_late_badge;

  /// No description provided for @message_cant_open_url.
  ///
  /// In en, this message translates to:
  /// **'Command is not supported'**
  String get message_cant_open_url;

  /// No description provided for @enum_driver_recharge_type_bank_transfer.
  ///
  /// In en, this message translates to:
  /// **'Bank Transfer'**
  String get enum_driver_recharge_type_bank_transfer;

  /// No description provided for @enum_driver_recharge_type_gift.
  ///
  /// In en, this message translates to:
  /// **'Gift'**
  String get enum_driver_recharge_type_gift;

  /// No description provided for @enum_driver_recharge_type_in_app_payment.
  ///
  /// In en, this message translates to:
  /// **'In-App Payment'**
  String get enum_driver_recharge_type_in_app_payment;

  /// No description provided for @enum_driver_recharge_transaction_type_order_fee.
  ///
  /// In en, this message translates to:
  /// **'Order Fee'**
  String get enum_driver_recharge_transaction_type_order_fee;

  /// No description provided for @enum_driver_deduct_transaction_type_withdraw.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get enum_driver_deduct_transaction_type_withdraw;

  /// No description provided for @enum_driver_deduct_transaction_type_correction.
  ///
  /// In en, this message translates to:
  /// **'Correction'**
  String get enum_driver_deduct_transaction_type_correction;

  /// No description provided for @enum_driver_deduct_transaction_type_commission.
  ///
  /// In en, this message translates to:
  /// **'Commission'**
  String get enum_driver_deduct_transaction_type_commission;

  /// No description provided for @copyright_notice.
  ///
  /// In en, this message translates to:
  /// **'Copyright © {company}, All rights reserved.'**
  String copyright_notice(Object company);

  /// No description provided for @wallet_activities_heading.
  ///
  /// In en, this message translates to:
  /// **'Activities'**
  String get wallet_activities_heading;

  /// No description provided for @form_required_field_error.
  ///
  /// In en, this message translates to:
  /// **'Required field'**
  String get form_required_field_error;

  /// No description provided for @button_report_issue.
  ///
  /// In en, this message translates to:
  /// **'Report an issue'**
  String get button_report_issue;

  /// No description provided for @issue_submit_title.
  ///
  /// In en, this message translates to:
  /// **'Report an issue'**
  String get issue_submit_title;

  /// No description provided for @issue_subject_placeholder.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get issue_subject_placeholder;

  /// No description provided for @error_field_cant_be_empty.
  ///
  /// In en, this message translates to:
  /// **'Can not be empty'**
  String get error_field_cant_be_empty;

  /// No description provided for @issue_description_placeholder.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get issue_description_placeholder;

  /// No description provided for @complaint_submit_success_message.
  ///
  /// In en, this message translates to:
  /// **'Complaint is submitted. Please wait for a contact from our support representative about your inquiry.'**
  String get complaint_submit_success_message;

  /// No description provided for @menu_earnings.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get menu_earnings;

  /// No description provided for @status_offline_description.
  ///
  /// In en, this message translates to:
  /// **'Get online to see requests'**
  String get status_offline_description;

  /// No description provided for @status_online_description.
  ///
  /// In en, this message translates to:
  /// **'Searching for ride'**
  String get status_online_description;

  /// No description provided for @order_status_card_title_driver_accepted.
  ///
  /// In en, this message translates to:
  /// **'Client will be notified once you tap Arrived'**
  String get order_status_card_title_driver_accepted;

  /// No description provided for @order_status_card_title_arrived.
  ///
  /// In en, this message translates to:
  /// **'Client has been notified'**
  String get order_status_card_title_arrived;

  /// No description provided for @order_status_card_title_started.
  ///
  /// In en, this message translates to:
  /// **'Heading to the destination'**
  String get order_status_card_title_started;

  /// No description provided for @navigation_dialog_title.
  ///
  /// In en, this message translates to:
  /// **'Choose an app to navigate with'**
  String get navigation_dialog_title;

  /// No description provided for @action_ride_options.
  ///
  /// In en, this message translates to:
  /// **'Ride Options'**
  String get action_ride_options;

  /// No description provided for @rider_expected_time_past.
  ///
  /// In en, this message translates to:
  /// **'Client expected you {minutes} mins ago'**
  String rider_expected_time_past(Object minutes);

  /// No description provided for @rider_expected_time_future.
  ///
  /// In en, this message translates to:
  /// **'Client expects you in {minutes} mins'**
  String rider_expected_time_future(Object minutes);

  /// No description provided for @order_payment_status_unpaid.
  ///
  /// In en, this message translates to:
  /// **'Ride hasn\'t been paid yet'**
  String get order_payment_status_unpaid;

  /// No description provided for @order_payment_status_paid.
  ///
  /// In en, this message translates to:
  /// **'Ride Has been paid'**
  String get order_payment_status_paid;

  /// No description provided for @action_ride_preferences.
  ///
  /// In en, this message translates to:
  /// **'Client Preferences'**
  String get action_ride_preferences;

  /// No description provided for @navigation_dialog_title_pickup_point.
  ///
  /// In en, this message translates to:
  /// **'Navigate to pickup point'**
  String get navigation_dialog_title_pickup_point;

  /// No description provided for @navigation_title_destination_point.
  ///
  /// In en, this message translates to:
  /// **'Navigate to drop off point'**
  String get navigation_title_destination_point;

  /// No description provided for @rider_options_dialog_title.
  ///
  /// In en, this message translates to:
  /// **'Ride Options'**
  String get rider_options_dialog_title;

  /// No description provided for @action_cancel_ride.
  ///
  /// In en, this message translates to:
  /// **'Cancel Ride'**
  String get action_cancel_ride;

  /// No description provided for @invoice_dialog_body.
  ///
  /// In en, this message translates to:
  /// **'You can also receive cash instead of an online payment if you and the client are both willing to.'**
  String get invoice_dialog_body;

  /// No description provided for @invoice_dialog_heading.
  ///
  /// In en, this message translates to:
  /// **'Waiting for client payment'**
  String get invoice_dialog_heading;

  /// No description provided for @invoice_dialog_title.
  ///
  /// In en, this message translates to:
  /// **'Payment Info'**
  String get invoice_dialog_title;

  /// No description provided for @invoice_item_tip.
  ///
  /// In en, this message translates to:
  /// **'Tip'**
  String get invoice_item_tip;

  /// No description provided for @invoice_item_subtotal.
  ///
  /// In en, this message translates to:
  /// **'Subtotal'**
  String get invoice_item_subtotal;

  /// No description provided for @add_credit_dialog_title.
  ///
  /// In en, this message translates to:
  /// **'Add Credit'**
  String get add_credit_dialog_title;

  /// No description provided for @add_credit_dialog_select_payment_method.
  ///
  /// In en, this message translates to:
  /// **'Select Payment Method:'**
  String get add_credit_dialog_select_payment_method;

  /// No description provided for @add_credit_dialog_choose_amount.
  ///
  /// In en, this message translates to:
  /// **'Choose amount'**
  String get add_credit_dialog_choose_amount;

  /// No description provided for @order_details_payment_method_title.
  ///
  /// In en, this message translates to:
  /// **'Payment Method'**
  String get order_details_payment_method_title;

  /// No description provided for @order_payment_method_cash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get order_payment_method_cash;

  /// No description provided for @order_payment_method_online.
  ///
  /// In en, this message translates to:
  /// **'Online'**
  String get order_payment_method_online;

  /// No description provided for @order_details_trip_information_title.
  ///
  /// In en, this message translates to:
  /// **'Trip Information'**
  String get order_details_trip_information_title;

  /// No description provided for @issue_submit_body.
  ///
  /// In en, this message translates to:
  /// **'You can report any issue you had with your ride. We will help you with the issue within a call.'**
  String get issue_submit_body;

  /// No description provided for @announcements_empty_state_title.
  ///
  /// In en, this message translates to:
  /// **'No Announcements yet!'**
  String get announcements_empty_state_title;

  /// No description provided for @announcements_empty_state_body.
  ///
  /// In en, this message translates to:
  /// **'We will notify you when new announcements comes.'**
  String get announcements_empty_state_body;

  /// No description provided for @empty_state_title_no_record.
  ///
  /// In en, this message translates to:
  /// **'No Data Found!'**
  String get empty_state_title_no_record;

  /// No description provided for @earnings_empty_state_body.
  ///
  /// In en, this message translates to:
  /// **'At the criteria set above, we can\'t find any records.'**
  String get earnings_empty_state_body;

  /// No description provided for @action_continue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get action_continue;

  /// No description provided for @terms_and_condition_first_part.
  ///
  /// In en, this message translates to:
  /// **'I have read and agree with '**
  String get terms_and_condition_first_part;

  /// No description provided for @terms_and_conditions_clickable_part.
  ///
  /// In en, this message translates to:
  /// **'Terms & Conditions'**
  String get terms_and_conditions_clickable_part;

  /// No description provided for @onboarding_welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome !'**
  String get onboarding_welcome;

  /// No description provided for @action_login_signup.
  ///
  /// In en, this message translates to:
  /// **'Login / Sign Up'**
  String get action_login_signup;

  /// No description provided for @action_complete_registration.
  ///
  /// In en, this message translates to:
  /// **'Complete registration'**
  String get action_complete_registration;

  /// No description provided for @action_edit_submission.
  ///
  /// In en, this message translates to:
  /// **'Edit submission'**
  String get action_edit_submission;

  /// No description provided for @incomplete_registration_description.
  ///
  /// In en, this message translates to:
  /// **'Please complete your \n registration submission'**
  String get incomplete_registration_description;

  /// No description provided for @pending_review_registration_description.
  ///
  /// In en, this message translates to:
  /// **'Your submission is under review, \n Thanks for your patience.'**
  String get pending_review_registration_description;

  /// No description provided for @hard_reject_registration.
  ///
  /// In en, this message translates to:
  /// **'Your Submission is fully rejected!'**
  String get hard_reject_registration;

  /// No description provided for @soft_rejection_description.
  ///
  /// In en, this message translates to:
  /// **'There is a problem with the submission'**
  String get soft_rejection_description;

  /// No description provided for @action_confirm_and_continue.
  ///
  /// In en, this message translates to:
  /// **'Confirm & Continue'**
  String get action_confirm_and_continue;

  /// No description provided for @ride_preferences_title.
  ///
  /// In en, this message translates to:
  /// **'Ride Preferences'**
  String get ride_preferences_title;

  /// No description provided for @action_back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get action_back;

  /// No description provided for @title_logout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get title_logout;

  /// No description provided for @logout_dialog_body.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to log out of the application?'**
  String get logout_dialog_body;

  /// No description provided for @action_delete_account.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get action_delete_account;

  /// No description provided for @dialog_account_deletion_title.
  ///
  /// In en, this message translates to:
  /// **'Account deletion'**
  String get dialog_account_deletion_title;

  /// No description provided for @dialog_account_deletion_body.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete your account? You can log in again within 30 days to restore the account. After this period, your data gets completely removed, including all your remaining credits.'**
  String get dialog_account_deletion_body;

  /// No description provided for @wallet_card_title.
  ///
  /// In en, this message translates to:
  /// **'{appName} Wallet'**
  String wallet_card_title(Object appName);

  /// No description provided for @order_status_canceled.
  ///
  /// In en, this message translates to:
  /// **'Canceled'**
  String get order_status_canceled;

  /// No description provided for @driver_register_title.
  ///
  /// In en, this message translates to:
  /// **'Driver Registration'**
  String get driver_register_title;

  /// No description provided for @menu_profile.
  ///
  /// In en, this message translates to:
  /// **'My profile'**
  String get menu_profile;

  /// No description provided for @profile_services_title.
  ///
  /// In en, this message translates to:
  /// **'Services:'**
  String get profile_services_title;

  /// No description provided for @profile_bank_information_title.
  ///
  /// In en, this message translates to:
  /// **'Bank Information'**
  String get profile_bank_information_title;

  /// No description provided for @profile_vehicle_information_title.
  ///
  /// In en, this message translates to:
  /// **'Vehicle Information'**
  String get profile_vehicle_information_title;

  /// No description provided for @profile_distance_traveled.
  ///
  /// In en, this message translates to:
  /// **'Distance traveled'**
  String get profile_distance_traveled;

  /// No description provided for @profile_total_trips.
  ///
  /// In en, this message translates to:
  /// **'Total trips'**
  String get profile_total_trips;

  /// No description provided for @profile_rating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get profile_rating;

  /// No description provided for @register_number_title.
  ///
  /// In en, this message translates to:
  /// **'Enter your phone number'**
  String get register_number_title;

  /// No description provided for @register_number_subtitle.
  ///
  /// In en, this message translates to:
  /// **'We will send a code to your number to continue registration'**
  String get register_number_subtitle;

  /// No description provided for @register_verify_code_title.
  ///
  /// In en, this message translates to:
  /// **'Enter code'**
  String get register_verify_code_title;

  /// No description provided for @register_verify_code_subtitle.
  ///
  /// In en, this message translates to:
  /// **'We have sent a code to {number}'**
  String register_verify_code_subtitle(Object number);

  /// No description provided for @register_contact_details_title.
  ///
  /// In en, this message translates to:
  /// **'Enter your contact details'**
  String get register_contact_details_title;

  /// No description provided for @register_payout_details_title.
  ///
  /// In en, this message translates to:
  /// **'Enter your payout details'**
  String get register_payout_details_title;

  /// No description provided for @register_ride_details_title.
  ///
  /// In en, this message translates to:
  /// **'Enter your ride details'**
  String get register_ride_details_title;

  /// No description provided for @register_profile_photo_title.
  ///
  /// In en, this message translates to:
  /// **'Upload Profile Photo'**
  String get register_profile_photo_title;

  /// No description provided for @register_profile_photo_subtitle.
  ///
  /// In en, this message translates to:
  /// **'Your face should be recognizable in the uploaded image'**
  String get register_profile_photo_subtitle;

  /// No description provided for @action_add_photo.
  ///
  /// In en, this message translates to:
  /// **'Add photo'**
  String get action_add_photo;

  /// No description provided for @register_upload_documents_title.
  ///
  /// In en, this message translates to:
  /// **'Upload required documents'**
  String get register_upload_documents_title;

  /// No description provided for @register_upload_documents_subtitle.
  ///
  /// In en, this message translates to:
  /// **'In order to verify your identity and comply with regulations we will need you to upload below documents: \n1-Photo ID\n2-Driver license\n3-Ride ownership document'**
  String get register_upload_documents_subtitle;

  /// No description provided for @register_step_phone_number.
  ///
  /// In en, this message translates to:
  /// **'Cell Number'**
  String get register_step_phone_number;

  /// No description provided for @register_step_verify_number.
  ///
  /// In en, this message translates to:
  /// **'Verify Number'**
  String get register_step_verify_number;

  /// No description provided for @register_step_contact_details.
  ///
  /// In en, this message translates to:
  /// **'Contact details'**
  String get register_step_contact_details;

  /// No description provided for @register_step_ride_details.
  ///
  /// In en, this message translates to:
  /// **'Ride details'**
  String get register_step_ride_details;

  /// No description provided for @register_step_payout_details.
  ///
  /// In en, this message translates to:
  /// **'Payout Details'**
  String get register_step_payout_details;

  /// No description provided for @register_step_upload_documents.
  ///
  /// In en, this message translates to:
  /// **'Upload Documents'**
  String get register_step_upload_documents;

  /// No description provided for @profile_uploaded_documents_title.
  ///
  /// In en, this message translates to:
  /// **'Uploaded documents'**
  String get profile_uploaded_documents_title;

  /// No description provided for @error_cancel_not_allowed.
  ///
  /// In en, this message translates to:
  /// **'Cancel is not allowed for an already started trip'**
  String get error_cancel_not_allowed;

  /// No description provided for @distanceMeters.
  ///
  /// In en, this message translates to:
  /// **'{distance} m'**
  String distanceMeters(String distance);

  /// No description provided for @distanceKm.
  ///
  /// In en, this message translates to:
  /// **'{distance} km'**
  String distanceKm(String distance);

  /// No description provided for @distanceFeet.
  ///
  /// In en, this message translates to:
  /// **'{distance} ft'**
  String distanceFeet(String distance);

  /// No description provided for @distanceMiles.
  ///
  /// In en, this message translates to:
  /// **'{distance} mi'**
  String distanceMiles(String distance);

  /// No description provided for @distanceAway.
  ///
  /// In en, this message translates to:
  /// **'{distance} away'**
  String distanceAway(String distance);

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @mapSettings.
  ///
  /// In en, this message translates to:
  /// **'Map Settings'**
  String get mapSettings;

  /// No description provided for @languageSettings.
  ///
  /// In en, this message translates to:
  /// **'Language Settings'**
  String get languageSettings;

  /// No description provided for @orderStatusCardTitleMultipleDestinations.
  ///
  /// In en, this message translates to:
  /// **'Heading to {destinationIndex}st destination'**
  String orderStatusCardTitleMultipleDestinations(int destinationIndex);

  /// No description provided for @actionArrivedToDestination.
  ///
  /// In en, this message translates to:
  /// **'Arrived to {destinationIndex}st destination'**
  String actionArrivedToDestination(int destinationIndex);

  /// No description provided for @skipVerificationDemoOnly.
  ///
  /// In en, this message translates to:
  /// **'Skip verification (Demo only)'**
  String get skipVerificationDemoOnly;

  /// No description provided for @delivery_tag.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get delivery_tag;

  /// No description provided for @package_size_small.
  ///
  /// In en, this message translates to:
  /// **'Small package'**
  String get package_size_small;

  /// No description provided for @package_size_medium.
  ///
  /// In en, this message translates to:
  /// **'Medium package'**
  String get package_size_medium;

  /// No description provided for @package_size_large.
  ///
  /// In en, this message translates to:
  /// **'Large package'**
  String get package_size_large;

  /// No description provided for @earnings_toggle_day.
  ///
  /// In en, this message translates to:
  /// **'Day'**
  String get earnings_toggle_day;

  /// No description provided for @earnings_toggle_month.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get earnings_toggle_month;

  /// No description provided for @earnings_kpi_trips.
  ///
  /// In en, this message translates to:
  /// **'Trips'**
  String get earnings_kpi_trips;

  /// No description provided for @earnings_kpi_distance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get earnings_kpi_distance;

  /// No description provided for @earnings_kpi_time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get earnings_kpi_time;

  /// No description provided for @payout_methods_title.
  ///
  /// In en, this message translates to:
  /// **'Withdrawal methods'**
  String get payout_methods_title;

  /// No description provided for @payout_info_text.
  ///
  /// In en, this message translates to:
  /// **'Your earnings are paid out to you periodically by Kasi on the method you choose.'**
  String get payout_info_text;

  /// No description provided for @payout_account_number_label.
  ///
  /// In en, this message translates to:
  /// **'Account number'**
  String get payout_account_number_label;

  /// No description provided for @payout_account_number_hint.
  ///
  /// In en, this message translates to:
  /// **'Phone number (Wave / Orange Money) or bank account'**
  String get payout_account_number_hint;

  /// No description provided for @payout_save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get payout_save;

  /// No description provided for @payout_saved_message.
  ///
  /// In en, this message translates to:
  /// **'Withdrawal method saved'**
  String get payout_saved_message;

  /// No description provided for @payout_minimum_amount.
  ///
  /// In en, this message translates to:
  /// **'Minimum: {amount}'**
  String payout_minimum_amount(Object amount);

  /// No description provided for @payout_history_title.
  ///
  /// In en, this message translates to:
  /// **'Latest payouts'**
  String get payout_history_title;

  /// No description provided for @payout_status_paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get payout_status_paid;

  /// No description provided for @payout_status_pending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get payout_status_pending;

  /// No description provided for @payout_status_canceled.
  ///
  /// In en, this message translates to:
  /// **'Canceled'**
  String get payout_status_canceled;

  /// No description provided for @payout_method_wave.
  ///
  /// In en, this message translates to:
  /// **'Wave'**
  String get payout_method_wave;

  /// No description provided for @payout_method_orange_money.
  ///
  /// In en, this message translates to:
  /// **'Orange Money'**
  String get payout_method_orange_money;

  /// No description provided for @payout_method_bank_transfer.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer'**
  String get payout_method_bank_transfer;

  /// No description provided for @payout_method_cash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get payout_method_cash;

  /// No description provided for @shift_rule_banner_daily.
  ///
  /// In en, this message translates to:
  /// **'Service time: max {hours}h per day. Remember to take breaks.'**
  String shift_rule_banner_daily(String hours);

  /// No description provided for @shift_rule_banner_weekly.
  ///
  /// In en, this message translates to:
  /// **'Service time: max {hours}h per week. Remember to take breaks.'**
  String shift_rule_banner_weekly(String hours);

  /// No description provided for @shift_rule_banner_break.
  ///
  /// In en, this message translates to:
  /// **'Mandatory break of {minutes} min.'**
  String shift_rule_banner_break(String minutes);

  /// No description provided for @location_service_notification_title.
  ///
  /// In en, this message translates to:
  /// **'Kasi Driver is sharing your location'**
  String get location_service_notification_title;

  /// No description provided for @location_service_notification_text.
  ///
  /// In en, this message translates to:
  /// **'Your location is being updated so you can receive nearby rides.'**
  String get location_service_notification_text;

  /// No description provided for @location_service_notification_channel.
  ///
  /// In en, this message translates to:
  /// **'Location tracking'**
  String get location_service_notification_channel;

  /// No description provided for @order_duration_estimate.
  ///
  /// In en, this message translates to:
  /// **'in {minutes} mins'**
  String order_duration_estimate(String minutes);
}

class _SDelegate extends LocalizationsDelegate<S> {
  const _SDelegate();

  @override
  Future<S> load(Locale locale) {
    return SynchronousFuture<S>(lookupS(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
        'am',
        'ar',
        'bn',
        'de',
        'en',
        'es',
        'fa',
        'fr',
        'hi',
        'hy',
        'id',
        'it',
        'ja',
        'ko',
        'om',
        'pt',
        'ro',
        'ru',
        'sv',
        'ur',
        'zh'
      ].contains(locale.languageCode);

  @override
  bool shouldReload(_SDelegate old) => false;
}

S lookupS(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'am':
      return SAm();
    case 'ar':
      return SAr();
    case 'bn':
      return SBn();
    case 'de':
      return SDe();
    case 'en':
      return SEn();
    case 'es':
      return SEs();
    case 'fa':
      return SFa();
    case 'fr':
      return SFr();
    case 'hi':
      return SHi();
    case 'hy':
      return SHy();
    case 'id':
      return SId();
    case 'it':
      return SIt();
    case 'ja':
      return SJa();
    case 'ko':
      return SKo();
    case 'om':
      return SOm();
    case 'pt':
      return SPt();
    case 'ro':
      return SRo();
    case 'ru':
      return SRu();
    case 'sv':
      return SSv();
    case 'ur':
      return SUr();
    case 'zh':
      return SZh();
  }

  throw FlutterError(
      'S.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
