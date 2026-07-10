import 'package:client_shared/components/kasi_banner.dart';
import 'package:client_shared/components/kasi_sheet_view.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:kasi_rider/main/order.graphql.dart';
import 'package:kasi_rider/query_result_view.dart';
import 'package:kasi_rider/schema.gql.dart';
import 'bloc/main_bloc.dart';
import '../main/select_service_view.dart';

class ServiceSelectionCardView extends StatelessWidget {
  const ServiceSelectionCardView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final mainBloc = context.read<MainBloc>();
    return BlocBuilder<MainBloc, MainBlocState>(builder: (context, state) {
      return Query$GetFare$Widget(
          options: Options$Query$GetFare(
              onComplete: (result, parsedData) {
                if ((state.directions == null || state.directions!.isEmpty) &&
                    (parsedData?.getFare.directions.isNotEmpty ?? false)) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    mainBloc.add(ShowPreviewDirections(
                        directions: parsedData!.getFare.directions));
                  });
                }
                if (state.selectedService == null &&
                    parsedData != null &&
                    parsedData.getFare.services.isNotEmpty &&
                    parsedData.getFare.services.first.services.isNotEmpty) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    mainBloc.add(SelectService(
                        parsedData.getFare.services[0].services[0]));
                  });
                }
              },
              onError: (error) {
                if (error == null) {
                  mainBloc.add(ResetState());
                  return;
                }
                if (error.graphqlErrors
                    .where((element) =>
                        element.message.contains('Coupon expired') ||
                        element.message.contains('Incorrect code'))
                    .isNotEmpty) {
                  final snackBar = SnackBar(
                      content: KasiBanner(
                          S.of(context).alert_coupon_unavailable,
                          type: BannerType.error));
                  ScaffoldMessenger.of(context).showSnackBar(snackBar);
                  mainBloc.add(ShowPreview(
                      points: state.points,
                      selectedOptions: [],
                      couponCode: null));
                }
                if (error.graphqlErrors
                    .where((element) =>
                        element.message.contains('REGION_UNSUPPORTED'))
                    .isNotEmpty) {
                  final snackBar = SnackBar(
                      content: KasiBanner(
                    S.of(context).error_region_unsupported,
                    type: BannerType.error,
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(snackBar);
                }
                mainBloc.add(ResetState());
              },
              variables: Variables$Query$GetFare(
                  points: (state as OrderPreview)
                      .points
                      .map((e) => Input$PointInput(
                          lat: e.latlng.latitude, lng: e.latlng.longitude))
                      .toList(),
                  selectedOptionIds: state.selectedOptions,
                  couponCode: state.couponCode)),
          builder: (result, {refetch, fetchMore}) {
            if (result.isLoading) {
              return const KasiSheetView(
                  child: Padding(
                      padding: EdgeInsets.all(160),
                      child: CupertinoActivityIndicator()));
            }
            if (result.hasException) {
              return KasiSheetView(
                child: QueryResultView(result, refetch: refetch),
              );
            }
            if (result.parsedData == null) return const Text("No data");
            return SelectServiceView(data: result.parsedData!.getFare);
          });
    });
  }
}

