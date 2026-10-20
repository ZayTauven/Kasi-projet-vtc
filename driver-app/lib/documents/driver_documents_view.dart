import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';

import 'package:kasi_driver/l10n/messages.dart';
import 'package:kasi_driver/main_bloc.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'driver_documents.graphql.dart';
import 'driver_documents_cubit.dart';
import 'upload_driver_file.dart';

/// Écran « Mes documents » (p2-kyc K3) : un état par type du catalogue
/// (manquant, en attente, validé, refusé avec motif, expire bientôt, expiré)
/// et l'envoi d'une photo ou d'un PDF avec sa date d'expiration.
class DriverDocumentsView extends StatefulWidget {
  const DriverDocumentsView({Key? key}) : super(key: key);

  @override
  State<DriverDocumentsView> createState() => _DriverDocumentsViewState();
}

class _DriverDocumentsViewState extends State<DriverDocumentsView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _reload());
  }

  Future<void> _reload() => context
      .read<DriverDocumentsCubit>()
      .refresh(GraphQLProvider.of(context).value);

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    final driverStatus = context.select<MainBloc, Enum$DriverStatus?>(
        (bloc) => bloc.state.driver?.status);
    return Scaffold(
      body: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: BlocBuilder<DriverDocumentsCubit, DriverDocumentsState>(
          builder: (context, state) {
            final suspended = driverStatus == Enum$DriverStatus.SoftReject &&
                state.blocking.isNotEmpty;
            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  Align(
                      alignment: Alignment.centerLeft,
                      child: KasiBackButton(text: s.action_back)),
                  const SizedBox(height: 8),
                  Text(s.documents_title,
                      style: theme.textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(s.documents_subtitle, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: 16),
                  if (suspended)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: DocumentsSuspendedPanel(
                          state: state, showOpenButton: false),
                    ),
                  // Le bandeau « expire bientôt » vit sur l'accueil : ici,
                  // l'état de chaque carte suffit.
                  if (!state.loaded && state.loading)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (!state.loaded && state.error != null)
                    _LoadError(error: state.error, onRetry: _reload)
                  else if (state.loaded && state.slots.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(s.documents_empty,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium),
                    ),
                  for (final slot in state.slots) _DocumentCard(slot: slot),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  final OperationException? error;
  final Future<void> Function() onRetry;

  const _LoadError({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Text(s.documents_load_error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(getErrorMessage(context, error),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: onRetry, child: Text(s.documents_retry)),
        ],
      ),
    );
  }
}

String formatDocumentDate(BuildContext context, DateTime date) =>
    DateFormat.yMMMd(Localizations.localeOf(context).toString()).format(date);

/// Couleurs d'un état, tirées des tokens Kasi (aucune valeur en dur).
class _StatusStyle {
  final Color background;
  final Color foreground;
  final IconData icon;
  final String label;

  const _StatusStyle(this.background, this.foreground, this.icon, this.label);

  factory _StatusStyle.of(BuildContext context, DocumentDisplayStatus status) {
    final s = S.of(context);
    final error = Theme.of(context).colorScheme.error;
    switch (status) {
      case DocumentDisplayStatus.missing:
        return _StatusStyle(
            CustomTheme.neutralColors.shade200,
            CustomTheme.neutralColors.shade800,
            Ionicons.add_circle,
            s.documents_status_missing);
      case DocumentDisplayStatus.pending:
        return _StatusStyle(
            CustomTheme.primaryColors.shade50,
            CustomTheme.primaryColors.shade800,
            Ionicons.hourglass,
            s.documents_status_pending);
      case DocumentDisplayStatus.approved:
        return _StatusStyle(
            CustomTheme.primaryColors.shade100,
            CustomTheme.primaryColors.shade900,
            Ionicons.checkmark_circle,
            s.documents_status_approved);
      case DocumentDisplayStatus.rejected:
        return _StatusStyle(error.withValues(alpha: 0.1), error,
            Ionicons.close_circle, s.documents_status_rejected);
      case DocumentDisplayStatus.expiringSoon:
        return _StatusStyle(
            CustomTheme.secondaryColors.shade50,
            CustomTheme.secondaryColors.shade900,
            Ionicons.time,
            s.documents_status_expiring_soon);
      case DocumentDisplayStatus.expired:
        return _StatusStyle(error.withValues(alpha: 0.1), error,
            Ionicons.alert_circle, s.documents_status_expired);
    }
  }
}

class _StatusChip extends StatelessWidget {
  final _StatusStyle style;

  const _StatusChip({required this.style});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: style.background, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.icon, size: 14, color: style.foreground),
          const SizedBox(width: 4),
          Flexible(
            child: Text(style.label,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: style.foreground, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  final DocumentSlot slot;

  const _DocumentCard({required this.slot});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    final style = _StatusStyle.of(context, slot.status);
    final shown = slot.shown;
    final lines = <Widget>[];
    void line(String text, {Color? color, bool bold = false}) =>
        lines.add(Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(text,
              style: theme.textTheme.bodySmall?.copyWith(
                  color: color,
                  fontWeight: bold ? FontWeight.w600 : null)),
        ));

    if (shown?.number != null && shown!.number!.isNotEmpty) {
      line(s.documents_number(shown.number!));
    }
    switch (slot.status) {
      case DocumentDisplayStatus.pending:
        line(s.documents_pending_note(
            formatDocumentDate(context, slot.pending!.createdAt.toLocal())));
        final approvedExpiry = parseExpiry(slot.approved?.expiresAt);
        if (approvedExpiry != null) {
          line(s.documents_valid_until(
              formatDocumentDate(context, approvedExpiry)));
        }
        break;
      case DocumentDisplayStatus.rejected:
        final note = slot.rejected?.reviewNote;
        if (note != null && note.isNotEmpty) {
          line(s.documents_rejection_reason(note),
              color: theme.colorScheme.error, bold: true);
        }
        break;
      case DocumentDisplayStatus.approved:
      case DocumentDisplayStatus.expiringSoon:
        final expiry = parseExpiry(slot.approved?.expiresAt);
        if (expiry != null) {
          line(s.documents_valid_until(formatDocumentDate(context, expiry)));
        }
        if (slot.status == DocumentDisplayStatus.expiringSoon &&
            slot.daysLeft != null) {
          line(s.documents_days_left(slot.daysLeft!),
              color: CustomTheme.secondaryColors.shade900, bold: true);
        }
        break;
      case DocumentDisplayStatus.expired:
        final expiry = parseExpiry(slot.expired?.expiresAt);
        if (expiry != null) {
          line(s.documents_expired_on(formatDocumentDate(context, expiry)),
              color: theme.colorScheme.error, bold: true);
        }
        break;
      case DocumentDisplayStatus.missing:
        if (slot.type.description != null &&
            slot.type.description!.isNotEmpty) {
          line(slot.type.description!);
        }
        break;
    }

    final String actionLabel;
    switch (slot.status) {
      case DocumentDisplayStatus.missing:
        actionLabel = s.documents_action_send;
        break;
      case DocumentDisplayStatus.pending:
      case DocumentDisplayStatus.approved:
        actionLabel = s.documents_action_replace;
        break;
      case DocumentDisplayStatus.rejected:
      case DocumentDisplayStatus.expiringSoon:
      case DocumentDisplayStatus.expired:
        actionLabel = s.documents_action_renew;
        break;
    }
    final urgent = slot.status == DocumentDisplayStatus.missing ||
        slot.status == DocumentDisplayStatus.rejected ||
        slot.status == DocumentDisplayStatus.expiringSoon ||
        slot.status == DocumentDisplayStatus.expired;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: CustomTheme.neutralColors.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: slot.status == DocumentDisplayStatus.expired ||
                      slot.status == DocumentDisplayStatus.rejected
                  ? theme.colorScheme.error
                  : CustomTheme.neutralColors.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Ionicons.document_text,
                  color: CustomTheme.primaryColors.shade700, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(slot.type.title, style: theme.textTheme.titleSmall),
                    if (slot.type.isRequired)
                      Text(s.documents_required,
                          style: theme.textTheme.labelSmall?.copyWith(
                              color: CustomTheme.neutralColors.shade600)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: _StatusChip(style: style)),
            ],
          ),
          ...lines,
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: urgent
                ? ElevatedButton.icon(
                    onPressed: () => showSubmitDocumentSheet(context, slot),
                    icon: const Icon(Ionicons.cloud_upload, size: 18),
                    label: Text(actionLabel))
                : OutlinedButton.icon(
                    onPressed: () => showSubmitDocumentSheet(context, slot),
                    icon: const Icon(Ionicons.cloud_upload, size: 18),
                    label: Text(actionLabel)),
          ),
        ],
      ),
    );
  }
}

Future<void> showSubmitDocumentSheet(
    BuildContext context, DocumentSlot slot) async {
  final cubit = context.read<DriverDocumentsCubit>();
  final client = GraphQLProvider.of(context).value;
  final submitted = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: CustomTheme.neutralColors.shade50,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _SubmitDocumentSheet(slot: slot, client: client),
  );
  if (submitted == true) {
    await cubit.refresh(client);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(S.of(context).documents_submitted)));
    }
  }
}

class _SubmitDocumentSheet extends StatefulWidget {
  final DocumentSlot slot;
  final GraphQLClient client;

  const _SubmitDocumentSheet({required this.slot, required this.client});

  @override
  State<_SubmitDocumentSheet> createState() => _SubmitDocumentSheetState();
}

class _SubmitDocumentSheetState extends State<_SubmitDocumentSheet> {
  final _number = TextEditingController();
  String? _path;
  String? _fileName;
  DateTime? _expiry;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _number.dispose();
    super.dispose();
  }

  Future<void> _pick(bool photo) async {
    final result = photo
        ? await FilePicker.platform.pickFiles(type: FileType.image)
        : await FilePicker.platform.pickFiles(
            type: FileType.custom,
            allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png']);
    final file = result?.files.single;
    if (file?.path == null) return;
    setState(() {
      _path = file!.path;
      _fileName = file.name;
      _error = null;
    });
  }

  Future<void> _pickDate() async {
    final today = dakarToday();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiry ?? today.add(const Duration(days: 365)),
      firstDate: today,
      lastDate: DateTime.utc(today.year + 20, 12, 31),
    );
    if (picked != null) {
      setState(() {
        _expiry = DateTime.utc(picked.year, picked.month, picked.day);
        _error = null;
      });
    }
  }

  Future<void> _submit() async {
    final s = S.of(context);
    if (_path == null) {
      setState(() => _error = s.documents_missing_file);
      return;
    }
    if (widget.slot.type.hasExpiryDate && _expiry == null) {
      setState(() => _error = s.documents_missing_expiry);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final media = await uploadDriverFile(_path!, UploadMedia.document);
      final expiry = _expiry;
      final number = _number.text.trim();
      final result = await widget.client.mutate$SubmitDriverDocument(
          Options$Mutation$SubmitDriverDocument(
              variables: Variables$Mutation$SubmitDriverDocument(
                  input: Input$SubmitDriverDocumentInput(
        typeId: widget.slot.type.id,
        mediaId: media.id,
        number: number.isEmpty ? null : number,
        expiresAt:
            expiry == null ? null : DateFormat('yyyy-MM-dd').format(expiry),
      ))));
      if (!mounted) return;
      if (result.hasException) {
        setState(() {
          _sending = false;
          _error = getErrorMessage(context, result.exception);
        });
        return;
      }
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    final type = widget.slot.type;
    return Padding(
      padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(type.title, style: theme.textTheme.titleLarge),
            if (type.description != null && type.description!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(type.description!, style: theme.textTheme.bodySmall),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton.icon(
                        onPressed: _sending ? null : () => _pick(true),
                        icon: const Icon(Ionicons.camera, size: 18),
                        label: Text(s.documents_pick_photo,
                            overflow: TextOverflow.ellipsis)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton.icon(
                        onPressed: _sending ? null : () => _pick(false),
                        icon: const Icon(Ionicons.document_attach, size: 18),
                        label: Text(s.documents_pick_file,
                            overflow: TextOverflow.ellipsis)),
                  ),
                ),
              ],
            ),
            if (_fileName != null) ...[
              const SizedBox(height: 8),
              Text(s.documents_file_selected(_fileName!),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: CustomTheme.primaryColors.shade800)),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _number,
              enabled: !_sending,
              maxLength: 64,
              decoration: InputDecoration(labelText: s.documents_number_label),
            ),
            if (type.hasExpiryDate) ...[
              const SizedBox(height: 8),
              Text(s.documents_expiry_label, style: theme.textTheme.labelLarge),
              const SizedBox(height: 4),
              SizedBox(
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: _sending ? null : _pickDate,
                  icon: const Icon(Ionicons.calendar, size: 18),
                  label: Text(
                      _expiry == null
                          ? s.documents_expiry_pick
                          : formatDocumentDate(context, _expiry!),
                      overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!,
                  style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                      fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _sending ? null : _submit,
                child: _sending
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: CustomTheme.neutralColors.shade50))
                    : Text(s.documents_submit),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _titles(List<DocumentSlot> slots) =>
    slots.map((e) => e.type.title).join(', ');

/// Bandeau d'accueil « expire bientôt » (ou « expiré » avant suspension).
/// Ne s'affiche que s'il y a lieu.
class DocumentExpiryBanner extends StatelessWidget {
  final DriverDocumentsState state;
  final VoidCallback? onTap;

  const DocumentExpiryBanner(
      {Key? key, required this.state, required this.onTap})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final expired = state.expired;
    final soon = state.expiringSoon;
    if (expired.isEmpty && soon.isEmpty) return const SizedBox.shrink();
    final isExpired = expired.isNotEmpty;
    final error = Theme.of(context).colorScheme.error;
    final foreground =
        isExpired ? error : CustomTheme.secondaryColors.shade900;
    final message = isExpired
        ? s.documents_expired_banner(_titles(expired))
        : s.documents_expiring_banner(_titles(soon));
    final radius = BorderRadius.circular(12);
    return Material(
      color: isExpired
          ? CustomTheme.neutralColors.shade50
          : CustomTheme.secondaryColors.shade50,
      borderRadius: radius,
      child: InkWell(
        borderRadius: radius,
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
              borderRadius: radius,
              border: Border.all(
                  color: isExpired
                      ? error
                      : CustomTheme.secondaryColors.shade300)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(isExpired ? Ionicons.alert_circle : Ionicons.time,
                  color: foreground, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(message,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: foreground, fontWeight: FontWeight.w600)),
              ),
              if (onTap != null) ...[
                const SizedBox(width: 4),
                Icon(Ionicons.chevron_forward, color: foreground, size: 18),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Bandeau d'accueil branché sur le cubit : touche = « Mes documents ».
class HomeDocumentExpiryBanner extends StatelessWidget {
  const HomeDocumentExpiryBanner({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<DriverDocumentsCubit, DriverDocumentsState>(
      builder: (context, state) {
        if (state.expired.isEmpty && state.expiringSoon.isEmpty) {
          return const SizedBox.shrink();
        }
        return Padding(
          padding: const EdgeInsets.only(top: 12),
          child: DocumentExpiryBanner(
              state: state,
              onTap: () => Navigator.pushNamed(context, 'documents')),
        );
      },
    );
  }
}

/// Kasiman suspendu pour document obligatoire expiré (« soft reject » posé
/// par le contrôle `kyc-check`) : ce qui s'est passé et quoi faire.
class DocumentsSuspendedPanel extends StatelessWidget {
  final DriverDocumentsState state;
  final bool showOpenButton;
  final VoidCallback? onRefreshStatus;

  const DocumentsSuspendedPanel(
      {Key? key,
      required this.state,
      required this.showOpenButton,
      this.onRefreshStatus})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final theme = Theme.of(context);
    final error = theme.colorScheme.error;
    final blocking = state.blocking;
    final renewalPending = blocking.any((e) => e.pending != null);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: CustomTheme.neutralColors.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: error)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Icon(Ionicons.lock_closed, color: error, size: 22),
            const SizedBox(width: 8),
            Expanded(
                child: Text(s.documents_suspended_title,
                    style: theme.textTheme.titleMedium
                        ?.copyWith(color: error, fontWeight: FontWeight.w700))),
          ]),
          const SizedBox(height: 8),
          Text(s.documents_suspended_body(_titles(blocking)),
              style: theme.textTheme.bodySmall),
          if (renewalPending) ...[
            const SizedBox(height: 8),
            Text(s.documents_suspended_pending,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: CustomTheme.primaryColors.shade800,
                    fontWeight: FontWeight.w600)),
          ],
          if (showOpenButton) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, 'documents'),
                  icon: const Icon(Ionicons.document_text, size: 18),
                  label: Text(s.documents_open)),
            ),
          ],
          if (onRefreshStatus != null)
            SizedBox(
              height: 48,
              child: TextButton(
                  onPressed: onRefreshStatus,
                  child: Text(s.action_refresh_status)),
            ),
        ],
      ),
    );
  }
}
