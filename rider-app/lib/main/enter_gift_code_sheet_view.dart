import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:client_shared/components/sheet_title_view.dart';
import 'package:client_shared/components/kasi_banner.dart';

import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/query_result_view.dart';
import 'package:kasi_rider/wallet/wallet.graphql.dart';

class EnterGiftCodeSheetView extends StatefulWidget {
  const EnterGiftCodeSheetView({Key? key}) : super(key: key);

  @override
  State<EnterGiftCodeSheetView> createState() => _EnterGiftCodeSheetViewState();
}

class _EnterGiftCodeSheetViewState extends State<EnterGiftCodeSheetView> {
  final TextEditingController _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
        minimum: EdgeInsets.only(
            top: 16,
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SheetTitleView(
              title: S.of(context).gift_card_title,
              closeAction: () => Navigator.pop(context),
            ),
            Text(S.of(context).gift_card_body,
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 10),
            TextField(
              controller: _codeController,
              textInputAction: TextInputAction.done,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                  isDense: true,
                  prefixIcon: const Icon(Ionicons.gift),
                  hintText: S.of(context).gift_card_text_placeholder),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Mutation$RedeemGiftCard$Widget(
                    options: WidgetOptions$Mutation$RedeemGiftCard(
                        onCompleted: (data, parsedData) {
                          if (parsedData == null) return;
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: KasiBanner(
                                  S.of(context).gift_redeem_success,
                                  type: BannerType.success)));
                        },
                        onError: (error) =>
                            showOperationErrorMessage(context, error)),
                    builder: (runMutation, result) {
                      final isLoading = result?.isLoading ?? false;
                      final code = _codeController.text.trim();
                      return ElevatedButton(
                        onPressed: (isLoading || code.isEmpty)
                            ? null
                            : () => runMutation(
                                Variables$Mutation$RedeemGiftCard(code: code)),
                        child: isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : Text(S.of(context).action_apply),
                      );
                    },
                  ),
                ),
              ],
            )
          ],
        ));
  }
}
