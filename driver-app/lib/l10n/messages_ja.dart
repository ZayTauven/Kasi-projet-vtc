// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'messages.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class SJa extends S {
  SJa([String locale = 'ja']) : super(locale);

  @override
  String get ride_safety_title => 'Ride Safety';

  @override
  String get ride_safety_share_trip_information => 'Share trip information';

  @override
  String get ride_safety_sos => 'SOS';

  @override
  String get ride_safety_report_problem => 'Report a problem';

  @override
  String get sos_title => 'Distress Signal';

  @override
  String get sos_body =>
      'Distress signals are for emergencies and contacting authorities, such as the police or law enforcement. Please use the distress signal in the event that you experience an emergency and require immediate assistance.';

  @override
  String get sos_sent_alert => 'SOS is sent';

  @override
  String get sos_ok_action => 'It\'s an emergency';

  @override
  String share_trip_text_locations(Object destination, Object pickup) {
    return 'I am on my way to $destination from $pickup.';
  }

  @override
  String share_trip_text_client(
      Object firstName, Object lastName, Object mobileNumber) {
    return ' My client is $firstName $lastName, the mobile number is +$mobileNumber.';
  }

  @override
  String get statusOffline => 'オンライン化する';

  @override
  String get statusOnline => 'オフラインにする';

  @override
  String get message_notification_permission_title => '通知許可';

  @override
  String get message_notification_permission_denined_message =>
      '以前に通知許可が拒否されました。新規注文の通知を受け取るために、アプリの設定から許可を有効にすることができます。';

  @override
  String get action_ok => 'わかった';

  @override
  String get menu_logout => 'ログアウト';

  @override
  String get menu_about => '約';

  @override
  String get menu_wallet => '財布';

  @override
  String get menu_trip_history => '旅行履歴';

  @override
  String get menu_announcements => 'お知らせ';

  @override
  String get message_unknown_error => '未知のエラー';

  @override
  String get title_success => '成功';

  @override
  String get driver_register_profile_submitted_message =>
      'あなたのプロフィールは管理者の承認のために送信されます。後でもう一度チェックして、提出のステータスを確認できます。';

  @override
  String get driver_registration_approved_demo_mode =>
      '通常、この段階で、管理者は管理者パネルからのドライバーの送信を承認する必要があります。ただし、デモのために、プロファイルは現在自動的に承認されており、使用する準備ができています。';

  @override
  String get title_important => '重要！';

  @override
  String get cell_number => 'セル番号';

  @override
  String get phone_number_empty => '電話番号を入力してください';

  @override
  String get driver_registration_step_verify_number_title => '番号の確認';

  @override
  String get driver_register_verification_code_textfield_hint => '検証コード';

  @override
  String get driver_register_contact_details_title => '連絡先の詳細';

  @override
  String get firstname => 'ファーストネーム';

  @override
  String get lastname => '苗字';

  @override
  String get email => 'Eメール';

  @override
  String get certificate_number => '証明書番号';

  @override
  String get gender => '性別';

  @override
  String get gender_male => '男';

  @override
  String get gender_female => '女性';

  @override
  String get address => '住所';

  @override
  String get driver_register_ride_details_step_title => '乗車の詳細';

  @override
  String get plate_number => 'プレートナンバー';

  @override
  String get car_production_year => '製造年';

  @override
  String get car_model => '車のモデル';

  @override
  String get car_color => '車の色';

  @override
  String get driver_register_step_payout_details_title => '支払いの詳細';

  @override
  String get bank_name => '銀行名';

  @override
  String get account_number => '口座番号';

  @override
  String get bank_swift => 'バンク・スウィフト';

  @override
  String get bankRoutingNumber => '銀行ルーティング番号';

  @override
  String get driver_register_step_documents_title => 'ドキュメント';

  @override
  String get driver_register_step_documents_heading =>
      '上記の書類を確認するには、以下の書類をアップロードする必要があります';

  @override
  String get driver_register_document_first => '1-ID';

  @override
  String get driver_register_document_second => '2 運転免許証';

  @override
  String get driver_register_document_third => '3-Rideの所有権文書';

  @override
  String get action_upload_document => 'ドキュメントのアップロード';

  @override
  String get trip_history_empty_state => '過去の注文は記録されていません。';

  @override
  String get wallet_empty_state_message => '履歴が記録されていません。';

  @override
  String get enum_unknown => '不明';

  @override
  String get top_up_sheet_pay_button => '支払い';

  @override
  String get loading => '読み込み中';

  @override
  String get available_order_action_accept => '注文を受け入れる';

  @override
  String get available_order_action_reject => 'Decline';

  @override
  String get order_status_action_received_cash => '現金支払いの受領';

  @override
  String get action_cancel => 'キャンセル';

  @override
  String get order_status_action_navigate => 'ナビゲート';

  @override
  String get order_status_action_arrived => '到着した';

  @override
  String get order_status_action_start => '旅行を開始';

  @override
  String get order_status_action_finished => '終了';

  @override
  String get swipe_to_confirm_arrival => 'Swipe to confirm arrival';

  @override
  String get swipe_to_start => 'Swipe to start the trip';

  @override
  String get swipe_to_finish => 'Swipe to finish';

  @override
  String get swipe_to_next_stop => 'Swipe for next stop';

  @override
  String get ride_late_badge => 'Late';

  @override
  String get message_cant_open_url => 'コマンドはサポートされていません';

  @override
  String get enum_driver_recharge_type_bank_transfer => '銀行振込';

  @override
  String get enum_driver_recharge_type_gift => '贈り物';

  @override
  String get enum_driver_recharge_type_in_app_payment => 'アプリ内決済';

  @override
  String get enum_driver_recharge_transaction_type_order_fee => '注文手数料';

  @override
  String get enum_driver_deduct_transaction_type_withdraw => '撤退';

  @override
  String get enum_driver_deduct_transaction_type_correction => '修正';

  @override
  String get enum_driver_deduct_transaction_type_commission => '手数料';

  @override
  String copyright_notice(Object company) {
    return '著作権 © $company、無断複写・転載を禁じます。';
  }

  @override
  String get wallet_activities_heading => '活動内容';

  @override
  String get form_required_field_error => '必須フィールド';

  @override
  String get button_report_issue => '問題を報告する';

  @override
  String get issue_submit_title => '問題を報告する';

  @override
  String get issue_subject_placeholder => '主題';

  @override
  String get error_field_cant_be_empty => '空にすることはできません';

  @override
  String get issue_description_placeholder => '説明';

  @override
  String get complaint_submit_success_message =>
      '苦情が提出されます。お問い合わせ内容については、弊社サポート担当者からの連絡をお待ちください。';

  @override
  String get menu_earnings => '収益';

  @override
  String get status_offline_description => 'オンラインでリクエストを確認する';

  @override
  String get status_online_description => '乗り物を探しています';

  @override
  String get order_status_card_title_driver_accepted => '[到着] をタップすると乗客に通知されます';

  @override
  String get order_status_card_title_arrived => 'ライダーに通知されました';

  @override
  String get order_status_card_title_started => '目的地に向かっています';

  @override
  String get navigation_dialog_title => 'ナビゲートするアプリを選択してください';

  @override
  String get action_ride_options => '乗車オプション';

  @override
  String rider_expected_time_past(Object minutes) {
    return '乗客は $minutes 前にあなたを待っていました';
  }

  @override
  String rider_expected_time_future(Object minutes) {
    return '乗客は $minutes 以内にあなたを待っています';
  }

  @override
  String get order_payment_status_unpaid => '乗車料金はまだ支払われていません';

  @override
  String get order_payment_status_paid => 'ライダーは支払われました';

  @override
  String get action_ride_preferences => '乗客の好み';

  @override
  String get navigation_dialog_title_pickup_point => 'ピックアップポイントに移動';

  @override
  String get navigation_title_destination_point => '降車地点に移動';

  @override
  String get rider_options_dialog_title => '乗車オプション';

  @override
  String get action_cancel_ride => '乗車をキャンセル';

  @override
  String get invoice_dialog_body =>
      'あなたと作家の両方が喜んでいる場合は、オンライン支払いの代わりに現金を受け取ることもできます.';

  @override
  String get invoice_dialog_heading => '乗客の支払いを待っています';

  @override
  String get invoice_dialog_title => '支払い情報';

  @override
  String get invoice_item_tip => 'ヒント';

  @override
  String get invoice_item_subtotal => '小計';

  @override
  String get add_credit_dialog_title => 'クレジットを追加';

  @override
  String get add_credit_dialog_select_payment_method => 'お支払い方法の選択:';

  @override
  String get add_credit_dialog_choose_amount => '金額を選択';

  @override
  String get order_details_payment_method_title => '支払方法';

  @override
  String get order_payment_method_cash => '現金';

  @override
  String get order_payment_method_online => 'オンライン';

  @override
  String get order_details_trip_information_title => '旅行情報';

  @override
  String get issue_submit_body => '乗車中に発生した問題を報告できます。お電話で問題を解決いたします。';

  @override
  String get announcements_empty_state_title => 'お知らせはまだありません！';

  @override
  String get announcements_empty_state_body => '新しい発表が来たらお知らせします。';

  @override
  String get empty_state_title_no_record => '何もデータが見つかりませんでした！';

  @override
  String get earnings_empty_state_body => '上記の基準では、レコードが見つかりません。';

  @override
  String get action_continue => '継続する';

  @override
  String get terms_and_condition_first_part => '私は読み、同意します';

  @override
  String get terms_and_conditions_clickable_part => '利用規約';

  @override
  String get onboarding_welcome => 'いらっしゃいませ ！';

  @override
  String get action_login_signup => 'ログインサインアップ';

  @override
  String get action_complete_registration => '登録完了';

  @override
  String get action_edit_submission => '提出物を編集';

  @override
  String get incomplete_registration_description => '記入してください\n 登録提出';

  @override
  String get pending_review_registration_description =>
      'あなたの提出物は審査中です。\n お待ちいただきありがとうございます。';

  @override
  String get action_refresh_status => 'Refresh my status';

  @override
  String get account_blocked_title => 'Account blocked';

  @override
  String get account_blocked_description =>
      'Your account is currently blocked. Please contact support to restore access.';

  @override
  String get hard_reject_registration => 'あなたの提出物は完全に拒否されました!';

  @override
  String get soft_rejection_description => '提出物に問題がある';

  @override
  String get action_confirm_and_continue => '確認して続行';

  @override
  String get ride_preferences_title => '乗車設定';

  @override
  String get action_back => '戻る';

  @override
  String get title_logout => 'ログアウト';

  @override
  String get logout_dialog_body => 'アプリケーションからログアウトしてもよろしいですか?';

  @override
  String get action_delete_account => 'アカウントを削除する';

  @override
  String get dialog_account_deletion_title => 'アカウントの削除';

  @override
  String get dialog_account_deletion_body =>
      'アカウントを削除してもよろしいですか？アカウントを復元するには、30 日以内に再度ログインしてください。この期間が過ぎると、残りのすべてのクレジットを含め、データが完全に削除されます。';

  @override
  String wallet_card_title(Object appName) {
    return '$appName ウォレット';
  }

  @override
  String get order_status_canceled => 'キャンセル';

  @override
  String get driver_register_title => 'ドライバー登録';

  @override
  String get menu_profile => '私のプロフィール';

  @override
  String get profile_services_title => 'サービス:';

  @override
  String get profile_bank_information_title => '銀行情報';

  @override
  String get profile_vehicle_information_title => '車両情報';

  @override
  String get profile_distance_traveled => '走行距離';

  @override
  String get profile_total_trips => '合計旅行';

  @override
  String get profile_rating => '評価';

  @override
  String get register_number_title => '電話番号を入力してください';

  @override
  String get register_number_subtitle => '登録を続行するためのコードをあなたの番号に送信します';

  @override
  String get register_verify_code_title => 'コードを入力する';

  @override
  String register_verify_code_subtitle(Object number) {
    return '$number にコードを送信しました';
  }

  @override
  String get register_contact_details_title => '連絡先の詳細を入力してください';

  @override
  String get register_payout_details_title => '支払いの詳細を入力してください';

  @override
  String get register_ride_details_title => '乗車の詳細を入力してください';

  @override
  String get register_profile_photo_title => 'プロフィール写真をアップロード';

  @override
  String get register_profile_photo_subtitle =>
      'アップロードされた画像であなたの顔を認識できる必要があります';

  @override
  String get action_add_photo => '写真を追加';

  @override
  String get register_upload_documents_title => '必要書類のアップロード';

  @override
  String get register_upload_documents_subtitle =>
      '身元を確認し、規制に準拠するために、以下の書類をアップロードする必要があります: \\n1-写真付き身分証明書\\n2-運転免許証\\n3-乗り物の所有権に関する書類';

  @override
  String get register_step_phone_number => 'セル番号';

  @override
  String get register_step_verify_number => '番号の確認';

  @override
  String get register_step_contact_details => '連絡先の詳細';

  @override
  String get register_step_ride_details => '乗車の詳細';

  @override
  String get register_step_payout_details => '支払いの詳細';

  @override
  String get register_step_upload_documents => 'ドキュメントのアップロード';

  @override
  String get profile_uploaded_documents_title => 'アップロードされたドキュメント';

  @override
  String get error_cancel_not_allowed =>
      'Cancel is not allowed for an already started trip';

  @override
  String distanceMeters(String distance) {
    return '$distance m';
  }

  @override
  String distanceKm(String distance) {
    return '$distance km';
  }

  @override
  String distanceFeet(String distance) {
    return '$distance ft';
  }

  @override
  String distanceMiles(String distance) {
    return '$distance mi';
  }

  @override
  String distanceAway(String distance) {
    return '$distance away';
  }

  @override
  String get settings => 'Settings';

  @override
  String get mapSettings => 'Map Settings';

  @override
  String get languageSettings => 'Language Settings';

  @override
  String orderStatusCardTitleMultipleDestinations(int destinationIndex) {
    return 'Heading to ${destinationIndex}st destination';
  }

  @override
  String actionArrivedToDestination(int destinationIndex) {
    return 'Arrived to ${destinationIndex}st destination';
  }

  @override
  String get skipVerificationDemoOnly => 'Skip verification (Demo only)';

  @override
  String get delivery_tag => 'Delivery';

  @override
  String get package_size_small => 'Small package';

  @override
  String get package_size_medium => 'Medium package';

  @override
  String get package_size_large => 'Large package';

  @override
  String get earnings_toggle_day => 'Day';

  @override
  String get earnings_toggle_month => 'Month';

  @override
  String get earnings_kpi_trips => 'Trips';

  @override
  String get earnings_kpi_distance => 'Distance';

  @override
  String get earnings_kpi_time => 'Time';

  @override
  String get payout_methods_title => 'Withdrawal methods';

  @override
  String get payout_info_text =>
      'Your earnings are paid out to you periodically by Kasi on the method you choose.';

  @override
  String get payout_account_number_label => 'Account number';

  @override
  String get payout_account_number_hint =>
      'Phone number (Wave / Orange Money) or bank account';

  @override
  String get payout_save => 'Save';

  @override
  String get payout_saved_message => 'Withdrawal method saved';

  @override
  String payout_minimum_amount(Object amount) {
    return 'Minimum: $amount';
  }

  @override
  String get payout_history_title => 'Latest payouts';

  @override
  String get payout_status_paid => 'Paid';

  @override
  String get payout_status_pending => 'Pending';

  @override
  String get payout_status_canceled => 'Canceled';

  @override
  String get payout_method_wave => 'Wave';

  @override
  String get payout_method_orange_money => 'Orange Money';

  @override
  String get payout_method_bank_transfer => 'Bank transfer';

  @override
  String get payout_method_cash => 'Cash';

  @override
  String shift_rule_banner_daily(String hours) {
    return 'Service time: max ${hours}h per day. Remember to take breaks.';
  }

  @override
  String shift_rule_banner_weekly(String hours) {
    return 'Service time: max ${hours}h per week. Remember to take breaks.';
  }

  @override
  String shift_rule_banner_break(String minutes) {
    return 'Mandatory break of $minutes min.';
  }

  @override
  String get location_service_notification_title =>
      'Kasi Pro is sharing your location';

  @override
  String get location_service_notification_text =>
      'Your location is being updated so you can receive nearby rides.';

  @override
  String get location_service_notification_channel => 'Location tracking';

  @override
  String order_duration_estimate(String minutes) {
    return 'in $minutes mins';
  }

  @override
  String get menu_statement => 'My statement';

  @override
  String get statement_title => 'My statement';

  @override
  String get statement_balance => 'Kasi balance';

  @override
  String get statement_debt => 'Debt';

  @override
  String get statement_debt_limit => 'Limit';

  @override
  String get statement_no_debt => 'No debt';

  @override
  String statement_debt_progress(String threshold, String limit) {
    return 'Alert at $threshold, rides suspended above $limit.';
  }

  @override
  String get statement_movements => 'Movements';

  @override
  String get statement_empty => 'No movements yet.';

  @override
  String get statement_load_more => 'Show more';

  @override
  String statement_balance_after(String amount) {
    return 'Balance after: $amount';
  }

  @override
  String statement_ride(String id) {
    return 'Ride #$id';
  }

  @override
  String statement_receipt(String reference) {
    return 'Receipt #$reference';
  }

  @override
  String get statement_line_order_price => 'Ride price';

  @override
  String get statement_line_cash => 'Cash collected';

  @override
  String get statement_line_online => 'Paid online';

  @override
  String get statement_line_commission => 'Kasi commission';

  @override
  String get statement_line_tip => 'Tip';

  @override
  String get statement_line_added_stop => 'Added stop';

  @override
  String get statement_line_settlement => 'Settlement';

  @override
  String get statement_line_other => 'Other';

  @override
  String get statement_nature_fin_course => 'Ride completed';

  @override
  String get statement_nature_annulation => 'Cancellation';

  @override
  String get statement_nature_recharge => 'Top-up';

  @override
  String get statement_nature_versement => 'Payout';

  @override
  String get statement_nature_carte_cadeau => 'Gift card';

  @override
  String get statement_nature_reglement_dette => 'Debt settlement';

  @override
  String get statement_nature_avenant_arret => 'Added stop';

  @override
  String get statement_nature_correction => 'Correction';

  @override
  String get statement_nature_contre_passation => 'Reversal';

  @override
  String get statement_nature_ouverture => 'Opening balance';

  @override
  String get statement_nature_other => 'Movement';

  @override
  String debt_alert_banner(String debt, String limit) {
    return 'Kasi debt of $debt. Above $limit you will no longer receive rides: please settle it.';
  }

  @override
  String get debt_blocked_title => 'Rides suspended';

  @override
  String debt_blocked_message(String debt, String limit) {
    return 'Your Kasi debt is $debt, above the $limit limit. You will not receive new rides until it is settled.';
  }

  @override
  String get debt_blocked_amount_due => 'Amount due';

  @override
  String get debt_blocked_minimum => 'Minimum to resume rides';

  @override
  String get debt_blocked_how_title => 'How to settle';

  @override
  String get debt_blocked_how_body =>
      'Pay the amount in cash at the Kasi office or at a Kasi relay point. An operator records the payment and gives you a receipt. Rides resume as soon as it is recorded.';

  @override
  String get debt_blocked_refresh => 'Refresh';

  @override
  String get debt_blocked_see_statement => 'See my statement';

  @override
  String get menu_documents => 'My documents';

  @override
  String get documents_title => 'My documents';

  @override
  String get documents_subtitle =>
      'Keep your documents up to date: an expired required document suspends your rides.';

  @override
  String get documents_required => 'Required';

  @override
  String get documents_status_missing => 'Missing';

  @override
  String get documents_status_pending => 'Pending';

  @override
  String get documents_status_approved => 'Approved';

  @override
  String get documents_status_rejected => 'Rejected';

  @override
  String get documents_status_expiring_soon => 'Expires soon';

  @override
  String get documents_status_expired => 'Expired';

  @override
  String documents_valid_until(String date) {
    return 'Valid until $date';
  }

  @override
  String documents_expired_on(String date) {
    return 'Expired on $date';
  }

  @override
  String documents_days_left(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Expires in $count days',
      one: 'Expires tomorrow',
      zero: 'Last day of validity',
    );
    return '$_temp0';
  }

  @override
  String documents_number(String number) {
    return 'No. $number';
  }

  @override
  String documents_rejection_reason(String reason) {
    return 'Rejection reason: $reason';
  }

  @override
  String documents_pending_note(String date) {
    return 'Sent on $date, being reviewed by Kasi.';
  }

  @override
  String get documents_action_send => 'Send';

  @override
  String get documents_action_replace => 'Replace';

  @override
  String get documents_action_renew => 'Renew';

  @override
  String get documents_pick_photo => 'Photo';

  @override
  String get documents_pick_file => 'PDF file';

  @override
  String documents_file_selected(String name) {
    return 'Selected file: $name';
  }

  @override
  String get documents_number_label => 'Document number (optional)';

  @override
  String get documents_expiry_label => 'Expiry date';

  @override
  String get documents_expiry_pick => 'Choose the expiry date';

  @override
  String get documents_submit => 'Submit for review';

  @override
  String get documents_submitted =>
      'Document sent. Kasi will review it and keep you posted.';

  @override
  String get documents_missing_file => 'Choose a photo or a file first.';

  @override
  String get documents_missing_expiry => 'Enter the document\'s expiry date.';

  @override
  String get documents_empty => 'No document is required for now.';

  @override
  String get documents_load_error => 'Unable to load your documents.';

  @override
  String get documents_retry => 'Retry';

  @override
  String documents_expiring_banner(String titles) {
    return 'Renew soon: $titles. Tap to send the new version.';
  }

  @override
  String documents_expired_banner(String titles) {
    return 'Expired document: $titles. Send the new version to avoid suspension.';
  }

  @override
  String get documents_suspended_title => 'Rides suspended';

  @override
  String documents_suspended_body(String titles) {
    return 'Expired document: $titles. Send the up-to-date version from \"My documents\". As soon as a Kasi operator approves it, your account is reactivated and you can go online again.';
  }

  @override
  String get documents_suspended_pending =>
      'Your new document is being reviewed: you will be reactivated once it is approved.';

  @override
  String get documents_open => 'Open my documents';

  @override
  String get vehicle_type_title => 'Vehicle type';

  @override
  String get vehicle_type_motorcycle => 'Motorbike';

  @override
  String get vehicle_type_car => 'Taxi or car';

  @override
  String get vehicle_type_van => 'Van';

  @override
  String get vehicle_type_not_set => 'Not set';

  @override
  String get vehicle_type_hint =>
      'Choose the vehicle you drive. It sets the requests you receive and the documents we ask for.';

  @override
  String get vehicle_type_required => 'Choose your vehicle type.';

  @override
  String get vehicle_type_choose => 'Choose';

  @override
  String get vehicle_type_locked => 'To change vehicle, contact Kasi support.';

  @override
  String get vehicle_type_save => 'Save';

  @override
  String get message_request_timeout =>
      'The server is taking too long to respond. Please try again in a moment.';

  @override
  String get message_order_action_checking =>
      'The server is slow to respond. Checking the trip status…';

  @override
  String get cancel_reason_title => 'Why are you cancelling?';

  @override
  String get cancel_reason_confirm => 'Confirm cancellation';

  @override
  String get cancel_reason_back => 'Don\'t cancel';

  @override
  String get cancel_reason_unavailable =>
      'Reasons could not be loaded. You can still cancel.';
}
