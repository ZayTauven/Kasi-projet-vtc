import 'package:client_shared/components/kasi_sheet_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/gen/assets.gen.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/main/current_order_resync.dart';
import 'package:kasi_rider/main/cancel_reason_picker.dart';

import 'package:kasi_rider/l10n/messages.dart';
import '../../main/bloc/main_bloc.dart';

class LookingSheetView extends StatelessWidget {
  const LookingSheetView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final mainBloc = context.read<MainBloc>();
    return KasiSheetView(
      child: Column(
        children: [
          Text(
            S.of(context).looking_dialog_title,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          ),
          Row(
            children: [
              Expanded(
                  child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Text(
                  S.of(context).looking_dialog_body,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              )),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Assets.images.searching.image(),
                ),
              )
            ],
          ),
          Mutation$CancelOrder$Widget(
              options: WidgetOptions$Mutation$CancelOrder(
                  onCompleted: (result, parsedData) {
                    if (parsedData == null) return;
                    mainBloc.add(CurrentOrderUpdated(parsedData.cancelOrder));
                  },
                  // bug-timeout : l'annulation a pu aboutir ; relecture.
                  onError: (error) => handleOrderActionError(context, error)),
              builder: (runMutation, result) {
                return SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                      onPressed: (result?.isLoading ?? false)
                          ? null
                          : () async {
                              // p3-mesures M4 : motif demandé avant
                              // d'annuler (vide si la liste est indisponible).
                              final choice = await pickCancelReason(context);
                              if (choice == null || !context.mounted) return;
                              runMutation(
                                  variables: Variables$Mutation$CancelOrder(
                                      cancelReasonId: choice.reasonId));
                            },
                      child: Text(
                        S.of(context).action_cancel_request,
                        style: Theme.of(context).textTheme.titleMedium,
                      )),
                );
              })
        ],
      ),
    );
  }
}
