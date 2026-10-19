import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'kasiman_account.graphql.dart';

typedef KasimanStatementItem = Query$KasimanStatement$kasimanStatement$items;

class KasimanStatementState {
  final List<KasimanStatementItem> items;
  final int totalCount;
  final String? currency;
  final bool loading;
  final OperationException? error;

  const KasimanStatementState({
    this.items = const [],
    this.totalCount = 0,
    this.currency,
    this.loading = false,
    this.error,
  });

  bool get hasMore => items.length < totalCount;
}

/// Relevé paginé du Kasiman (`kasimanStatement`, tiré du grand livre).
class KasimanStatementCubit extends Cubit<KasimanStatementState> {
  static const int pageSize = 20;

  final GraphQLClient client;

  KasimanStatementCubit(this.client) : super(const KasimanStatementState());

  Future<void> reload() => _load(reset: true);

  Future<void> loadMore() async {
    if (state.loading || !state.hasMore) return;
    await _load(reset: false);
  }

  Future<void> _load({required bool reset}) async {
    if (state.loading) return;
    final offset = reset ? 0 : state.items.length;
    emit(KasimanStatementState(
        items: reset ? const [] : state.items,
        totalCount: reset ? 0 : state.totalCount,
        currency: state.currency,
        loading: true));
    final result = await client.query$KasimanStatement(
        Options$Query$KasimanStatement(
            fetchPolicy: FetchPolicy.networkOnly,
            variables: Variables$Query$KasimanStatement(
                limit: pageSize, offset: offset)));
    if (isClosed) return;
    if (result.hasException) {
      emit(KasimanStatementState(
          items: state.items,
          totalCount: state.totalCount,
          currency: state.currency,
          error: result.exception));
      return;
    }
    final data = result.parsedData?.kasimanStatement;
    emit(KasimanStatementState(
      items: [...(reset ? const <KasimanStatementItem>[] : state.items), ...?data?.items],
      totalCount: data?.totalCount ?? 0,
      currency: data?.currency.trim() ?? state.currency,
    ));
  }
}
