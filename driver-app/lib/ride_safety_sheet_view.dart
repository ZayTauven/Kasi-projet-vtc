import 'package:client_shared/components/ride_option_item.dart';
import 'package:client_shared/components/kasi_banner.dart';
import 'package:client_shared/components/sheet_title_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:share_plus/share_plus.dart';

import 'package:kasi_driver/graphql/order.fragment.graphql.dart';
import 'package:kasi_driver/main.graphql.dart';
import 'package:kasi_driver/query_result_view.dart';
import 'package:kasi_driver/trip-history/submit_complaint_view.dart';
import 'package:kasi_driver/l10n/messages.dart';

class RideSafetySheetView extends StatelessWidget {
  final Fragment$CurrentOrder order;
  const RideSafetySheetView({required this.order, Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
        minimum: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SheetTitleView(
              title: S.of(context).ride_safety_title,
              closeAction: () => Navigator.pop(context),
            ),
            RideOptionItem(
                icon: Ionicons.shield,
                text: S.of(context).ride_safety_share_trip_information,
                onPressed: () {
                  Navigator.pop(context);
                  var text = S.of(context).share_trip_text_locations(
                      order.addresses.last, order.addresses.first);
                  if (order.rider != null) {
                    text += S.of(context).share_trip_text_client(
                        order.rider!.firstName ?? "",
                        order.rider!.lastName ?? "",
                        order.rider!.mobileNumber);
                  }
                  Share.share(text);
                }),
            const SizedBox(height: 8),
            Mutation$SendSOS$Widget(
                options: WidgetOptions$Mutation$SendSOS(
                    onCompleted: (data, parsedData) {
                      final snackBar = SnackBar(
                          content: KasiBanner(S.of(context).sos_sent_alert,
                              type: BannerType.success));
                      ScaffoldMessenger.of(context).showSnackBar(snackBar);
                      Navigator.pop(context);
                    },
                    onError: (error) =>
                        showOperationErrorMessage(context, error)),
                builder: (runMutation, result) {
                  return RideOptionItem(
                      icon: Ionicons.warning,
                      text: S.of(context).ride_safety_sos,
                      onPressed: () {
                        Navigator.pop(context);
                        showDialog(
                            context: context,
                            builder: (context) {
                              return AlertDialog(
                                title: Text(S.of(context).sos_title),
                                content: Text(S.of(context).sos_body),
                                actions: [
                                  TextButton(
                                      onPressed: () async {
                                        runMutation(Variables$Mutation$SendSOS(
                                            orderId: order.id));
                                      },
                                      child: Text(
                                        S.of(context).sos_ok_action,
                                        style: const TextStyle(
                                            color: Color(0xffb20d0e)),
                                      )),
                                  TextButton(
                                      onPressed: () {
                                        Navigator.pop(context);
                                      },
                                      child: Text(S.of(context).action_cancel))
                                ],
                              );
                            });
                      });
                }),
            const SizedBox(height: 8),
            RideOptionItem(
                icon: Ionicons.alert_circle,
                text: S.of(context).ride_safety_report_problem,
                onPressed: () {
                  Navigator.pop(context);
                  showBarModalBottomSheet(
                      context: context,
                      builder: (context) {
                        return SubmitComplaintView(orderId: order.id);
                      });
                }),
          ],
        ));
  }
}
