import 'package:kasi_driver/main.graphql.dart';
import 'package:kasi_driver/schema.gql.dart';
import 'package:kasi_driver/wallet/kasiman_account_cubit.dart';
import 'package:kasi_driver/wallet/kasiman_debt_views.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'driver_distance_select_view.dart';
import 'current_order_resync.dart';
import 'main_bloc.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'order_item_view.dart';

class OrdersCarouselView extends StatelessWidget {
  final PageController carouselController = PageController();

  OrdersCarouselView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final mainBloc = context.read<MainBloc>();
    // La liste initiale ne vient plus d'un `Query$AvailableOrders$Widget` ici :
    // son résultat n'était jamais transmis au bloc (seules les souscriptions
    // l'alimentaient), et en cas d'échec réseau il affichait une erreur À LA
    // PLACE des souscriptions, qui n'étaient alors pas montées du tout. La
    // lecture et les relectures des offres sont faites par `OrdersResyncScope`
    // (p1-resync) ; ce widget ne garde que l'écoute en temps réel.
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.all(16),
      child: Builder(builder: (context) {
        return Subscription$OrderCreated$Widget(
            onSubscriptionResult: (subscriptionResult, client) {
          if (subscriptionResult.parsedData != null) {
            mainBloc.add(AvailabledOrderAdded(
                subscriptionResult.parsedData!.orderCreated));
          }
        }, builder: (created) {
          return Subscription$OrderRemoved$Widget(
              onSubscriptionResult: (subscriptionResult, client) {
            if (subscriptionResult.parsedData != null) {
              mainBloc.add(AvailableOrderRemoved(
                  subscriptionResult.parsedData!.orderRemoved));
            }
          }, builder: (removed) {
            return Mutation$UpdateOrderStatus$Widget(
                options: WidgetOptions$Mutation$UpdateOrderStatus(
                    onCompleted: (result, parsedData) {
                  if (parsedData == null) return;
                  mainBloc.add(CurrentOrderUpdated(parsedData.updateOneOrder));
                }, onError: (error) {
                  // Écran déjà reconstruit (réponse après le délai) : on ne
                  // touche plus à ce contexte, on relit la course.
                  if (!context.mounted) {
                    handleOrderActionError(context, error);
                    return;
                  }
                  // p2-argent I3 : refus au-delà du plafond de dette
                  // (`KASIMAN_DEBT_LIMIT`) -> écran de blocage avec le
                  // montant dû et la marche à suivre, au lieu d'un
                  // simple message.
                  final debtCubit = context.read<KasimanAccountCubit>();
                  if (debtCubit.applyDebtLimitError(error)) {
                    debtCubit.refresh(GraphQLProvider.of(context).value);
                    DebtBlockedView.open(context);
                    return;
                  }
                  // bug-timeout : l'acceptation a pu aboutir côté serveur ;
                  // on relit la course au lieu de laisser rejouer.
                  handleOrderActionError(context, error);
                }),
                builder: (runMutation, result) =>
                    BlocBuilder<MainBloc, MainState>(builder: (context, state) {
                      // À l'acceptation d'une course l'état devient
                      // StatusInService ; ce builder peut se reconstruire sur
                      // cette transition, où un `as StatusOnline` planterait.
                      if (state is! StatusOnline) {
                        return const SizedBox.shrink();
                      }
                      if (state.orders.isEmpty) {
                        return const DriverDistanceSelect();
                      }
                      return PageView.builder(
                          controller: PageController(viewportFraction: 0.9),
                          itemCount: state.orders.length,
                          onPageChanged: (index) =>
                              mainBloc.add(SelectedOrderChanged(index)),
                          itemBuilder: (context, index) => OrderItemView(
                                order: state.orders[index],
                                isActionActive: !(result?.isLoading ?? false),
                                onAcceptCallback: (String orderId) async {
                                  runMutation(
                                      Variables$Mutation$UpdateOrderStatus(
                                          orderId: orderId,
                                          status:
                                              Enum$OrderStatus.DriverAccepted));
                                },
                                onRejectCallback: (String orderId) =>
                                    _rejectOrder(context, orderId),
                              ));
                    }));
          });
        });
      }),
    );
  }

  /// p2-dispatch D4 : l'offre quitte l'écran tout de suite ; l'appel part
  /// ensuite sans rien attendre. Faux (mode `legacy`, offre déjà fermée) ou
  /// erreur réseau ne changent rien pour le Kasiman : aucun message bloquant.
  void _rejectOrder(BuildContext context, String orderId) {
    context.read<MainBloc>().add(AvailableOrderRejected(orderId));
    final client = GraphQLProvider.of(context).value;
    () async {
      try {
        final result = await client.mutate$RejectOrder(
            Options$Mutation$RejectOrder(
                variables: Variables$Mutation$RejectOrder(orderId: orderId)));
        debugPrint('[p2-dispatch] rejectOrder($orderId) -> '
            '${result.hasException ? result.exception : result.parsedData?.rejectOrder}');
      } catch (e) {
        debugPrint('[p2-dispatch] rejectOrder($orderId) a échoué : $e');
      }
    }();
  }
}
