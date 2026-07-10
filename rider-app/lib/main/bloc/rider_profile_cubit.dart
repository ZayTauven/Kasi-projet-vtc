import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kasi_rider/main/order.graphql.dart';

class RiderProfileCubit extends Cubit<Query$GetCurrentOrder$rider?> {
  RiderProfileCubit() : super(null);

  void updateProfile(Query$GetCurrentOrder$rider? rider) {
    emit(rider);
  }
}
