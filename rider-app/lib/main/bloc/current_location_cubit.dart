import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';
import 'package:kasi_rider/location_selection/welcome_card/place_search_sheet_view.dart';

class CurrentLocationCubit extends Cubit<FullLocation?> {
  CurrentLocationCubit() : super(null);

  /// Émet si la position a réellement bougé (> ~10 m, distance géodésique) OU
  /// si l'adresse change — cas de l'enrichissement du géocodage qui arrive
  /// APRÈS la position GPS brute (adresse vide). L'ancienne garde
  /// (`latitude - latitude > 0.0001`, unidirectionnelle et latitude seule)
  /// bloquait la plupart des mises à jour.
  void updateLocation(FullLocation location) {
    final current = state;
    if (current == null) {
      emit(location);
      return;
    }
    final movedMeters =
        const Distance().distance(current.latlng, location.latlng);
    if (movedMeters > 10 || current.address != location.address) {
      emit(location);
    }
  }
}
