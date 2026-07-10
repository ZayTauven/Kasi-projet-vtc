import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/main/order.graphql.dart';

class LastOrdersCubit
    extends Cubit<List<Query$GetCurrentOrder$rider$lastOrders>> {
  LastOrdersCubit() : super([]);

  setLastOrders(List<Query$GetCurrentOrder$rider$lastOrders> orders) {
    emit(orders);
  }
}
