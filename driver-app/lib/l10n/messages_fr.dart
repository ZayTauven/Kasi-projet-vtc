// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'messages.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class SFr extends S {
  SFr([String locale = 'fr']) : super(locale);

  @override
  String get ride_safety_title => 'Sécurité de conduite';

  @override
  String get ride_safety_share_trip_information =>
      'Partager des informations sur le voyage';

  @override
  String get ride_safety_sos => 'SOS';

  @override
  String get ride_safety_report_problem => 'Signaler un problème';

  @override
  String get sos_title => 'Signal de détresse';

  @override
  String get sos_body =>
      'Les signaux de détresse sont destinés aux urgences et les appels aux autorités telles que la police peuvent être effectués en votre nom. Veuillez n\'utiliser cette fonction qu\'en cas d\'urgence où vous pourriez être en danger.';

  @override
  String get sos_sent_alert => 'SOS est envoyé';

  @override
  String get sos_ok_action => 'C\'est une urgence';

  @override
  String share_trip_text_locations(Object destination, Object pickup) {
    return 'Je suis en route pour $destination depuis $pickup.';
  }

  @override
  String share_trip_text_client(
      Object firstName, Object lastName, Object mobileNumber) {
    return ' Mon client est $firstName $lastName et son numéro de portable est +$mobileNumber.';
  }

  @override
  String get statusOffline => 'Aller en ligne';

  @override
  String get statusOnline => 'Passer hors ligne';

  @override
  String get message_notification_permission_title =>
      'Autorisation de notification';

  @override
  String get message_notification_permission_denined_message =>
      'L\'autorisation de notification a été refusée précédemment. Afin d\'obtenir de nouvelles notifications de commande, vous pouvez activer l\'autorisation à partir des paramètres de l\'application.';

  @override
  String get action_ok => 'D\'ACCORD';

  @override
  String get menu_logout => 'Se déconnecter';

  @override
  String get menu_about => 'À propos';

  @override
  String get menu_wallet => 'Porte-monnaie';

  @override
  String get menu_trip_history => 'Historique des trajets';

  @override
  String get menu_announcements => 'Annonces';

  @override
  String get message_unknown_error => 'Erreur inconnue';

  @override
  String get title_success => 'Succès';

  @override
  String get driver_register_profile_submitted_message =>
      'Votre profil est soumis à l\'approbation de l\'administrateur. Vous pouvez revenir plus tard pour voir l\'état de votre soumission.';

  @override
  String get driver_registration_approved_demo_mode =>
      'Normalement, à ce stade, l\'administrateur doit approuver la soumission du Kasiman à partir du panneau d\'administration. Cependant, pour les besoins de la démo, votre profil est automatiquement approuvé maintenant et est prêt à être utilisé.';

  @override
  String get title_important => 'IMPORTANT!';

  @override
  String get cell_number => 'Numéro de téléphone';

  @override
  String get phone_number_empty => 'Veuillez entrer le numéro de téléphone';

  @override
  String get driver_registration_step_verify_number_title =>
      'Vérifier le numéro';

  @override
  String get driver_register_verification_code_textfield_hint =>
      'Le code de vérification';

  @override
  String get driver_register_contact_details_title => 'Détails du contact';

  @override
  String get firstname => 'Prénom';

  @override
  String get lastname => 'Nom de famille';

  @override
  String get email => 'E-mail';

  @override
  String get certificate_number => 'Numéro de certificat';

  @override
  String get gender => 'Genre';

  @override
  String get gender_male => 'Homme';

  @override
  String get gender_female => 'Femme';

  @override
  String get address => 'Adresse';

  @override
  String get driver_register_ride_details_step_title => 'Détails du trajet';

  @override
  String get plate_number => 'Numéro de la plaque';

  @override
  String get car_production_year => 'Année de production';

  @override
  String get car_model => 'Modèle du véhicule';

  @override
  String get car_color => 'Couleur du véhicule';

  @override
  String get driver_register_step_payout_details_title => 'Détails du paiement';

  @override
  String get bank_name => 'Nom de banque';

  @override
  String get account_number => 'Numéro de compte';

  @override
  String get bank_swift => 'Banque Swift';

  @override
  String get bankRoutingNumber => 'Numéro d\'acheminement bancaire';

  @override
  String get driver_register_step_documents_title => 'Documents';

  @override
  String get driver_register_step_documents_heading =>
      'Afin de vérifier les documents ci-dessus, nous avons besoin des documents ci-dessous en cours de téléchargement';

  @override
  String get driver_register_document_first => '1 - Pièce d\'identité';

  @override
  String get driver_register_document_second => '2 - Permis de conduire';

  @override
  String get driver_register_document_third => '3 - Carte grise du véhicule';

  @override
  String get action_upload_document => 'Télécharger un document';

  @override
  String get trip_history_empty_state =>
      'Aucune commande passée n\'a été enregistrée.';

  @override
  String get wallet_empty_state_message => 'Aucun historique enregistré.';

  @override
  String get enum_unknown => 'Inconnu';

  @override
  String get top_up_sheet_pay_button => 'Payer';

  @override
  String get loading => 'CHARGEMENT EN COURS';

  @override
  String get available_order_action_accept => 'Accepter la commande';

  @override
  String get available_order_action_reject => 'Refuser';

  @override
  String get order_status_action_received_cash => 'Paiement en espèces reçu';

  @override
  String get action_cancel => 'Annuler';

  @override
  String get order_status_action_navigate => 'Naviguer';

  @override
  String get order_status_action_arrived => 'Arrivé';

  @override
  String get order_status_action_start => 'Commencer le voyage';

  @override
  String get order_status_action_finished => 'Finir';

  @override
  String get swipe_to_confirm_arrival => 'Glisser pour confirmer l\'arrivée';

  @override
  String get swipe_to_start => 'Glisser pour démarrer la course';

  @override
  String get swipe_to_finish => 'Glisser pour terminer';

  @override
  String get swipe_to_next_stop => 'Glisser vers l\'arrêt suivant';

  @override
  String get ride_late_badge => 'En retard';

  @override
  String get message_cant_open_url => 'La commande n\'est pas prise en charge';

  @override
  String get enum_driver_recharge_type_bank_transfer => 'Virement';

  @override
  String get enum_driver_recharge_type_gift => 'Cadeau';

  @override
  String get enum_driver_recharge_type_in_app_payment =>
      'Paiement intégré à l\'application';

  @override
  String get enum_driver_recharge_transaction_type_order_fee =>
      'Frais de commande';

  @override
  String get enum_driver_deduct_transaction_type_withdraw => 'Retrait';

  @override
  String get enum_driver_deduct_transaction_type_correction => 'Correction';

  @override
  String get enum_driver_deduct_transaction_type_commission => 'Commission';

  @override
  String copyright_notice(Object company) {
    return 'Copyright © $company, Tous droits réservés.';
  }

  @override
  String get wallet_activities_heading => 'Activités';

  @override
  String get form_required_field_error => 'champs requis';

  @override
  String get button_report_issue => 'Signaler un problème';

  @override
  String get issue_submit_title => 'Signaler un problème';

  @override
  String get issue_subject_placeholder => 'Sujet';

  @override
  String get error_field_cant_be_empty => 'Ne peux pas être vide';

  @override
  String get issue_description_placeholder => 'Description';

  @override
  String get complaint_submit_success_message =>
      'La plainte est déposée. Veuillez attendre un contact de notre représentant du support au sujet de votre demande.';

  @override
  String get menu_earnings => 'Gains';

  @override
  String get status_offline_description =>
      'Passez en ligne pour voir les demandes';

  @override
  String get status_online_description => 'Recherche de course';

  @override
  String get order_status_card_title_driver_accepted =>
      'Le client sera informé une fois que vous aurez appuyé sur Arrivé';

  @override
  String get order_status_card_title_arrived => 'Le client a été informé';

  @override
  String get order_status_card_title_started => 'En route vers la destination';

  @override
  String get navigation_dialog_title =>
      'Choisissez une application avec laquelle naviguer';

  @override
  String get action_ride_options => 'Options de trajet';

  @override
  String rider_expected_time_past(Object minutes) {
    return 'Le client vous attendait il y a $minutes';
  }

  @override
  String rider_expected_time_future(Object minutes) {
    return 'Le client vous attend dans $minutes';
  }

  @override
  String get order_payment_status_unpaid =>
      'Le trajet n\'a pas encore été payé';

  @override
  String get order_payment_status_paid => 'Le trajet a été payé';

  @override
  String get action_ride_preferences => 'Préférences du client';

  @override
  String get navigation_dialog_title_pickup_point =>
      'Accédez au point de ramassage';

  @override
  String get navigation_title_destination_point =>
      'Naviguer jusqu\'au point de dépôt';

  @override
  String get rider_options_dialog_title => 'Options de trajet';

  @override
  String get action_cancel_ride => 'Annuler le trajet';

  @override
  String get invoice_dialog_body =>
      'Vous pouvez également être payé en espèces au lieu d\'un paiement en ligne si vous et le client êtes tous les deux d\'accord.';

  @override
  String get invoice_dialog_heading => 'En attente du paiement du client';

  @override
  String get invoice_dialog_title => 'Information de paiement';

  @override
  String get invoice_item_tip => 'Pourboire';

  @override
  String get invoice_item_subtotal => 'Sous-total';

  @override
  String get add_credit_dialog_title => 'Ajouter un crédit';

  @override
  String get add_credit_dialog_select_payment_method =>
      'Sélectionnez le mode de paiement:';

  @override
  String get add_credit_dialog_choose_amount => 'Choisissez le montant';

  @override
  String get order_details_payment_method_title => 'Mode de paiement';

  @override
  String get order_payment_method_cash => 'En espèces';

  @override
  String get order_payment_method_online => 'En ligne';

  @override
  String get order_details_trip_information_title =>
      'Informations sur le voyage';

  @override
  String get issue_submit_body =>
      'Vous pouvez signaler tout problème rencontré avec votre trajet. Nous vous aiderons à résoudre le problème dans le cadre d\'un appel.';

  @override
  String get announcements_empty_state_title => 'Pas encore d\'annonces !';

  @override
  String get announcements_empty_state_body =>
      'Nous vous informerons lorsque de nouvelles annonces arriveront.';

  @override
  String get empty_state_title_no_record => 'Aucune donnée disponible!';

  @override
  String get earnings_empty_state_body =>
      'Aux critères définis ci-dessus, nous ne pouvons trouver aucun enregistrement.';

  @override
  String get action_continue => 'Continuer';

  @override
  String get terms_and_condition_first_part =>
      'J\'ai lu et suis d\'accord avec';

  @override
  String get terms_and_conditions_clickable_part => 'termes et conditions';

  @override
  String get onboarding_welcome => 'Bienvenue !';

  @override
  String get action_login_signup => 'Se connecter / S\'inscrire';

  @override
  String get action_complete_registration => 'Compléter l\'inscription';

  @override
  String get action_edit_submission => 'Modifier la soumission';

  @override
  String get incomplete_registration_description =>
      'Veuillez compléter votre\n soumission d\'inscription';

  @override
  String get pending_review_registration_description =>
      'Votre soumission est en cours d\'examen,\n Merci de votre patience.';

  @override
  String get action_refresh_status => 'Actualiser mon statut';

  @override
  String get account_blocked_title => 'Compte bloqué';

  @override
  String get account_blocked_description =>
      'Votre compte est actuellement bloqué. Contactez le support pour rétablir votre accès.';

  @override
  String get hard_reject_registration =>
      'Votre soumission est entièrement rejetée !';

  @override
  String get soft_rejection_description =>
      'Il y a un problème avec la soumission';

  @override
  String get action_confirm_and_continue => 'Confirmer et continuer';

  @override
  String get ride_preferences_title => 'Préférences de conduite';

  @override
  String get action_back => 'Retour';

  @override
  String get title_logout => 'Se déconnecter';

  @override
  String get logout_dialog_body =>
      'Voulez-vous vraiment vous déconnecter de l\'application ?';

  @override
  String get action_delete_account => 'Supprimer le compte';

  @override
  String get dialog_account_deletion_title => 'Suppression de compte';

  @override
  String get dialog_account_deletion_body =>
      'Êtes-vous sûr de vouloir supprimer votre compte ? Vous pouvez vous reconnecter dans les 30 jours pour restaurer le compte. Après cette période, vos données sont complètement supprimées, y compris tous vos crédits restants.';

  @override
  String wallet_card_title(Object appName) {
    return 'Portefeuille $appName';
  }

  @override
  String get order_status_canceled => 'Annulé';

  @override
  String get driver_register_title => 'Inscription Kasiman';

  @override
  String get menu_profile => 'Mon profil';

  @override
  String get profile_services_title => 'Prestations de service:';

  @override
  String get profile_bank_information_title => 'Informations bancaires';

  @override
  String get profile_vehicle_information_title =>
      'Informations sur le véhicule';

  @override
  String get profile_distance_traveled => 'Distance parcourue';

  @override
  String get profile_total_trips => 'Nombre total de trajets';

  @override
  String get profile_rating => 'Évaluation';

  @override
  String get register_number_title => 'Entrez votre numéro de téléphone';

  @override
  String get register_number_subtitle =>
      'Nous enverrons un code à votre numéro pour continuer l\'enregistrement';

  @override
  String get register_verify_code_title => 'Entrez le code';

  @override
  String register_verify_code_subtitle(Object number) {
    return 'Nous avons envoyé un code à $number';
  }

  @override
  String get register_contact_details_title => 'Entrez vos coordonnées';

  @override
  String get register_payout_details_title => 'Entrez vos détails de paiement';

  @override
  String get register_ride_details_title => 'Votre véhicule';

  @override
  String get register_profile_photo_title => 'Télécharger une photo de profil';

  @override
  String get register_profile_photo_subtitle =>
      'Votre visage doit être reconnaissable dans l\'image téléchargée';

  @override
  String get action_add_photo => 'Ajouter une photo';

  @override
  String get register_upload_documents_title =>
      'Télécharger les documents requis';

  @override
  String get register_upload_documents_subtitle =>
      'Afin de vérifier votre identité et de vous conformer à la réglementation, nous aurons besoin que vous téléchargiez les documents ci-dessous : \\n1-Photo d\'identité\\n2-Permis de conduire\\n3-Carte grise du véhicule';

  @override
  String get register_step_phone_number => 'Numéro de téléphone';

  @override
  String get register_step_verify_number => 'Vérifier le numéro';

  @override
  String get register_step_contact_details => 'Détails du contact';

  @override
  String get register_step_ride_details => 'Détails du trajet';

  @override
  String get register_step_payout_details => 'Détails du paiement';

  @override
  String get register_step_upload_documents => 'Télécharger des documents';

  @override
  String get profile_uploaded_documents_title => 'Documents téléchargés';

  @override
  String get error_cancel_not_allowed =>
      'L\'annulation n\'est pas autorisée pour un trajet déjà commencé.';

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
    return 'à $distance';
  }

  @override
  String get settings => 'Paramètres';

  @override
  String get mapSettings => 'Paramètres de la carte';

  @override
  String get languageSettings => 'Paramètres de langue';

  @override
  String orderStatusCardTitleMultipleDestinations(int destinationIndex) {
    return 'En route vers la destination $destinationIndex';
  }

  @override
  String actionArrivedToDestination(int destinationIndex) {
    return 'Arrivé à la destination $destinationIndex';
  }

  @override
  String get skipVerificationDemoOnly =>
      'Ignorer la vérification (démo uniquement)';

  @override
  String get delivery_tag => 'Livraison';

  @override
  String get package_size_small => 'Petit colis';

  @override
  String get package_size_medium => 'Colis moyen';

  @override
  String get package_size_large => 'Grand colis';

  @override
  String get earnings_toggle_day => 'Jour';

  @override
  String get earnings_toggle_month => 'Mois';

  @override
  String get earnings_kpi_trips => 'Trajets';

  @override
  String get earnings_kpi_distance => 'Distance';

  @override
  String get earnings_kpi_time => 'Temps';

  @override
  String get payout_methods_title => 'Méthodes de retrait';

  @override
  String get payout_info_text =>
      'Vos gains vous sont versés périodiquement par Kasi sur la méthode que vous choisissez.';

  @override
  String get payout_account_number_label => 'Numéro de compte';

  @override
  String get payout_account_number_hint =>
      'Numéro de téléphone (Wave / Orange Money) ou compte bancaire';

  @override
  String get payout_save => 'Enregistrer';

  @override
  String get payout_saved_message => 'Méthode de retrait enregistrée';

  @override
  String payout_minimum_amount(Object amount) {
    return 'Minimum : $amount';
  }

  @override
  String get payout_history_title => 'Derniers versements';

  @override
  String get payout_status_paid => 'Versé';

  @override
  String get payout_status_pending => 'En attente';

  @override
  String get payout_status_canceled => 'Annulé';

  @override
  String get payout_method_wave => 'Wave';

  @override
  String get payout_method_orange_money => 'Orange Money';

  @override
  String get payout_method_bank_transfer => 'Virement bancaire';

  @override
  String get payout_method_cash => 'Espèces';

  @override
  String shift_rule_banner_daily(String hours) {
    return 'Temps de service : max $hours h par jour. Pensez à faire des pauses.';
  }

  @override
  String shift_rule_banner_weekly(String hours) {
    return 'Temps de service : max $hours h par semaine. Pensez à faire des pauses.';
  }

  @override
  String shift_rule_banner_break(String minutes) {
    return 'Pause obligatoire de $minutes min.';
  }

  @override
  String get location_service_notification_title =>
      'Kasi Pro partage votre position';

  @override
  String get location_service_notification_text =>
      'Votre position est mise à jour pour vous proposer les courses à proximité.';

  @override
  String get location_service_notification_channel => 'Suivi de position';

  @override
  String order_duration_estimate(String minutes) {
    return 'dans $minutes min';
  }

  @override
  String get menu_statement => 'Mon relevé';

  @override
  String get statement_title => 'Mon relevé';

  @override
  String get statement_balance => 'Solde Kasi';

  @override
  String get statement_debt => 'Dette';

  @override
  String get statement_debt_limit => 'Plafond';

  @override
  String get statement_no_debt => 'Aucune dette';

  @override
  String statement_debt_progress(String threshold, String limit) {
    return 'Alerte à $threshold, courses suspendues au-delà de $limit.';
  }

  @override
  String get statement_movements => 'Mouvements';

  @override
  String get statement_empty => 'Aucun mouvement pour le moment.';

  @override
  String get statement_load_more => 'Afficher plus';

  @override
  String statement_balance_after(String amount) {
    return 'Solde après : $amount';
  }

  @override
  String statement_ride(String id) {
    return 'Course n° $id';
  }

  @override
  String statement_receipt(String reference) {
    return 'Reçu n° $reference';
  }

  @override
  String get statement_line_order_price => 'Prix de la course';

  @override
  String get statement_line_cash => 'Espèces encaissées';

  @override
  String get statement_line_online => 'Payé en ligne';

  @override
  String get statement_line_commission => 'Commission Kasi';

  @override
  String get statement_line_tip => 'Pourboire';

  @override
  String get statement_line_added_stop => 'Arrêt ajouté';

  @override
  String get statement_line_settlement => 'Règlement';

  @override
  String get statement_line_other => 'Autre';

  @override
  String get statement_nature_fin_course => 'Fin de course';

  @override
  String get statement_nature_annulation => 'Annulation';

  @override
  String get statement_nature_recharge => 'Recharge';

  @override
  String get statement_nature_versement => 'Versement';

  @override
  String get statement_nature_carte_cadeau => 'Carte cadeau';

  @override
  String get statement_nature_reglement_dette => 'Règlement de dette';

  @override
  String get statement_nature_avenant_arret => 'Arrêt ajouté';

  @override
  String get statement_nature_correction => 'Correction';

  @override
  String get statement_nature_contre_passation => 'Contre-passation';

  @override
  String get statement_nature_ouverture => 'Solde d\'ouverture';

  @override
  String get statement_nature_other => 'Mouvement';

  @override
  String debt_alert_banner(String debt, String limit) {
    return 'Dette Kasi de $debt. Au-delà de $limit, vous ne recevrez plus de courses : pensez à la régler.';
  }

  @override
  String get debt_blocked_title => 'Courses suspendues';

  @override
  String debt_blocked_message(String debt, String limit) {
    return 'Votre dette Kasi est de $debt, au-delà du plafond de $limit. Vous ne recevez plus de nouvelles courses jusqu’au règlement.';
  }

  @override
  String get debt_blocked_amount_due => 'Montant dû';

  @override
  String get debt_blocked_minimum => 'Minimum pour reprendre les courses';

  @override
  String get debt_blocked_how_title => 'Comment régler';

  @override
  String get debt_blocked_how_body =>
      'Déposez le montant en espèces au siège Kasi ou chez un relais Kasi. Un opérateur enregistre le règlement et vous remet un reçu. Les courses reprennent dès l’enregistrement.';

  @override
  String get debt_blocked_refresh => 'Actualiser';

  @override
  String get debt_blocked_see_statement => 'Voir mon relevé';

  @override
  String get menu_documents => 'Mes documents';

  @override
  String get documents_title => 'Mes documents';

  @override
  String get documents_subtitle =>
      'Gardez vos documents à jour : un document obligatoire expiré suspend vos courses.';

  @override
  String get documents_required => 'Obligatoire';

  @override
  String get documents_status_missing => 'Manquant';

  @override
  String get documents_status_pending => 'En attente';

  @override
  String get documents_status_approved => 'Validé';

  @override
  String get documents_status_rejected => 'Refusé';

  @override
  String get documents_status_expiring_soon => 'Expire bientôt';

  @override
  String get documents_status_expired => 'Expiré';

  @override
  String documents_valid_until(String date) {
    return 'Valable jusqu’au $date';
  }

  @override
  String documents_expired_on(String date) {
    return 'Expiré le $date';
  }

  @override
  String documents_days_left(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Expire dans $count jours',
      one: 'Expire demain',
      zero: 'Dernier jour de validité',
    );
    return '$_temp0';
  }

  @override
  String documents_number(String number) {
    return 'N° $number';
  }

  @override
  String documents_rejection_reason(String reason) {
    return 'Motif du refus : $reason';
  }

  @override
  String documents_pending_note(String date) {
    return 'Envoyé le $date, en cours de vérification par Kasi.';
  }

  @override
  String get documents_action_send => 'Envoyer';

  @override
  String get documents_action_replace => 'Remplacer';

  @override
  String get documents_action_renew => 'Renouveler';

  @override
  String get documents_pick_photo => 'Photo';

  @override
  String get documents_pick_file => 'Fichier PDF';

  @override
  String documents_file_selected(String name) {
    return 'Fichier choisi : $name';
  }

  @override
  String get documents_number_label => 'Numéro du document (facultatif)';

  @override
  String get documents_expiry_label => 'Date d’expiration';

  @override
  String get documents_expiry_pick => 'Choisir la date d’expiration';

  @override
  String get documents_submit => 'Envoyer pour vérification';

  @override
  String get documents_submitted =>
      'Document envoyé. Kasi le vérifie et vous tient informé.';

  @override
  String get documents_missing_file =>
      'Choisissez d’abord une photo ou un fichier.';

  @override
  String get documents_missing_expiry =>
      'Indiquez la date d’expiration du document.';

  @override
  String get documents_empty => 'Aucun document n’est demandé pour le moment.';

  @override
  String get documents_load_error => 'Impossible de charger vos documents.';

  @override
  String get documents_retry => 'Réessayer';

  @override
  String documents_expiring_banner(String titles) {
    return 'À renouveler bientôt : $titles. Touchez pour envoyer la nouvelle version.';
  }

  @override
  String documents_expired_banner(String titles) {
    return 'Document expiré : $titles. Envoyez la nouvelle version pour ne pas être suspendu.';
  }

  @override
  String get documents_suspended_title => 'Courses suspendues';

  @override
  String documents_suspended_body(String titles) {
    return 'Document expiré : $titles. Envoyez la version à jour depuis « Mes documents ». Dès qu’un opérateur Kasi l’a validée, votre compte est réactivé et vous pouvez repasser en ligne.';
  }

  @override
  String get documents_suspended_pending =>
      'Votre nouveau document est en cours de vérification : vous serez réactivé dès sa validation.';

  @override
  String get documents_open => 'Ouvrir mes documents';

  @override
  String get vehicle_type_title => 'Type de véhicule';

  @override
  String get vehicle_type_motorcycle => 'Moto';

  @override
  String get vehicle_type_car => 'Taxi ou voiture';

  @override
  String get vehicle_type_van => 'Camionnette';

  @override
  String get vehicle_type_not_set => 'Non renseigné';

  @override
  String get vehicle_type_hint =>
      'Choisissez le véhicule avec lequel vous roulez. Il détermine les demandes que vous recevez et les documents demandés.';

  @override
  String get vehicle_type_required => 'Choisissez votre type de véhicule.';

  @override
  String get vehicle_type_choose => 'Choisir';

  @override
  String get vehicle_type_locked =>
      'Pour changer de véhicule, contactez le support Kasi.';

  @override
  String get vehicle_type_save => 'Enregistrer';

  @override
  String get message_request_timeout =>
      'Le serveur met trop de temps à répondre. Réessayez dans un instant.';

  @override
  String get message_order_action_checking =>
      'Le serveur tarde à répondre. Vérification de l\'état de la course…';

  @override
  String get cancel_reason_title => 'Pourquoi annulez-vous ?';

  @override
  String get cancel_reason_confirm => 'Confirmer l\'annulation';

  @override
  String get cancel_reason_back => 'Ne pas annuler';

  @override
  String get cancel_reason_unavailable =>
      'Les motifs n\'ont pas pu être chargés. Vous pouvez annuler quand même.';
}
