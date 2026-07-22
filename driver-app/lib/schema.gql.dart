import 'package:kasi_driver/graphql/scalars/connection_cursor.dart';
import 'package:kasi_driver/graphql/scalars/datetime.dart';

class Input$AddDocumentsToDriverInput {
  factory Input$AddDocumentsToDriverInput({
    required String id,
    required List<String> relationIds,
  }) => Input$AddDocumentsToDriverInput._({
    r'id': id,
    r'relationIds': relationIds,
  });

  Input$AddDocumentsToDriverInput._(this._$data);

  factory Input$AddDocumentsToDriverInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$id = data['id'];
    result$data['id'] = (l$id as String);
    final l$relationIds = data['relationIds'];
    result$data['relationIds'] = (l$relationIds as List<dynamic>)
        .map((e) => (e as String))
        .toList();
    return Input$AddDocumentsToDriverInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String get id => (_$data['id'] as String);

  List<String> get relationIds => (_$data['relationIds'] as List<String>);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$id = id;
    result$data['id'] = l$id;
    final l$relationIds = relationIds;
    result$data['relationIds'] = l$relationIds.map((e) => e).toList();
    return result$data;
  }

  CopyWith$Input$AddDocumentsToDriverInput<Input$AddDocumentsToDriverInput>
  get copyWith => CopyWith$Input$AddDocumentsToDriverInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$AddDocumentsToDriverInput ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (l$id != lOther$id) {
      return false;
    }
    final l$relationIds = relationIds;
    final lOther$relationIds = other.relationIds;
    if (l$relationIds.length != lOther$relationIds.length) {
      return false;
    }
    for (int i = 0; i < l$relationIds.length; i++) {
      final l$relationIds$entry = l$relationIds[i];
      final lOther$relationIds$entry = lOther$relationIds[i];
      if (l$relationIds$entry != lOther$relationIds$entry) {
        return false;
      }
    }
    return true;
  }

  @override
  int get hashCode {
    final l$id = id;
    final l$relationIds = relationIds;
    return Object.hashAll([l$id, Object.hashAll(l$relationIds.map((v) => v))]);
  }
}

abstract class CopyWith$Input$AddDocumentsToDriverInput<TRes> {
  factory CopyWith$Input$AddDocumentsToDriverInput(
    Input$AddDocumentsToDriverInput instance,
    TRes Function(Input$AddDocumentsToDriverInput) then,
  ) = _CopyWithImpl$Input$AddDocumentsToDriverInput;

  factory CopyWith$Input$AddDocumentsToDriverInput.stub(TRes res) =
      _CopyWithStubImpl$Input$AddDocumentsToDriverInput;

  TRes call({String? id, List<String>? relationIds});
}

class _CopyWithImpl$Input$AddDocumentsToDriverInput<TRes>
    implements CopyWith$Input$AddDocumentsToDriverInput<TRes> {
  _CopyWithImpl$Input$AddDocumentsToDriverInput(this._instance, this._then);

  final Input$AddDocumentsToDriverInput _instance;

  final TRes Function(Input$AddDocumentsToDriverInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? id = _undefined, Object? relationIds = _undefined}) =>
      _then(
        Input$AddDocumentsToDriverInput._({
          ..._instance._$data,
          if (id != _undefined && id != null) 'id': (id as String),
          if (relationIds != _undefined && relationIds != null)
            'relationIds': (relationIds as List<String>),
        }),
      );
}

class _CopyWithStubImpl$Input$AddDocumentsToDriverInput<TRes>
    implements CopyWith$Input$AddDocumentsToDriverInput<TRes> {
  _CopyWithStubImpl$Input$AddDocumentsToDriverInput(this._res);

  TRes _res;

  call({String? id, List<String>? relationIds}) => _res;
}

class Input$AnnouncementFilter {
  factory Input$AnnouncementFilter({
    List<Input$AnnouncementFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$AnnouncementFilter>? or,
    Input$AnnouncementUserTypeFilterComparison? userType,
  }) => Input$AnnouncementFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
    if (userType != null) r'userType': userType,
  });

  Input$AnnouncementFilter._(this._$data);

  factory Input$AnnouncementFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) =>
                Input$AnnouncementFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) =>
                Input$AnnouncementFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('userType')) {
      final l$userType = data['userType'];
      result$data['userType'] = l$userType == null
          ? null
          : Input$AnnouncementUserTypeFilterComparison.fromJson(
              (l$userType as Map<String, dynamic>),
            );
    }
    return Input$AnnouncementFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$AnnouncementFilter>? get and =>
      (_$data['and'] as List<Input$AnnouncementFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$AnnouncementFilter>? get or =>
      (_$data['or'] as List<Input$AnnouncementFilter>?);

  Input$AnnouncementUserTypeFilterComparison? get userType =>
      (_$data['userType'] as Input$AnnouncementUserTypeFilterComparison?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('userType')) {
      final l$userType = userType;
      result$data['userType'] = l$userType?.toJson();
    }
    return result$data;
  }

  CopyWith$Input$AnnouncementFilter<Input$AnnouncementFilter> get copyWith =>
      CopyWith$Input$AnnouncementFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$AnnouncementFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    final l$userType = userType;
    final lOther$userType = other.userType;
    if (_$data.containsKey('userType') !=
        other._$data.containsKey('userType')) {
      return false;
    }
    if (l$userType != lOther$userType) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    final l$userType = userType;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
      _$data.containsKey('userType') ? l$userType : const {},
    ]);
  }
}

abstract class CopyWith$Input$AnnouncementFilter<TRes> {
  factory CopyWith$Input$AnnouncementFilter(
    Input$AnnouncementFilter instance,
    TRes Function(Input$AnnouncementFilter) then,
  ) = _CopyWithImpl$Input$AnnouncementFilter;

  factory CopyWith$Input$AnnouncementFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$AnnouncementFilter;

  TRes call({
    List<Input$AnnouncementFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$AnnouncementFilter>? or,
    Input$AnnouncementUserTypeFilterComparison? userType,
  });
  TRes and(
    Iterable<Input$AnnouncementFilter>? Function(
      Iterable<CopyWith$Input$AnnouncementFilter<Input$AnnouncementFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$AnnouncementFilter>? Function(
      Iterable<CopyWith$Input$AnnouncementFilter<Input$AnnouncementFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$AnnouncementUserTypeFilterComparison<TRes> get userType;
}

class _CopyWithImpl$Input$AnnouncementFilter<TRes>
    implements CopyWith$Input$AnnouncementFilter<TRes> {
  _CopyWithImpl$Input$AnnouncementFilter(this._instance, this._then);

  final Input$AnnouncementFilter _instance;

  final TRes Function(Input$AnnouncementFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
    Object? userType = _undefined,
  }) => _then(
    Input$AnnouncementFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$AnnouncementFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$AnnouncementFilter>?),
      if (userType != _undefined)
        'userType': (userType as Input$AnnouncementUserTypeFilterComparison?),
    }),
  );

  TRes and(
    Iterable<Input$AnnouncementFilter>? Function(
      Iterable<CopyWith$Input$AnnouncementFilter<Input$AnnouncementFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$AnnouncementFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$AnnouncementFilter>? Function(
      Iterable<CopyWith$Input$AnnouncementFilter<Input$AnnouncementFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$AnnouncementFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$AnnouncementUserTypeFilterComparison<TRes> get userType {
    final local$userType = _instance.userType;
    return local$userType == null
        ? CopyWith$Input$AnnouncementUserTypeFilterComparison.stub(
            _then(_instance),
          )
        : CopyWith$Input$AnnouncementUserTypeFilterComparison(
            local$userType,
            (e) => call(userType: e),
          );
  }
}

class _CopyWithStubImpl$Input$AnnouncementFilter<TRes>
    implements CopyWith$Input$AnnouncementFilter<TRes> {
  _CopyWithStubImpl$Input$AnnouncementFilter(this._res);

  TRes _res;

  call({
    List<Input$AnnouncementFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$AnnouncementFilter>? or,
    Input$AnnouncementUserTypeFilterComparison? userType,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;

  CopyWith$Input$AnnouncementUserTypeFilterComparison<TRes> get userType =>
      CopyWith$Input$AnnouncementUserTypeFilterComparison.stub(_res);
}

class Input$AnnouncementSort {
  factory Input$AnnouncementSort({
    required Enum$SortDirection direction,
    required Enum$AnnouncementSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$AnnouncementSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$AnnouncementSort._(this._$data);

  factory Input$AnnouncementSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$AnnouncementSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$AnnouncementSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$AnnouncementSortFields get field =>
      (_$data['field'] as Enum$AnnouncementSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$AnnouncementSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$AnnouncementSort<Input$AnnouncementSort> get copyWith =>
      CopyWith$Input$AnnouncementSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$AnnouncementSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$AnnouncementSort<TRes> {
  factory CopyWith$Input$AnnouncementSort(
    Input$AnnouncementSort instance,
    TRes Function(Input$AnnouncementSort) then,
  ) = _CopyWithImpl$Input$AnnouncementSort;

  factory CopyWith$Input$AnnouncementSort.stub(TRes res) =
      _CopyWithStubImpl$Input$AnnouncementSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$AnnouncementSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$AnnouncementSort<TRes>
    implements CopyWith$Input$AnnouncementSort<TRes> {
  _CopyWithImpl$Input$AnnouncementSort(this._instance, this._then);

  final Input$AnnouncementSort _instance;

  final TRes Function(Input$AnnouncementSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$AnnouncementSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$AnnouncementSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$AnnouncementSort<TRes>
    implements CopyWith$Input$AnnouncementSort<TRes> {
  _CopyWithStubImpl$Input$AnnouncementSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$AnnouncementSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$AnnouncementUserTypeFilterComparison {
  factory Input$AnnouncementUserTypeFilterComparison({
    Enum$AnnouncementUserType? eq,
    Enum$AnnouncementUserType? gt,
    Enum$AnnouncementUserType? gte,
    Enum$AnnouncementUserType? iLike,
    List<Enum$AnnouncementUserType>? $in,
    bool? $is,
    bool? isNot,
    Enum$AnnouncementUserType? like,
    Enum$AnnouncementUserType? lt,
    Enum$AnnouncementUserType? lte,
    Enum$AnnouncementUserType? neq,
    Enum$AnnouncementUserType? notILike,
    List<Enum$AnnouncementUserType>? notIn,
    Enum$AnnouncementUserType? notLike,
  }) => Input$AnnouncementUserTypeFilterComparison._({
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if (iLike != null) r'iLike': iLike,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (like != null) r'like': like,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notILike != null) r'notILike': notILike,
    if (notIn != null) r'notIn': notIn,
    if (notLike != null) r'notLike': notLike,
  });

  Input$AnnouncementUserTypeFilterComparison._(this._$data);

  factory Input$AnnouncementUserTypeFilterComparison.fromJson(
    Map<String, dynamic> data,
  ) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = l$eq == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$eq as String));
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = l$gt == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$gt as String));
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = l$gte == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$gte as String));
    }
    if (data.containsKey('iLike')) {
      final l$iLike = data['iLike'];
      result$data['iLike'] = l$iLike == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$iLike as String));
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => fromJson$Enum$AnnouncementUserType((e as String)))
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('like')) {
      final l$like = data['like'];
      result$data['like'] = l$like == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$like as String));
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = l$lt == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$lt as String));
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = l$lte == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$lte as String));
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = l$neq == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$neq as String));
    }
    if (data.containsKey('notILike')) {
      final l$notILike = data['notILike'];
      result$data['notILike'] = l$notILike == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$notILike as String));
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => fromJson$Enum$AnnouncementUserType((e as String)))
          .toList();
    }
    if (data.containsKey('notLike')) {
      final l$notLike = data['notLike'];
      result$data['notLike'] = l$notLike == null
          ? null
          : fromJson$Enum$AnnouncementUserType((l$notLike as String));
    }
    return Input$AnnouncementUserTypeFilterComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$AnnouncementUserType? get eq =>
      (_$data['eq'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get gt =>
      (_$data['gt'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get gte =>
      (_$data['gte'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get iLike =>
      (_$data['iLike'] as Enum$AnnouncementUserType?);

  List<Enum$AnnouncementUserType>? get $in =>
      (_$data['in'] as List<Enum$AnnouncementUserType>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  Enum$AnnouncementUserType? get like =>
      (_$data['like'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get lt =>
      (_$data['lt'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get lte =>
      (_$data['lte'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get neq =>
      (_$data['neq'] as Enum$AnnouncementUserType?);

  Enum$AnnouncementUserType? get notILike =>
      (_$data['notILike'] as Enum$AnnouncementUserType?);

  List<Enum$AnnouncementUserType>? get notIn =>
      (_$data['notIn'] as List<Enum$AnnouncementUserType>?);

  Enum$AnnouncementUserType? get notLike =>
      (_$data['notLike'] as Enum$AnnouncementUserType?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$eq);
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$gt);
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$gte);
    }
    if (_$data.containsKey('iLike')) {
      final l$iLike = iLike;
      result$data['iLike'] = l$iLike == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$iLike);
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in
          ?.map((e) => toJson$Enum$AnnouncementUserType(e))
          .toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('like')) {
      final l$like = like;
      result$data['like'] = l$like == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$like);
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$lt);
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$lte);
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$neq);
    }
    if (_$data.containsKey('notILike')) {
      final l$notILike = notILike;
      result$data['notILike'] = l$notILike == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$notILike);
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn
          ?.map((e) => toJson$Enum$AnnouncementUserType(e))
          .toList();
    }
    if (_$data.containsKey('notLike')) {
      final l$notLike = notLike;
      result$data['notLike'] = l$notLike == null
          ? null
          : toJson$Enum$AnnouncementUserType(l$notLike);
    }
    return result$data;
  }

  CopyWith$Input$AnnouncementUserTypeFilterComparison<
    Input$AnnouncementUserTypeFilterComparison
  >
  get copyWith =>
      CopyWith$Input$AnnouncementUserTypeFilterComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$AnnouncementUserTypeFilterComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$iLike = iLike;
    final lOther$iLike = other.iLike;
    if (_$data.containsKey('iLike') != other._$data.containsKey('iLike')) {
      return false;
    }
    if (l$iLike != lOther$iLike) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$like = like;
    final lOther$like = other.like;
    if (_$data.containsKey('like') != other._$data.containsKey('like')) {
      return false;
    }
    if (l$like != lOther$like) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notILike = notILike;
    final lOther$notILike = other.notILike;
    if (_$data.containsKey('notILike') !=
        other._$data.containsKey('notILike')) {
      return false;
    }
    if (l$notILike != lOther$notILike) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    final l$notLike = notLike;
    final lOther$notLike = other.notLike;
    if (_$data.containsKey('notLike') != other._$data.containsKey('notLike')) {
      return false;
    }
    if (l$notLike != lOther$notLike) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$iLike = iLike;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$like = like;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notILike = notILike;
    final l$notIn = notIn;
    final l$notLike = notLike;
    return Object.hashAll([
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('iLike') ? l$iLike : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('like') ? l$like : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notILike') ? l$notILike : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
      _$data.containsKey('notLike') ? l$notLike : const {},
    ]);
  }
}

abstract class CopyWith$Input$AnnouncementUserTypeFilterComparison<TRes> {
  factory CopyWith$Input$AnnouncementUserTypeFilterComparison(
    Input$AnnouncementUserTypeFilterComparison instance,
    TRes Function(Input$AnnouncementUserTypeFilterComparison) then,
  ) = _CopyWithImpl$Input$AnnouncementUserTypeFilterComparison;

  factory CopyWith$Input$AnnouncementUserTypeFilterComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$AnnouncementUserTypeFilterComparison;

  TRes call({
    Enum$AnnouncementUserType? eq,
    Enum$AnnouncementUserType? gt,
    Enum$AnnouncementUserType? gte,
    Enum$AnnouncementUserType? iLike,
    List<Enum$AnnouncementUserType>? $in,
    bool? $is,
    bool? isNot,
    Enum$AnnouncementUserType? like,
    Enum$AnnouncementUserType? lt,
    Enum$AnnouncementUserType? lte,
    Enum$AnnouncementUserType? neq,
    Enum$AnnouncementUserType? notILike,
    List<Enum$AnnouncementUserType>? notIn,
    Enum$AnnouncementUserType? notLike,
  });
}

class _CopyWithImpl$Input$AnnouncementUserTypeFilterComparison<TRes>
    implements CopyWith$Input$AnnouncementUserTypeFilterComparison<TRes> {
  _CopyWithImpl$Input$AnnouncementUserTypeFilterComparison(
    this._instance,
    this._then,
  );

  final Input$AnnouncementUserTypeFilterComparison _instance;

  final TRes Function(Input$AnnouncementUserTypeFilterComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? iLike = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? like = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notILike = _undefined,
    Object? notIn = _undefined,
    Object? notLike = _undefined,
  }) => _then(
    Input$AnnouncementUserTypeFilterComparison._({
      ..._instance._$data,
      if (eq != _undefined) 'eq': (eq as Enum$AnnouncementUserType?),
      if (gt != _undefined) 'gt': (gt as Enum$AnnouncementUserType?),
      if (gte != _undefined) 'gte': (gte as Enum$AnnouncementUserType?),
      if (iLike != _undefined) 'iLike': (iLike as Enum$AnnouncementUserType?),
      if ($in != _undefined) 'in': ($in as List<Enum$AnnouncementUserType>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (like != _undefined) 'like': (like as Enum$AnnouncementUserType?),
      if (lt != _undefined) 'lt': (lt as Enum$AnnouncementUserType?),
      if (lte != _undefined) 'lte': (lte as Enum$AnnouncementUserType?),
      if (neq != _undefined) 'neq': (neq as Enum$AnnouncementUserType?),
      if (notILike != _undefined)
        'notILike': (notILike as Enum$AnnouncementUserType?),
      if (notIn != _undefined)
        'notIn': (notIn as List<Enum$AnnouncementUserType>?),
      if (notLike != _undefined)
        'notLike': (notLike as Enum$AnnouncementUserType?),
    }),
  );
}

class _CopyWithStubImpl$Input$AnnouncementUserTypeFilterComparison<TRes>
    implements CopyWith$Input$AnnouncementUserTypeFilterComparison<TRes> {
  _CopyWithStubImpl$Input$AnnouncementUserTypeFilterComparison(this._res);

  TRes _res;

  call({
    Enum$AnnouncementUserType? eq,
    Enum$AnnouncementUserType? gt,
    Enum$AnnouncementUserType? gte,
    Enum$AnnouncementUserType? iLike,
    List<Enum$AnnouncementUserType>? $in,
    bool? $is,
    bool? isNot,
    Enum$AnnouncementUserType? like,
    Enum$AnnouncementUserType? lt,
    Enum$AnnouncementUserType? lte,
    Enum$AnnouncementUserType? neq,
    Enum$AnnouncementUserType? notILike,
    List<Enum$AnnouncementUserType>? notIn,
    Enum$AnnouncementUserType? notLike,
  }) => _res;
}

class Input$BooleanFieldComparison {
  factory Input$BooleanFieldComparison({bool? $is, bool? isNot}) =>
      Input$BooleanFieldComparison._({
        if ($is != null) r'is': $is,
        if (isNot != null) r'isNot': isNot,
      });

  Input$BooleanFieldComparison._(this._$data);

  factory Input$BooleanFieldComparison.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    return Input$BooleanFieldComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    return result$data;
  }

  CopyWith$Input$BooleanFieldComparison<Input$BooleanFieldComparison>
  get copyWith => CopyWith$Input$BooleanFieldComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$BooleanFieldComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$$is = $is;
    final l$isNot = isNot;
    return Object.hashAll([
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
    ]);
  }
}

abstract class CopyWith$Input$BooleanFieldComparison<TRes> {
  factory CopyWith$Input$BooleanFieldComparison(
    Input$BooleanFieldComparison instance,
    TRes Function(Input$BooleanFieldComparison) then,
  ) = _CopyWithImpl$Input$BooleanFieldComparison;

  factory CopyWith$Input$BooleanFieldComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$BooleanFieldComparison;

  TRes call({bool? $is, bool? isNot});
}

class _CopyWithImpl$Input$BooleanFieldComparison<TRes>
    implements CopyWith$Input$BooleanFieldComparison<TRes> {
  _CopyWithImpl$Input$BooleanFieldComparison(this._instance, this._then);

  final Input$BooleanFieldComparison _instance;

  final TRes Function(Input$BooleanFieldComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? $is = _undefined, Object? isNot = _undefined}) => _then(
    Input$BooleanFieldComparison._({
      ..._instance._$data,
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
    }),
  );
}

class _CopyWithStubImpl$Input$BooleanFieldComparison<TRes>
    implements CopyWith$Input$BooleanFieldComparison<TRes> {
  _CopyWithStubImpl$Input$BooleanFieldComparison(this._res);

  TRes _res;

  call({bool? $is, bool? isNot}) => _res;
}

class Input$CarColorFilter {
  factory Input$CarColorFilter({
    List<Input$CarColorFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$CarColorFilter>? or,
  }) => Input$CarColorFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$CarColorFilter._(this._$data);

  factory Input$CarColorFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$CarColorFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$CarColorFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    return Input$CarColorFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$CarColorFilter>? get and =>
      (_$data['and'] as List<Input$CarColorFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$CarColorFilter>? get or =>
      (_$data['or'] as List<Input$CarColorFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$CarColorFilter<Input$CarColorFilter> get copyWith =>
      CopyWith$Input$CarColorFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CarColorFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$CarColorFilter<TRes> {
  factory CopyWith$Input$CarColorFilter(
    Input$CarColorFilter instance,
    TRes Function(Input$CarColorFilter) then,
  ) = _CopyWithImpl$Input$CarColorFilter;

  factory CopyWith$Input$CarColorFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$CarColorFilter;

  TRes call({
    List<Input$CarColorFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$CarColorFilter>? or,
  });
  TRes and(
    Iterable<Input$CarColorFilter>? Function(
      Iterable<CopyWith$Input$CarColorFilter<Input$CarColorFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$CarColorFilter>? Function(
      Iterable<CopyWith$Input$CarColorFilter<Input$CarColorFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$CarColorFilter<TRes>
    implements CopyWith$Input$CarColorFilter<TRes> {
  _CopyWithImpl$Input$CarColorFilter(this._instance, this._then);

  final Input$CarColorFilter _instance;

  final TRes Function(Input$CarColorFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$CarColorFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$CarColorFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$CarColorFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$CarColorFilter>? Function(
      Iterable<CopyWith$Input$CarColorFilter<Input$CarColorFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$CarColorFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$CarColorFilter>? Function(
      Iterable<CopyWith$Input$CarColorFilter<Input$CarColorFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$CarColorFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$CarColorFilter<TRes>
    implements CopyWith$Input$CarColorFilter<TRes> {
  _CopyWithStubImpl$Input$CarColorFilter(this._res);

  TRes _res;

  call({
    List<Input$CarColorFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$CarColorFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$CarColorSort {
  factory Input$CarColorSort({
    required Enum$SortDirection direction,
    required Enum$CarColorSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$CarColorSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$CarColorSort._(this._$data);

  factory Input$CarColorSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$CarColorSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$CarColorSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$CarColorSortFields get field =>
      (_$data['field'] as Enum$CarColorSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$CarColorSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$CarColorSort<Input$CarColorSort> get copyWith =>
      CopyWith$Input$CarColorSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CarColorSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$CarColorSort<TRes> {
  factory CopyWith$Input$CarColorSort(
    Input$CarColorSort instance,
    TRes Function(Input$CarColorSort) then,
  ) = _CopyWithImpl$Input$CarColorSort;

  factory CopyWith$Input$CarColorSort.stub(TRes res) =
      _CopyWithStubImpl$Input$CarColorSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$CarColorSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$CarColorSort<TRes>
    implements CopyWith$Input$CarColorSort<TRes> {
  _CopyWithImpl$Input$CarColorSort(this._instance, this._then);

  final Input$CarColorSort _instance;

  final TRes Function(Input$CarColorSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$CarColorSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$CarColorSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$CarColorSort<TRes>
    implements CopyWith$Input$CarColorSort<TRes> {
  _CopyWithStubImpl$Input$CarColorSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$CarColorSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$CarModelFilter {
  factory Input$CarModelFilter({
    List<Input$CarModelFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$CarModelFilter>? or,
  }) => Input$CarModelFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$CarModelFilter._(this._$data);

  factory Input$CarModelFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$CarModelFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$CarModelFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    return Input$CarModelFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$CarModelFilter>? get and =>
      (_$data['and'] as List<Input$CarModelFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$CarModelFilter>? get or =>
      (_$data['or'] as List<Input$CarModelFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$CarModelFilter<Input$CarModelFilter> get copyWith =>
      CopyWith$Input$CarModelFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CarModelFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$CarModelFilter<TRes> {
  factory CopyWith$Input$CarModelFilter(
    Input$CarModelFilter instance,
    TRes Function(Input$CarModelFilter) then,
  ) = _CopyWithImpl$Input$CarModelFilter;

  factory CopyWith$Input$CarModelFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$CarModelFilter;

  TRes call({
    List<Input$CarModelFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$CarModelFilter>? or,
  });
  TRes and(
    Iterable<Input$CarModelFilter>? Function(
      Iterable<CopyWith$Input$CarModelFilter<Input$CarModelFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$CarModelFilter>? Function(
      Iterable<CopyWith$Input$CarModelFilter<Input$CarModelFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$CarModelFilter<TRes>
    implements CopyWith$Input$CarModelFilter<TRes> {
  _CopyWithImpl$Input$CarModelFilter(this._instance, this._then);

  final Input$CarModelFilter _instance;

  final TRes Function(Input$CarModelFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$CarModelFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$CarModelFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$CarModelFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$CarModelFilter>? Function(
      Iterable<CopyWith$Input$CarModelFilter<Input$CarModelFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$CarModelFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$CarModelFilter>? Function(
      Iterable<CopyWith$Input$CarModelFilter<Input$CarModelFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$CarModelFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$CarModelFilter<TRes>
    implements CopyWith$Input$CarModelFilter<TRes> {
  _CopyWithStubImpl$Input$CarModelFilter(this._res);

  TRes _res;

  call({
    List<Input$CarModelFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$CarModelFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$CarModelSort {
  factory Input$CarModelSort({
    required Enum$SortDirection direction,
    required Enum$CarModelSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$CarModelSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$CarModelSort._(this._$data);

  factory Input$CarModelSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$CarModelSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$CarModelSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$CarModelSortFields get field =>
      (_$data['field'] as Enum$CarModelSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$CarModelSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$CarModelSort<Input$CarModelSort> get copyWith =>
      CopyWith$Input$CarModelSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CarModelSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$CarModelSort<TRes> {
  factory CopyWith$Input$CarModelSort(
    Input$CarModelSort instance,
    TRes Function(Input$CarModelSort) then,
  ) = _CopyWithImpl$Input$CarModelSort;

  factory CopyWith$Input$CarModelSort.stub(TRes res) =
      _CopyWithStubImpl$Input$CarModelSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$CarModelSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$CarModelSort<TRes>
    implements CopyWith$Input$CarModelSort<TRes> {
  _CopyWithImpl$Input$CarModelSort(this._instance, this._then);

  final Input$CarModelSort _instance;

  final TRes Function(Input$CarModelSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$CarModelSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$CarModelSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$CarModelSort<TRes>
    implements CopyWith$Input$CarModelSort<TRes> {
  _CopyWithStubImpl$Input$CarModelSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$CarModelSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$ComplaintInput {
  factory Input$ComplaintInput({
    String? content,
    required String requestId,
    bool? requestedByDriver,
    required String subject,
  }) => Input$ComplaintInput._({
    if (content != null) r'content': content,
    r'requestId': requestId,
    if (requestedByDriver != null) r'requestedByDriver': requestedByDriver,
    r'subject': subject,
  });

  Input$ComplaintInput._(this._$data);

  factory Input$ComplaintInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('content')) {
      final l$content = data['content'];
      result$data['content'] = (l$content as String?);
    }
    final l$requestId = data['requestId'];
    result$data['requestId'] = (l$requestId as String);
    if (data.containsKey('requestedByDriver')) {
      final l$requestedByDriver = data['requestedByDriver'];
      result$data['requestedByDriver'] = (l$requestedByDriver as bool?);
    }
    final l$subject = data['subject'];
    result$data['subject'] = (l$subject as String);
    return Input$ComplaintInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String? get content => (_$data['content'] as String?);

  String get requestId => (_$data['requestId'] as String);

  bool? get requestedByDriver => (_$data['requestedByDriver'] as bool?);

  String get subject => (_$data['subject'] as String);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('content')) {
      final l$content = content;
      result$data['content'] = l$content;
    }
    final l$requestId = requestId;
    result$data['requestId'] = l$requestId;
    if (_$data.containsKey('requestedByDriver')) {
      final l$requestedByDriver = requestedByDriver;
      result$data['requestedByDriver'] = l$requestedByDriver;
    }
    final l$subject = subject;
    result$data['subject'] = l$subject;
    return result$data;
  }

  CopyWith$Input$ComplaintInput<Input$ComplaintInput> get copyWith =>
      CopyWith$Input$ComplaintInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ComplaintInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$content = content;
    final lOther$content = other.content;
    if (_$data.containsKey('content') != other._$data.containsKey('content')) {
      return false;
    }
    if (l$content != lOther$content) {
      return false;
    }
    final l$requestId = requestId;
    final lOther$requestId = other.requestId;
    if (l$requestId != lOther$requestId) {
      return false;
    }
    final l$requestedByDriver = requestedByDriver;
    final lOther$requestedByDriver = other.requestedByDriver;
    if (_$data.containsKey('requestedByDriver') !=
        other._$data.containsKey('requestedByDriver')) {
      return false;
    }
    if (l$requestedByDriver != lOther$requestedByDriver) {
      return false;
    }
    final l$subject = subject;
    final lOther$subject = other.subject;
    if (l$subject != lOther$subject) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$content = content;
    final l$requestId = requestId;
    final l$requestedByDriver = requestedByDriver;
    final l$subject = subject;
    return Object.hashAll([
      _$data.containsKey('content') ? l$content : const {},
      l$requestId,
      _$data.containsKey('requestedByDriver') ? l$requestedByDriver : const {},
      l$subject,
    ]);
  }
}

abstract class CopyWith$Input$ComplaintInput<TRes> {
  factory CopyWith$Input$ComplaintInput(
    Input$ComplaintInput instance,
    TRes Function(Input$ComplaintInput) then,
  ) = _CopyWithImpl$Input$ComplaintInput;

  factory CopyWith$Input$ComplaintInput.stub(TRes res) =
      _CopyWithStubImpl$Input$ComplaintInput;

  TRes call({
    String? content,
    String? requestId,
    bool? requestedByDriver,
    String? subject,
  });
}

class _CopyWithImpl$Input$ComplaintInput<TRes>
    implements CopyWith$Input$ComplaintInput<TRes> {
  _CopyWithImpl$Input$ComplaintInput(this._instance, this._then);

  final Input$ComplaintInput _instance;

  final TRes Function(Input$ComplaintInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? content = _undefined,
    Object? requestId = _undefined,
    Object? requestedByDriver = _undefined,
    Object? subject = _undefined,
  }) => _then(
    Input$ComplaintInput._({
      ..._instance._$data,
      if (content != _undefined) 'content': (content as String?),
      if (requestId != _undefined && requestId != null)
        'requestId': (requestId as String),
      if (requestedByDriver != _undefined)
        'requestedByDriver': (requestedByDriver as bool?),
      if (subject != _undefined && subject != null)
        'subject': (subject as String),
    }),
  );
}

class _CopyWithStubImpl$Input$ComplaintInput<TRes>
    implements CopyWith$Input$ComplaintInput<TRes> {
  _CopyWithStubImpl$Input$ComplaintInput(this._res);

  TRes _res;

  call({
    String? content,
    String? requestId,
    bool? requestedByDriver,
    String? subject,
  }) => _res;
}

class Input$CreateOneComplaintInput {
  factory Input$CreateOneComplaintInput({
    required Input$ComplaintInput complaint,
  }) => Input$CreateOneComplaintInput._({r'complaint': complaint});

  Input$CreateOneComplaintInput._(this._$data);

  factory Input$CreateOneComplaintInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$complaint = data['complaint'];
    result$data['complaint'] = Input$ComplaintInput.fromJson(
      (l$complaint as Map<String, dynamic>),
    );
    return Input$CreateOneComplaintInput._(result$data);
  }

  Map<String, dynamic> _$data;

  Input$ComplaintInput get complaint =>
      (_$data['complaint'] as Input$ComplaintInput);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$complaint = complaint;
    result$data['complaint'] = l$complaint.toJson();
    return result$data;
  }

  CopyWith$Input$CreateOneComplaintInput<Input$CreateOneComplaintInput>
  get copyWith => CopyWith$Input$CreateOneComplaintInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CreateOneComplaintInput ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$complaint = complaint;
    final lOther$complaint = other.complaint;
    if (l$complaint != lOther$complaint) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$complaint = complaint;
    return Object.hashAll([l$complaint]);
  }
}

abstract class CopyWith$Input$CreateOneComplaintInput<TRes> {
  factory CopyWith$Input$CreateOneComplaintInput(
    Input$CreateOneComplaintInput instance,
    TRes Function(Input$CreateOneComplaintInput) then,
  ) = _CopyWithImpl$Input$CreateOneComplaintInput;

  factory CopyWith$Input$CreateOneComplaintInput.stub(TRes res) =
      _CopyWithStubImpl$Input$CreateOneComplaintInput;

  TRes call({Input$ComplaintInput? complaint});
  CopyWith$Input$ComplaintInput<TRes> get complaint;
}

class _CopyWithImpl$Input$CreateOneComplaintInput<TRes>
    implements CopyWith$Input$CreateOneComplaintInput<TRes> {
  _CopyWithImpl$Input$CreateOneComplaintInput(this._instance, this._then);

  final Input$CreateOneComplaintInput _instance;

  final TRes Function(Input$CreateOneComplaintInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? complaint = _undefined}) => _then(
    Input$CreateOneComplaintInput._({
      ..._instance._$data,
      if (complaint != _undefined && complaint != null)
        'complaint': (complaint as Input$ComplaintInput),
    }),
  );

  CopyWith$Input$ComplaintInput<TRes> get complaint {
    final local$complaint = _instance.complaint;
    return CopyWith$Input$ComplaintInput(
      local$complaint,
      (e) => call(complaint: e),
    );
  }
}

class _CopyWithStubImpl$Input$CreateOneComplaintInput<TRes>
    implements CopyWith$Input$CreateOneComplaintInput<TRes> {
  _CopyWithStubImpl$Input$CreateOneComplaintInput(this._res);

  TRes _res;

  call({Input$ComplaintInput? complaint}) => _res;

  CopyWith$Input$ComplaintInput<TRes> get complaint =>
      CopyWith$Input$ComplaintInput.stub(_res);
}

class Input$CreateOneOrderMessageInput {
  factory Input$CreateOneOrderMessageInput({
    required Input$OrderMessageInput orderMessage,
  }) => Input$CreateOneOrderMessageInput._({r'orderMessage': orderMessage});

  Input$CreateOneOrderMessageInput._(this._$data);

  factory Input$CreateOneOrderMessageInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$orderMessage = data['orderMessage'];
    result$data['orderMessage'] = Input$OrderMessageInput.fromJson(
      (l$orderMessage as Map<String, dynamic>),
    );
    return Input$CreateOneOrderMessageInput._(result$data);
  }

  Map<String, dynamic> _$data;

  Input$OrderMessageInput get orderMessage =>
      (_$data['orderMessage'] as Input$OrderMessageInput);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$orderMessage = orderMessage;
    result$data['orderMessage'] = l$orderMessage.toJson();
    return result$data;
  }

  CopyWith$Input$CreateOneOrderMessageInput<Input$CreateOneOrderMessageInput>
  get copyWith => CopyWith$Input$CreateOneOrderMessageInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CreateOneOrderMessageInput ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$orderMessage = orderMessage;
    final lOther$orderMessage = other.orderMessage;
    if (l$orderMessage != lOther$orderMessage) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$orderMessage = orderMessage;
    return Object.hashAll([l$orderMessage]);
  }
}

abstract class CopyWith$Input$CreateOneOrderMessageInput<TRes> {
  factory CopyWith$Input$CreateOneOrderMessageInput(
    Input$CreateOneOrderMessageInput instance,
    TRes Function(Input$CreateOneOrderMessageInput) then,
  ) = _CopyWithImpl$Input$CreateOneOrderMessageInput;

  factory CopyWith$Input$CreateOneOrderMessageInput.stub(TRes res) =
      _CopyWithStubImpl$Input$CreateOneOrderMessageInput;

  TRes call({Input$OrderMessageInput? orderMessage});
  CopyWith$Input$OrderMessageInput<TRes> get orderMessage;
}

class _CopyWithImpl$Input$CreateOneOrderMessageInput<TRes>
    implements CopyWith$Input$CreateOneOrderMessageInput<TRes> {
  _CopyWithImpl$Input$CreateOneOrderMessageInput(this._instance, this._then);

  final Input$CreateOneOrderMessageInput _instance;

  final TRes Function(Input$CreateOneOrderMessageInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? orderMessage = _undefined}) => _then(
    Input$CreateOneOrderMessageInput._({
      ..._instance._$data,
      if (orderMessage != _undefined && orderMessage != null)
        'orderMessage': (orderMessage as Input$OrderMessageInput),
    }),
  );

  CopyWith$Input$OrderMessageInput<TRes> get orderMessage {
    final local$orderMessage = _instance.orderMessage;
    return CopyWith$Input$OrderMessageInput(
      local$orderMessage,
      (e) => call(orderMessage: e),
    );
  }
}

class _CopyWithStubImpl$Input$CreateOneOrderMessageInput<TRes>
    implements CopyWith$Input$CreateOneOrderMessageInput<TRes> {
  _CopyWithStubImpl$Input$CreateOneOrderMessageInput(this._res);

  TRes _res;

  call({Input$OrderMessageInput? orderMessage}) => _res;

  CopyWith$Input$OrderMessageInput<TRes> get orderMessage =>
      CopyWith$Input$OrderMessageInput.stub(_res);
}

class Input$CursorPaging {
  factory Input$CursorPaging({
    String? after,
    String? before,
    int? first,
    int? last,
  }) => Input$CursorPaging._({
    if (after != null) r'after': after,
    if (before != null) r'before': before,
    if (first != null) r'first': first,
    if (last != null) r'last': last,
  });

  Input$CursorPaging._(this._$data);

  factory Input$CursorPaging.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('after')) {
      final l$after = data['after'];
      result$data['after'] = l$after == null
          ? null
          : fromGraphQLConnectionCursorToDartString(l$after);
    }
    if (data.containsKey('before')) {
      final l$before = data['before'];
      result$data['before'] = l$before == null
          ? null
          : fromGraphQLConnectionCursorToDartString(l$before);
    }
    if (data.containsKey('first')) {
      final l$first = data['first'];
      result$data['first'] = (l$first as int?);
    }
    if (data.containsKey('last')) {
      final l$last = data['last'];
      result$data['last'] = (l$last as int?);
    }
    return Input$CursorPaging._(result$data);
  }

  Map<String, dynamic> _$data;

  String? get after => (_$data['after'] as String?);

  String? get before => (_$data['before'] as String?);

  int? get first => (_$data['first'] as int?);

  int? get last => (_$data['last'] as int?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('after')) {
      final l$after = after;
      result$data['after'] = l$after == null
          ? null
          : fromDartStringToGraphQLConnectionCursor(l$after);
    }
    if (_$data.containsKey('before')) {
      final l$before = before;
      result$data['before'] = l$before == null
          ? null
          : fromDartStringToGraphQLConnectionCursor(l$before);
    }
    if (_$data.containsKey('first')) {
      final l$first = first;
      result$data['first'] = l$first;
    }
    if (_$data.containsKey('last')) {
      final l$last = last;
      result$data['last'] = l$last;
    }
    return result$data;
  }

  CopyWith$Input$CursorPaging<Input$CursorPaging> get copyWith =>
      CopyWith$Input$CursorPaging(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$CursorPaging || runtimeType != other.runtimeType) {
      return false;
    }
    final l$after = after;
    final lOther$after = other.after;
    if (_$data.containsKey('after') != other._$data.containsKey('after')) {
      return false;
    }
    if (l$after != lOther$after) {
      return false;
    }
    final l$before = before;
    final lOther$before = other.before;
    if (_$data.containsKey('before') != other._$data.containsKey('before')) {
      return false;
    }
    if (l$before != lOther$before) {
      return false;
    }
    final l$first = first;
    final lOther$first = other.first;
    if (_$data.containsKey('first') != other._$data.containsKey('first')) {
      return false;
    }
    if (l$first != lOther$first) {
      return false;
    }
    final l$last = last;
    final lOther$last = other.last;
    if (_$data.containsKey('last') != other._$data.containsKey('last')) {
      return false;
    }
    if (l$last != lOther$last) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$after = after;
    final l$before = before;
    final l$first = first;
    final l$last = last;
    return Object.hashAll([
      _$data.containsKey('after') ? l$after : const {},
      _$data.containsKey('before') ? l$before : const {},
      _$data.containsKey('first') ? l$first : const {},
      _$data.containsKey('last') ? l$last : const {},
    ]);
  }
}

abstract class CopyWith$Input$CursorPaging<TRes> {
  factory CopyWith$Input$CursorPaging(
    Input$CursorPaging instance,
    TRes Function(Input$CursorPaging) then,
  ) = _CopyWithImpl$Input$CursorPaging;

  factory CopyWith$Input$CursorPaging.stub(TRes res) =
      _CopyWithStubImpl$Input$CursorPaging;

  TRes call({String? after, String? before, int? first, int? last});
}

class _CopyWithImpl$Input$CursorPaging<TRes>
    implements CopyWith$Input$CursorPaging<TRes> {
  _CopyWithImpl$Input$CursorPaging(this._instance, this._then);

  final Input$CursorPaging _instance;

  final TRes Function(Input$CursorPaging) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? after = _undefined,
    Object? before = _undefined,
    Object? first = _undefined,
    Object? last = _undefined,
  }) => _then(
    Input$CursorPaging._({
      ..._instance._$data,
      if (after != _undefined) 'after': (after as String?),
      if (before != _undefined) 'before': (before as String?),
      if (first != _undefined) 'first': (first as int?),
      if (last != _undefined) 'last': (last as int?),
    }),
  );
}

class _CopyWithStubImpl$Input$CursorPaging<TRes>
    implements CopyWith$Input$CursorPaging<TRes> {
  _CopyWithStubImpl$Input$CursorPaging(this._res);

  TRes _res;

  call({String? after, String? before, int? first, int? last}) => _res;
}

class Input$DateFieldComparison {
  factory Input$DateFieldComparison({
    Input$DateFieldComparisonBetween? between,
    DateTime? eq,
    DateTime? gt,
    DateTime? gte,
    List<DateTime>? $in,
    bool? $is,
    bool? isNot,
    DateTime? lt,
    DateTime? lte,
    DateTime? neq,
    Input$DateFieldComparisonBetween? notBetween,
    List<DateTime>? notIn,
  }) => Input$DateFieldComparison._({
    if (between != null) r'between': between,
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notBetween != null) r'notBetween': notBetween,
    if (notIn != null) r'notIn': notIn,
  });

  Input$DateFieldComparison._(this._$data);

  factory Input$DateFieldComparison.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('between')) {
      final l$between = data['between'];
      result$data['between'] = l$between == null
          ? null
          : Input$DateFieldComparisonBetween.fromJson(
              (l$between as Map<String, dynamic>),
            );
    }
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = l$eq == null
          ? null
          : fromGraphQLDateTimeToDartDateTime(l$eq);
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = l$gt == null
          ? null
          : fromGraphQLDateTimeToDartDateTime(l$gt);
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = l$gte == null
          ? null
          : fromGraphQLDateTimeToDartDateTime(l$gte);
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => fromGraphQLDateTimeToDartDateTime(e))
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = l$lt == null
          ? null
          : fromGraphQLDateTimeToDartDateTime(l$lt);
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = l$lte == null
          ? null
          : fromGraphQLDateTimeToDartDateTime(l$lte);
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = l$neq == null
          ? null
          : fromGraphQLDateTimeToDartDateTime(l$neq);
    }
    if (data.containsKey('notBetween')) {
      final l$notBetween = data['notBetween'];
      result$data['notBetween'] = l$notBetween == null
          ? null
          : Input$DateFieldComparisonBetween.fromJson(
              (l$notBetween as Map<String, dynamic>),
            );
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => fromGraphQLDateTimeToDartDateTime(e))
          .toList();
    }
    return Input$DateFieldComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  Input$DateFieldComparisonBetween? get between =>
      (_$data['between'] as Input$DateFieldComparisonBetween?);

  DateTime? get eq => (_$data['eq'] as DateTime?);

  DateTime? get gt => (_$data['gt'] as DateTime?);

  DateTime? get gte => (_$data['gte'] as DateTime?);

  List<DateTime>? get $in => (_$data['in'] as List<DateTime>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  DateTime? get lt => (_$data['lt'] as DateTime?);

  DateTime? get lte => (_$data['lte'] as DateTime?);

  DateTime? get neq => (_$data['neq'] as DateTime?);

  Input$DateFieldComparisonBetween? get notBetween =>
      (_$data['notBetween'] as Input$DateFieldComparisonBetween?);

  List<DateTime>? get notIn => (_$data['notIn'] as List<DateTime>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('between')) {
      final l$between = between;
      result$data['between'] = l$between?.toJson();
    }
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq == null
          ? null
          : fromDartDateTimeToGraphQLDateTime(l$eq);
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt == null
          ? null
          : fromDartDateTimeToGraphQLDateTime(l$gt);
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte == null
          ? null
          : fromDartDateTimeToGraphQLDateTime(l$gte);
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in
          ?.map((e) => fromDartDateTimeToGraphQLDateTime(e))
          .toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt == null
          ? null
          : fromDartDateTimeToGraphQLDateTime(l$lt);
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte == null
          ? null
          : fromDartDateTimeToGraphQLDateTime(l$lte);
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq == null
          ? null
          : fromDartDateTimeToGraphQLDateTime(l$neq);
    }
    if (_$data.containsKey('notBetween')) {
      final l$notBetween = notBetween;
      result$data['notBetween'] = l$notBetween?.toJson();
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn
          ?.map((e) => fromDartDateTimeToGraphQLDateTime(e))
          .toList();
    }
    return result$data;
  }

  CopyWith$Input$DateFieldComparison<Input$DateFieldComparison> get copyWith =>
      CopyWith$Input$DateFieldComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$DateFieldComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$between = between;
    final lOther$between = other.between;
    if (_$data.containsKey('between') != other._$data.containsKey('between')) {
      return false;
    }
    if (l$between != lOther$between) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notBetween = notBetween;
    final lOther$notBetween = other.notBetween;
    if (_$data.containsKey('notBetween') !=
        other._$data.containsKey('notBetween')) {
      return false;
    }
    if (l$notBetween != lOther$notBetween) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$between = between;
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notBetween = notBetween;
    final l$notIn = notIn;
    return Object.hashAll([
      _$data.containsKey('between') ? l$between : const {},
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notBetween') ? l$notBetween : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$DateFieldComparison<TRes> {
  factory CopyWith$Input$DateFieldComparison(
    Input$DateFieldComparison instance,
    TRes Function(Input$DateFieldComparison) then,
  ) = _CopyWithImpl$Input$DateFieldComparison;

  factory CopyWith$Input$DateFieldComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$DateFieldComparison;

  TRes call({
    Input$DateFieldComparisonBetween? between,
    DateTime? eq,
    DateTime? gt,
    DateTime? gte,
    List<DateTime>? $in,
    bool? $is,
    bool? isNot,
    DateTime? lt,
    DateTime? lte,
    DateTime? neq,
    Input$DateFieldComparisonBetween? notBetween,
    List<DateTime>? notIn,
  });
  CopyWith$Input$DateFieldComparisonBetween<TRes> get between;
  CopyWith$Input$DateFieldComparisonBetween<TRes> get notBetween;
}

class _CopyWithImpl$Input$DateFieldComparison<TRes>
    implements CopyWith$Input$DateFieldComparison<TRes> {
  _CopyWithImpl$Input$DateFieldComparison(this._instance, this._then);

  final Input$DateFieldComparison _instance;

  final TRes Function(Input$DateFieldComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? between = _undefined,
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notBetween = _undefined,
    Object? notIn = _undefined,
  }) => _then(
    Input$DateFieldComparison._({
      ..._instance._$data,
      if (between != _undefined)
        'between': (between as Input$DateFieldComparisonBetween?),
      if (eq != _undefined) 'eq': (eq as DateTime?),
      if (gt != _undefined) 'gt': (gt as DateTime?),
      if (gte != _undefined) 'gte': (gte as DateTime?),
      if ($in != _undefined) 'in': ($in as List<DateTime>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (lt != _undefined) 'lt': (lt as DateTime?),
      if (lte != _undefined) 'lte': (lte as DateTime?),
      if (neq != _undefined) 'neq': (neq as DateTime?),
      if (notBetween != _undefined)
        'notBetween': (notBetween as Input$DateFieldComparisonBetween?),
      if (notIn != _undefined) 'notIn': (notIn as List<DateTime>?),
    }),
  );

  CopyWith$Input$DateFieldComparisonBetween<TRes> get between {
    final local$between = _instance.between;
    return local$between == null
        ? CopyWith$Input$DateFieldComparisonBetween.stub(_then(_instance))
        : CopyWith$Input$DateFieldComparisonBetween(
            local$between,
            (e) => call(between: e),
          );
  }

  CopyWith$Input$DateFieldComparisonBetween<TRes> get notBetween {
    final local$notBetween = _instance.notBetween;
    return local$notBetween == null
        ? CopyWith$Input$DateFieldComparisonBetween.stub(_then(_instance))
        : CopyWith$Input$DateFieldComparisonBetween(
            local$notBetween,
            (e) => call(notBetween: e),
          );
  }
}

class _CopyWithStubImpl$Input$DateFieldComparison<TRes>
    implements CopyWith$Input$DateFieldComparison<TRes> {
  _CopyWithStubImpl$Input$DateFieldComparison(this._res);

  TRes _res;

  call({
    Input$DateFieldComparisonBetween? between,
    DateTime? eq,
    DateTime? gt,
    DateTime? gte,
    List<DateTime>? $in,
    bool? $is,
    bool? isNot,
    DateTime? lt,
    DateTime? lte,
    DateTime? neq,
    Input$DateFieldComparisonBetween? notBetween,
    List<DateTime>? notIn,
  }) => _res;

  CopyWith$Input$DateFieldComparisonBetween<TRes> get between =>
      CopyWith$Input$DateFieldComparisonBetween.stub(_res);

  CopyWith$Input$DateFieldComparisonBetween<TRes> get notBetween =>
      CopyWith$Input$DateFieldComparisonBetween.stub(_res);
}

class Input$DateFieldComparisonBetween {
  factory Input$DateFieldComparisonBetween({
    required DateTime lower,
    required DateTime upper,
  }) => Input$DateFieldComparisonBetween._({r'lower': lower, r'upper': upper});

  Input$DateFieldComparisonBetween._(this._$data);

  factory Input$DateFieldComparisonBetween.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$lower = data['lower'];
    result$data['lower'] = fromGraphQLDateTimeToDartDateTime(l$lower);
    final l$upper = data['upper'];
    result$data['upper'] = fromGraphQLDateTimeToDartDateTime(l$upper);
    return Input$DateFieldComparisonBetween._(result$data);
  }

  Map<String, dynamic> _$data;

  DateTime get lower => (_$data['lower'] as DateTime);

  DateTime get upper => (_$data['upper'] as DateTime);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$lower = lower;
    result$data['lower'] = fromDartDateTimeToGraphQLDateTime(l$lower);
    final l$upper = upper;
    result$data['upper'] = fromDartDateTimeToGraphQLDateTime(l$upper);
    return result$data;
  }

  CopyWith$Input$DateFieldComparisonBetween<Input$DateFieldComparisonBetween>
  get copyWith => CopyWith$Input$DateFieldComparisonBetween(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$DateFieldComparisonBetween ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$lower = lower;
    final lOther$lower = other.lower;
    if (l$lower != lOther$lower) {
      return false;
    }
    final l$upper = upper;
    final lOther$upper = other.upper;
    if (l$upper != lOther$upper) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$lower = lower;
    final l$upper = upper;
    return Object.hashAll([l$lower, l$upper]);
  }
}

abstract class CopyWith$Input$DateFieldComparisonBetween<TRes> {
  factory CopyWith$Input$DateFieldComparisonBetween(
    Input$DateFieldComparisonBetween instance,
    TRes Function(Input$DateFieldComparisonBetween) then,
  ) = _CopyWithImpl$Input$DateFieldComparisonBetween;

  factory CopyWith$Input$DateFieldComparisonBetween.stub(TRes res) =
      _CopyWithStubImpl$Input$DateFieldComparisonBetween;

  TRes call({DateTime? lower, DateTime? upper});
}

class _CopyWithImpl$Input$DateFieldComparisonBetween<TRes>
    implements CopyWith$Input$DateFieldComparisonBetween<TRes> {
  _CopyWithImpl$Input$DateFieldComparisonBetween(this._instance, this._then);

  final Input$DateFieldComparisonBetween _instance;

  final TRes Function(Input$DateFieldComparisonBetween) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? lower = _undefined, Object? upper = _undefined}) => _then(
    Input$DateFieldComparisonBetween._({
      ..._instance._$data,
      if (lower != _undefined && lower != null) 'lower': (lower as DateTime),
      if (upper != _undefined && upper != null) 'upper': (upper as DateTime),
    }),
  );
}

class _CopyWithStubImpl$Input$DateFieldComparisonBetween<TRes>
    implements CopyWith$Input$DateFieldComparisonBetween<TRes> {
  _CopyWithStubImpl$Input$DateFieldComparisonBetween(this._res);

  TRes _res;

  call({DateTime? lower, DateTime? upper}) => _res;
}

class Input$DriverTransacionFilter {
  factory Input$DriverTransacionFilter({
    List<Input$DriverTransacionFilter>? and,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$DriverTransacionFilter>? or,
  }) => Input$DriverTransacionFilter._({
    if (and != null) r'and': and,
    if (driverId != null) r'driverId': driverId,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$DriverTransacionFilter._(this._$data);

  factory Input$DriverTransacionFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$DriverTransacionFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('driverId')) {
      final l$driverId = data['driverId'];
      result$data['driverId'] = l$driverId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$driverId as Map<String, dynamic>),
            );
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$DriverTransacionFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    return Input$DriverTransacionFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$DriverTransacionFilter>? get and =>
      (_$data['and'] as List<Input$DriverTransacionFilter>?);

  Input$IDFilterComparison? get driverId =>
      (_$data['driverId'] as Input$IDFilterComparison?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$DriverTransacionFilter>? get or =>
      (_$data['or'] as List<Input$DriverTransacionFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('driverId')) {
      final l$driverId = driverId;
      result$data['driverId'] = l$driverId?.toJson();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$DriverTransacionFilter<Input$DriverTransacionFilter>
  get copyWith => CopyWith$Input$DriverTransacionFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$DriverTransacionFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$driverId = driverId;
    final lOther$driverId = other.driverId;
    if (_$data.containsKey('driverId') !=
        other._$data.containsKey('driverId')) {
      return false;
    }
    if (l$driverId != lOther$driverId) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$driverId = driverId;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('driverId') ? l$driverId : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$DriverTransacionFilter<TRes> {
  factory CopyWith$Input$DriverTransacionFilter(
    Input$DriverTransacionFilter instance,
    TRes Function(Input$DriverTransacionFilter) then,
  ) = _CopyWithImpl$Input$DriverTransacionFilter;

  factory CopyWith$Input$DriverTransacionFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$DriverTransacionFilter;

  TRes call({
    List<Input$DriverTransacionFilter>? and,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$DriverTransacionFilter>? or,
  });
  TRes and(
    Iterable<Input$DriverTransacionFilter>? Function(
      Iterable<
        CopyWith$Input$DriverTransacionFilter<Input$DriverTransacionFilter>
      >?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get driverId;
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$DriverTransacionFilter>? Function(
      Iterable<
        CopyWith$Input$DriverTransacionFilter<Input$DriverTransacionFilter>
      >?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$DriverTransacionFilter<TRes>
    implements CopyWith$Input$DriverTransacionFilter<TRes> {
  _CopyWithImpl$Input$DriverTransacionFilter(this._instance, this._then);

  final Input$DriverTransacionFilter _instance;

  final TRes Function(Input$DriverTransacionFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? driverId = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$DriverTransacionFilter._({
      ..._instance._$data,
      if (and != _undefined)
        'and': (and as List<Input$DriverTransacionFilter>?),
      if (driverId != _undefined)
        'driverId': (driverId as Input$IDFilterComparison?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$DriverTransacionFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$DriverTransacionFilter>? Function(
      Iterable<
        CopyWith$Input$DriverTransacionFilter<Input$DriverTransacionFilter>
      >?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map(
        (e) => CopyWith$Input$DriverTransacionFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get driverId {
    final local$driverId = _instance.driverId;
    return local$driverId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$driverId,
            (e) => call(driverId: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$DriverTransacionFilter>? Function(
      Iterable<
        CopyWith$Input$DriverTransacionFilter<Input$DriverTransacionFilter>
      >?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map(
        (e) => CopyWith$Input$DriverTransacionFilter(e, (i) => i),
      ),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$DriverTransacionFilter<TRes>
    implements CopyWith$Input$DriverTransacionFilter<TRes> {
  _CopyWithStubImpl$Input$DriverTransacionFilter(this._res);

  TRes _res;

  call({
    List<Input$DriverTransacionFilter>? and,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$DriverTransacionFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get driverId =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$DriverTransacionSort {
  factory Input$DriverTransacionSort({
    required Enum$SortDirection direction,
    required Enum$DriverTransacionSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$DriverTransacionSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$DriverTransacionSort._(this._$data);

  factory Input$DriverTransacionSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$DriverTransacionSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$DriverTransacionSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$DriverTransacionSortFields get field =>
      (_$data['field'] as Enum$DriverTransacionSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$DriverTransacionSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$DriverTransacionSort<Input$DriverTransacionSort>
  get copyWith => CopyWith$Input$DriverTransacionSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$DriverTransacionSort ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$DriverTransacionSort<TRes> {
  factory CopyWith$Input$DriverTransacionSort(
    Input$DriverTransacionSort instance,
    TRes Function(Input$DriverTransacionSort) then,
  ) = _CopyWithImpl$Input$DriverTransacionSort;

  factory CopyWith$Input$DriverTransacionSort.stub(TRes res) =
      _CopyWithStubImpl$Input$DriverTransacionSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$DriverTransacionSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$DriverTransacionSort<TRes>
    implements CopyWith$Input$DriverTransacionSort<TRes> {
  _CopyWithImpl$Input$DriverTransacionSort(this._instance, this._then);

  final Input$DriverTransacionSort _instance;

  final TRes Function(Input$DriverTransacionSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$DriverTransacionSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$DriverTransacionSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$DriverTransacionSort<TRes>
    implements CopyWith$Input$DriverTransacionSort<TRes> {
  _CopyWithStubImpl$Input$DriverTransacionSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$DriverTransacionSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$DriverWalletFilter {
  factory Input$DriverWalletFilter({
    List<Input$DriverWalletFilter>? and,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$DriverWalletFilter>? or,
  }) => Input$DriverWalletFilter._({
    if (and != null) r'and': and,
    if (driverId != null) r'driverId': driverId,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$DriverWalletFilter._(this._$data);

  factory Input$DriverWalletFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) =>
                Input$DriverWalletFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('driverId')) {
      final l$driverId = data['driverId'];
      result$data['driverId'] = l$driverId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$driverId as Map<String, dynamic>),
            );
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) =>
                Input$DriverWalletFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    return Input$DriverWalletFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$DriverWalletFilter>? get and =>
      (_$data['and'] as List<Input$DriverWalletFilter>?);

  Input$IDFilterComparison? get driverId =>
      (_$data['driverId'] as Input$IDFilterComparison?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$DriverWalletFilter>? get or =>
      (_$data['or'] as List<Input$DriverWalletFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('driverId')) {
      final l$driverId = driverId;
      result$data['driverId'] = l$driverId?.toJson();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$DriverWalletFilter<Input$DriverWalletFilter> get copyWith =>
      CopyWith$Input$DriverWalletFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$DriverWalletFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$driverId = driverId;
    final lOther$driverId = other.driverId;
    if (_$data.containsKey('driverId') !=
        other._$data.containsKey('driverId')) {
      return false;
    }
    if (l$driverId != lOther$driverId) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$driverId = driverId;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('driverId') ? l$driverId : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$DriverWalletFilter<TRes> {
  factory CopyWith$Input$DriverWalletFilter(
    Input$DriverWalletFilter instance,
    TRes Function(Input$DriverWalletFilter) then,
  ) = _CopyWithImpl$Input$DriverWalletFilter;

  factory CopyWith$Input$DriverWalletFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$DriverWalletFilter;

  TRes call({
    List<Input$DriverWalletFilter>? and,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$DriverWalletFilter>? or,
  });
  TRes and(
    Iterable<Input$DriverWalletFilter>? Function(
      Iterable<CopyWith$Input$DriverWalletFilter<Input$DriverWalletFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get driverId;
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$DriverWalletFilter>? Function(
      Iterable<CopyWith$Input$DriverWalletFilter<Input$DriverWalletFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$DriverWalletFilter<TRes>
    implements CopyWith$Input$DriverWalletFilter<TRes> {
  _CopyWithImpl$Input$DriverWalletFilter(this._instance, this._then);

  final Input$DriverWalletFilter _instance;

  final TRes Function(Input$DriverWalletFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? driverId = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$DriverWalletFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$DriverWalletFilter>?),
      if (driverId != _undefined)
        'driverId': (driverId as Input$IDFilterComparison?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$DriverWalletFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$DriverWalletFilter>? Function(
      Iterable<CopyWith$Input$DriverWalletFilter<Input$DriverWalletFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$DriverWalletFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get driverId {
    final local$driverId = _instance.driverId;
    return local$driverId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$driverId,
            (e) => call(driverId: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$DriverWalletFilter>? Function(
      Iterable<CopyWith$Input$DriverWalletFilter<Input$DriverWalletFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$DriverWalletFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$DriverWalletFilter<TRes>
    implements CopyWith$Input$DriverWalletFilter<TRes> {
  _CopyWithStubImpl$Input$DriverWalletFilter(this._res);

  TRes _res;

  call({
    List<Input$DriverWalletFilter>? and,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$DriverWalletFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get driverId =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$DriverWalletSort {
  factory Input$DriverWalletSort({
    required Enum$SortDirection direction,
    required Enum$DriverWalletSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$DriverWalletSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$DriverWalletSort._(this._$data);

  factory Input$DriverWalletSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$DriverWalletSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$DriverWalletSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$DriverWalletSortFields get field =>
      (_$data['field'] as Enum$DriverWalletSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$DriverWalletSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$DriverWalletSort<Input$DriverWalletSort> get copyWith =>
      CopyWith$Input$DriverWalletSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$DriverWalletSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$DriverWalletSort<TRes> {
  factory CopyWith$Input$DriverWalletSort(
    Input$DriverWalletSort instance,
    TRes Function(Input$DriverWalletSort) then,
  ) = _CopyWithImpl$Input$DriverWalletSort;

  factory CopyWith$Input$DriverWalletSort.stub(TRes res) =
      _CopyWithStubImpl$Input$DriverWalletSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$DriverWalletSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$DriverWalletSort<TRes>
    implements CopyWith$Input$DriverWalletSort<TRes> {
  _CopyWithImpl$Input$DriverWalletSort(this._instance, this._then);

  final Input$DriverWalletSort _instance;

  final TRes Function(Input$DriverWalletSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$DriverWalletSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$DriverWalletSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$DriverWalletSort<TRes>
    implements CopyWith$Input$DriverWalletSort<TRes> {
  _CopyWithStubImpl$Input$DriverWalletSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$DriverWalletSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$IDFilterComparison {
  factory Input$IDFilterComparison({
    String? eq,
    String? gt,
    String? gte,
    String? iLike,
    List<String>? $in,
    bool? $is,
    bool? isNot,
    String? like,
    String? lt,
    String? lte,
    String? neq,
    String? notILike,
    List<String>? notIn,
    String? notLike,
  }) => Input$IDFilterComparison._({
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if (iLike != null) r'iLike': iLike,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (like != null) r'like': like,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notILike != null) r'notILike': notILike,
    if (notIn != null) r'notIn': notIn,
    if (notLike != null) r'notLike': notLike,
  });

  Input$IDFilterComparison._(this._$data);

  factory Input$IDFilterComparison.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = (l$eq as String?);
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = (l$gt as String?);
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = (l$gte as String?);
    }
    if (data.containsKey('iLike')) {
      final l$iLike = data['iLike'];
      result$data['iLike'] = (l$iLike as String?);
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => (e as String))
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('like')) {
      final l$like = data['like'];
      result$data['like'] = (l$like as String?);
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = (l$lt as String?);
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = (l$lte as String?);
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = (l$neq as String?);
    }
    if (data.containsKey('notILike')) {
      final l$notILike = data['notILike'];
      result$data['notILike'] = (l$notILike as String?);
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => (e as String))
          .toList();
    }
    if (data.containsKey('notLike')) {
      final l$notLike = data['notLike'];
      result$data['notLike'] = (l$notLike as String?);
    }
    return Input$IDFilterComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  String? get eq => (_$data['eq'] as String?);

  String? get gt => (_$data['gt'] as String?);

  String? get gte => (_$data['gte'] as String?);

  String? get iLike => (_$data['iLike'] as String?);

  List<String>? get $in => (_$data['in'] as List<String>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  String? get like => (_$data['like'] as String?);

  String? get lt => (_$data['lt'] as String?);

  String? get lte => (_$data['lte'] as String?);

  String? get neq => (_$data['neq'] as String?);

  String? get notILike => (_$data['notILike'] as String?);

  List<String>? get notIn => (_$data['notIn'] as List<String>?);

  String? get notLike => (_$data['notLike'] as String?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq;
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt;
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte;
    }
    if (_$data.containsKey('iLike')) {
      final l$iLike = iLike;
      result$data['iLike'] = l$iLike;
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in?.map((e) => e).toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('like')) {
      final l$like = like;
      result$data['like'] = l$like;
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt;
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte;
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq;
    }
    if (_$data.containsKey('notILike')) {
      final l$notILike = notILike;
      result$data['notILike'] = l$notILike;
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn?.map((e) => e).toList();
    }
    if (_$data.containsKey('notLike')) {
      final l$notLike = notLike;
      result$data['notLike'] = l$notLike;
    }
    return result$data;
  }

  CopyWith$Input$IDFilterComparison<Input$IDFilterComparison> get copyWith =>
      CopyWith$Input$IDFilterComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$IDFilterComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$iLike = iLike;
    final lOther$iLike = other.iLike;
    if (_$data.containsKey('iLike') != other._$data.containsKey('iLike')) {
      return false;
    }
    if (l$iLike != lOther$iLike) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$like = like;
    final lOther$like = other.like;
    if (_$data.containsKey('like') != other._$data.containsKey('like')) {
      return false;
    }
    if (l$like != lOther$like) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notILike = notILike;
    final lOther$notILike = other.notILike;
    if (_$data.containsKey('notILike') !=
        other._$data.containsKey('notILike')) {
      return false;
    }
    if (l$notILike != lOther$notILike) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    final l$notLike = notLike;
    final lOther$notLike = other.notLike;
    if (_$data.containsKey('notLike') != other._$data.containsKey('notLike')) {
      return false;
    }
    if (l$notLike != lOther$notLike) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$iLike = iLike;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$like = like;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notILike = notILike;
    final l$notIn = notIn;
    final l$notLike = notLike;
    return Object.hashAll([
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('iLike') ? l$iLike : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('like') ? l$like : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notILike') ? l$notILike : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
      _$data.containsKey('notLike') ? l$notLike : const {},
    ]);
  }
}

abstract class CopyWith$Input$IDFilterComparison<TRes> {
  factory CopyWith$Input$IDFilterComparison(
    Input$IDFilterComparison instance,
    TRes Function(Input$IDFilterComparison) then,
  ) = _CopyWithImpl$Input$IDFilterComparison;

  factory CopyWith$Input$IDFilterComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$IDFilterComparison;

  TRes call({
    String? eq,
    String? gt,
    String? gte,
    String? iLike,
    List<String>? $in,
    bool? $is,
    bool? isNot,
    String? like,
    String? lt,
    String? lte,
    String? neq,
    String? notILike,
    List<String>? notIn,
    String? notLike,
  });
}

class _CopyWithImpl$Input$IDFilterComparison<TRes>
    implements CopyWith$Input$IDFilterComparison<TRes> {
  _CopyWithImpl$Input$IDFilterComparison(this._instance, this._then);

  final Input$IDFilterComparison _instance;

  final TRes Function(Input$IDFilterComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? iLike = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? like = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notILike = _undefined,
    Object? notIn = _undefined,
    Object? notLike = _undefined,
  }) => _then(
    Input$IDFilterComparison._({
      ..._instance._$data,
      if (eq != _undefined) 'eq': (eq as String?),
      if (gt != _undefined) 'gt': (gt as String?),
      if (gte != _undefined) 'gte': (gte as String?),
      if (iLike != _undefined) 'iLike': (iLike as String?),
      if ($in != _undefined) 'in': ($in as List<String>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (like != _undefined) 'like': (like as String?),
      if (lt != _undefined) 'lt': (lt as String?),
      if (lte != _undefined) 'lte': (lte as String?),
      if (neq != _undefined) 'neq': (neq as String?),
      if (notILike != _undefined) 'notILike': (notILike as String?),
      if (notIn != _undefined) 'notIn': (notIn as List<String>?),
      if (notLike != _undefined) 'notLike': (notLike as String?),
    }),
  );
}

class _CopyWithStubImpl$Input$IDFilterComparison<TRes>
    implements CopyWith$Input$IDFilterComparison<TRes> {
  _CopyWithStubImpl$Input$IDFilterComparison(this._res);

  TRes _res;

  call({
    String? eq,
    String? gt,
    String? gte,
    String? iLike,
    List<String>? $in,
    bool? $is,
    bool? isNot,
    String? like,
    String? lt,
    String? lte,
    String? neq,
    String? notILike,
    List<String>? notIn,
    String? notLike,
  }) => _res;
}

class Input$IntFieldComparison {
  factory Input$IntFieldComparison({
    Input$IntFieldComparisonBetween? between,
    int? eq,
    int? gt,
    int? gte,
    List<int>? $in,
    bool? $is,
    bool? isNot,
    int? lt,
    int? lte,
    int? neq,
    Input$IntFieldComparisonBetween? notBetween,
    List<int>? notIn,
  }) => Input$IntFieldComparison._({
    if (between != null) r'between': between,
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notBetween != null) r'notBetween': notBetween,
    if (notIn != null) r'notIn': notIn,
  });

  Input$IntFieldComparison._(this._$data);

  factory Input$IntFieldComparison.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('between')) {
      final l$between = data['between'];
      result$data['between'] = l$between == null
          ? null
          : Input$IntFieldComparisonBetween.fromJson(
              (l$between as Map<String, dynamic>),
            );
    }
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = (l$eq as int?);
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = (l$gt as int?);
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = (l$gte as int?);
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => (e as int))
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = (l$lt as int?);
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = (l$lte as int?);
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = (l$neq as int?);
    }
    if (data.containsKey('notBetween')) {
      final l$notBetween = data['notBetween'];
      result$data['notBetween'] = l$notBetween == null
          ? null
          : Input$IntFieldComparisonBetween.fromJson(
              (l$notBetween as Map<String, dynamic>),
            );
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => (e as int))
          .toList();
    }
    return Input$IntFieldComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  Input$IntFieldComparisonBetween? get between =>
      (_$data['between'] as Input$IntFieldComparisonBetween?);

  int? get eq => (_$data['eq'] as int?);

  int? get gt => (_$data['gt'] as int?);

  int? get gte => (_$data['gte'] as int?);

  List<int>? get $in => (_$data['in'] as List<int>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  int? get lt => (_$data['lt'] as int?);

  int? get lte => (_$data['lte'] as int?);

  int? get neq => (_$data['neq'] as int?);

  Input$IntFieldComparisonBetween? get notBetween =>
      (_$data['notBetween'] as Input$IntFieldComparisonBetween?);

  List<int>? get notIn => (_$data['notIn'] as List<int>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('between')) {
      final l$between = between;
      result$data['between'] = l$between?.toJson();
    }
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq;
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt;
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte;
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in?.map((e) => e).toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt;
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte;
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq;
    }
    if (_$data.containsKey('notBetween')) {
      final l$notBetween = notBetween;
      result$data['notBetween'] = l$notBetween?.toJson();
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn?.map((e) => e).toList();
    }
    return result$data;
  }

  CopyWith$Input$IntFieldComparison<Input$IntFieldComparison> get copyWith =>
      CopyWith$Input$IntFieldComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$IntFieldComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$between = between;
    final lOther$between = other.between;
    if (_$data.containsKey('between') != other._$data.containsKey('between')) {
      return false;
    }
    if (l$between != lOther$between) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notBetween = notBetween;
    final lOther$notBetween = other.notBetween;
    if (_$data.containsKey('notBetween') !=
        other._$data.containsKey('notBetween')) {
      return false;
    }
    if (l$notBetween != lOther$notBetween) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$between = between;
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notBetween = notBetween;
    final l$notIn = notIn;
    return Object.hashAll([
      _$data.containsKey('between') ? l$between : const {},
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notBetween') ? l$notBetween : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$IntFieldComparison<TRes> {
  factory CopyWith$Input$IntFieldComparison(
    Input$IntFieldComparison instance,
    TRes Function(Input$IntFieldComparison) then,
  ) = _CopyWithImpl$Input$IntFieldComparison;

  factory CopyWith$Input$IntFieldComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$IntFieldComparison;

  TRes call({
    Input$IntFieldComparisonBetween? between,
    int? eq,
    int? gt,
    int? gte,
    List<int>? $in,
    bool? $is,
    bool? isNot,
    int? lt,
    int? lte,
    int? neq,
    Input$IntFieldComparisonBetween? notBetween,
    List<int>? notIn,
  });
  CopyWith$Input$IntFieldComparisonBetween<TRes> get between;
  CopyWith$Input$IntFieldComparisonBetween<TRes> get notBetween;
}

class _CopyWithImpl$Input$IntFieldComparison<TRes>
    implements CopyWith$Input$IntFieldComparison<TRes> {
  _CopyWithImpl$Input$IntFieldComparison(this._instance, this._then);

  final Input$IntFieldComparison _instance;

  final TRes Function(Input$IntFieldComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? between = _undefined,
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notBetween = _undefined,
    Object? notIn = _undefined,
  }) => _then(
    Input$IntFieldComparison._({
      ..._instance._$data,
      if (between != _undefined)
        'between': (between as Input$IntFieldComparisonBetween?),
      if (eq != _undefined) 'eq': (eq as int?),
      if (gt != _undefined) 'gt': (gt as int?),
      if (gte != _undefined) 'gte': (gte as int?),
      if ($in != _undefined) 'in': ($in as List<int>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (lt != _undefined) 'lt': (lt as int?),
      if (lte != _undefined) 'lte': (lte as int?),
      if (neq != _undefined) 'neq': (neq as int?),
      if (notBetween != _undefined)
        'notBetween': (notBetween as Input$IntFieldComparisonBetween?),
      if (notIn != _undefined) 'notIn': (notIn as List<int>?),
    }),
  );

  CopyWith$Input$IntFieldComparisonBetween<TRes> get between {
    final local$between = _instance.between;
    return local$between == null
        ? CopyWith$Input$IntFieldComparisonBetween.stub(_then(_instance))
        : CopyWith$Input$IntFieldComparisonBetween(
            local$between,
            (e) => call(between: e),
          );
  }

  CopyWith$Input$IntFieldComparisonBetween<TRes> get notBetween {
    final local$notBetween = _instance.notBetween;
    return local$notBetween == null
        ? CopyWith$Input$IntFieldComparisonBetween.stub(_then(_instance))
        : CopyWith$Input$IntFieldComparisonBetween(
            local$notBetween,
            (e) => call(notBetween: e),
          );
  }
}

class _CopyWithStubImpl$Input$IntFieldComparison<TRes>
    implements CopyWith$Input$IntFieldComparison<TRes> {
  _CopyWithStubImpl$Input$IntFieldComparison(this._res);

  TRes _res;

  call({
    Input$IntFieldComparisonBetween? between,
    int? eq,
    int? gt,
    int? gte,
    List<int>? $in,
    bool? $is,
    bool? isNot,
    int? lt,
    int? lte,
    int? neq,
    Input$IntFieldComparisonBetween? notBetween,
    List<int>? notIn,
  }) => _res;

  CopyWith$Input$IntFieldComparisonBetween<TRes> get between =>
      CopyWith$Input$IntFieldComparisonBetween.stub(_res);

  CopyWith$Input$IntFieldComparisonBetween<TRes> get notBetween =>
      CopyWith$Input$IntFieldComparisonBetween.stub(_res);
}

class Input$IntFieldComparisonBetween {
  factory Input$IntFieldComparisonBetween({
    required int lower,
    required int upper,
  }) => Input$IntFieldComparisonBetween._({r'lower': lower, r'upper': upper});

  Input$IntFieldComparisonBetween._(this._$data);

  factory Input$IntFieldComparisonBetween.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$lower = data['lower'];
    result$data['lower'] = (l$lower as int);
    final l$upper = data['upper'];
    result$data['upper'] = (l$upper as int);
    return Input$IntFieldComparisonBetween._(result$data);
  }

  Map<String, dynamic> _$data;

  int get lower => (_$data['lower'] as int);

  int get upper => (_$data['upper'] as int);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$lower = lower;
    result$data['lower'] = l$lower;
    final l$upper = upper;
    result$data['upper'] = l$upper;
    return result$data;
  }

  CopyWith$Input$IntFieldComparisonBetween<Input$IntFieldComparisonBetween>
  get copyWith => CopyWith$Input$IntFieldComparisonBetween(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$IntFieldComparisonBetween ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$lower = lower;
    final lOther$lower = other.lower;
    if (l$lower != lOther$lower) {
      return false;
    }
    final l$upper = upper;
    final lOther$upper = other.upper;
    if (l$upper != lOther$upper) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$lower = lower;
    final l$upper = upper;
    return Object.hashAll([l$lower, l$upper]);
  }
}

abstract class CopyWith$Input$IntFieldComparisonBetween<TRes> {
  factory CopyWith$Input$IntFieldComparisonBetween(
    Input$IntFieldComparisonBetween instance,
    TRes Function(Input$IntFieldComparisonBetween) then,
  ) = _CopyWithImpl$Input$IntFieldComparisonBetween;

  factory CopyWith$Input$IntFieldComparisonBetween.stub(TRes res) =
      _CopyWithStubImpl$Input$IntFieldComparisonBetween;

  TRes call({int? lower, int? upper});
}

class _CopyWithImpl$Input$IntFieldComparisonBetween<TRes>
    implements CopyWith$Input$IntFieldComparisonBetween<TRes> {
  _CopyWithImpl$Input$IntFieldComparisonBetween(this._instance, this._then);

  final Input$IntFieldComparisonBetween _instance;

  final TRes Function(Input$IntFieldComparisonBetween) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? lower = _undefined, Object? upper = _undefined}) => _then(
    Input$IntFieldComparisonBetween._({
      ..._instance._$data,
      if (lower != _undefined && lower != null) 'lower': (lower as int),
      if (upper != _undefined && upper != null) 'upper': (upper as int),
    }),
  );
}

class _CopyWithStubImpl$Input$IntFieldComparisonBetween<TRes>
    implements CopyWith$Input$IntFieldComparisonBetween<TRes> {
  _CopyWithStubImpl$Input$IntFieldComparisonBetween(this._res);

  TRes _res;

  call({int? lower, int? upper}) => _res;
}

class Input$LoginInput {
  factory Input$LoginInput({required String firebaseToken}) =>
      Input$LoginInput._({r'firebaseToken': firebaseToken});

  Input$LoginInput._(this._$data);

  factory Input$LoginInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$firebaseToken = data['firebaseToken'];
    result$data['firebaseToken'] = (l$firebaseToken as String);
    return Input$LoginInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String get firebaseToken => (_$data['firebaseToken'] as String);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$firebaseToken = firebaseToken;
    result$data['firebaseToken'] = l$firebaseToken;
    return result$data;
  }

  CopyWith$Input$LoginInput<Input$LoginInput> get copyWith =>
      CopyWith$Input$LoginInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$LoginInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$firebaseToken = firebaseToken;
    final lOther$firebaseToken = other.firebaseToken;
    if (l$firebaseToken != lOther$firebaseToken) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$firebaseToken = firebaseToken;
    return Object.hashAll([l$firebaseToken]);
  }
}

abstract class CopyWith$Input$LoginInput<TRes> {
  factory CopyWith$Input$LoginInput(
    Input$LoginInput instance,
    TRes Function(Input$LoginInput) then,
  ) = _CopyWithImpl$Input$LoginInput;

  factory CopyWith$Input$LoginInput.stub(TRes res) =
      _CopyWithStubImpl$Input$LoginInput;

  TRes call({String? firebaseToken});
}

class _CopyWithImpl$Input$LoginInput<TRes>
    implements CopyWith$Input$LoginInput<TRes> {
  _CopyWithImpl$Input$LoginInput(this._instance, this._then);

  final Input$LoginInput _instance;

  final TRes Function(Input$LoginInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? firebaseToken = _undefined}) => _then(
    Input$LoginInput._({
      ..._instance._$data,
      if (firebaseToken != _undefined && firebaseToken != null)
        'firebaseToken': (firebaseToken as String),
    }),
  );
}

class _CopyWithStubImpl$Input$LoginInput<TRes>
    implements CopyWith$Input$LoginInput<TRes> {
  _CopyWithStubImpl$Input$LoginInput(this._res);

  TRes _res;

  call({String? firebaseToken}) => _res;
}

class Input$MediaFilter {
  factory Input$MediaFilter({
    List<Input$MediaFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$MediaFilter>? or,
  }) => Input$MediaFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$MediaFilter._(this._$data);

  factory Input$MediaFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map((e) => Input$MediaFilter.fromJson((e as Map<String, dynamic>)))
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map((e) => Input$MediaFilter.fromJson((e as Map<String, dynamic>)))
          .toList();
    }
    return Input$MediaFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$MediaFilter>? get and =>
      (_$data['and'] as List<Input$MediaFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$MediaFilter>? get or => (_$data['or'] as List<Input$MediaFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$MediaFilter<Input$MediaFilter> get copyWith =>
      CopyWith$Input$MediaFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$MediaFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$MediaFilter<TRes> {
  factory CopyWith$Input$MediaFilter(
    Input$MediaFilter instance,
    TRes Function(Input$MediaFilter) then,
  ) = _CopyWithImpl$Input$MediaFilter;

  factory CopyWith$Input$MediaFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$MediaFilter;

  TRes call({
    List<Input$MediaFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$MediaFilter>? or,
  });
  TRes and(
    Iterable<Input$MediaFilter>? Function(
      Iterable<CopyWith$Input$MediaFilter<Input$MediaFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$MediaFilter>? Function(
      Iterable<CopyWith$Input$MediaFilter<Input$MediaFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$MediaFilter<TRes>
    implements CopyWith$Input$MediaFilter<TRes> {
  _CopyWithImpl$Input$MediaFilter(this._instance, this._then);

  final Input$MediaFilter _instance;

  final TRes Function(Input$MediaFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$MediaFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$MediaFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$MediaFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$MediaFilter>? Function(
      Iterable<CopyWith$Input$MediaFilter<Input$MediaFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$MediaFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$MediaFilter>? Function(
      Iterable<CopyWith$Input$MediaFilter<Input$MediaFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$MediaFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$MediaFilter<TRes>
    implements CopyWith$Input$MediaFilter<TRes> {
  _CopyWithStubImpl$Input$MediaFilter(this._res);

  TRes _res;

  call({
    List<Input$MediaFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$MediaFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$MediaSort {
  factory Input$MediaSort({
    required Enum$SortDirection direction,
    required Enum$MediaSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$MediaSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$MediaSort._(this._$data);

  factory Input$MediaSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$MediaSortFields((l$field as String));
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$MediaSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$MediaSortFields get field => (_$data['field'] as Enum$MediaSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$MediaSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$MediaSort<Input$MediaSort> get copyWith =>
      CopyWith$Input$MediaSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$MediaSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$MediaSort<TRes> {
  factory CopyWith$Input$MediaSort(
    Input$MediaSort instance,
    TRes Function(Input$MediaSort) then,
  ) = _CopyWithImpl$Input$MediaSort;

  factory CopyWith$Input$MediaSort.stub(TRes res) =
      _CopyWithStubImpl$Input$MediaSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$MediaSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$MediaSort<TRes>
    implements CopyWith$Input$MediaSort<TRes> {
  _CopyWithImpl$Input$MediaSort(this._instance, this._then);

  final Input$MediaSort _instance;

  final TRes Function(Input$MediaSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$MediaSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$MediaSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$MediaSort<TRes>
    implements CopyWith$Input$MediaSort<TRes> {
  _CopyWithStubImpl$Input$MediaSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$MediaSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$NumberFieldComparison {
  factory Input$NumberFieldComparison({
    Input$NumberFieldComparisonBetween? between,
    double? eq,
    double? gt,
    double? gte,
    List<double>? $in,
    bool? $is,
    bool? isNot,
    double? lt,
    double? lte,
    double? neq,
    Input$NumberFieldComparisonBetween? notBetween,
    List<double>? notIn,
  }) => Input$NumberFieldComparison._({
    if (between != null) r'between': between,
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notBetween != null) r'notBetween': notBetween,
    if (notIn != null) r'notIn': notIn,
  });

  Input$NumberFieldComparison._(this._$data);

  factory Input$NumberFieldComparison.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('between')) {
      final l$between = data['between'];
      result$data['between'] = l$between == null
          ? null
          : Input$NumberFieldComparisonBetween.fromJson(
              (l$between as Map<String, dynamic>),
            );
    }
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = (l$eq as num?)?.toDouble();
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = (l$gt as num?)?.toDouble();
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = (l$gte as num?)?.toDouble();
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => (e as num).toDouble())
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = (l$lt as num?)?.toDouble();
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = (l$lte as num?)?.toDouble();
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = (l$neq as num?)?.toDouble();
    }
    if (data.containsKey('notBetween')) {
      final l$notBetween = data['notBetween'];
      result$data['notBetween'] = l$notBetween == null
          ? null
          : Input$NumberFieldComparisonBetween.fromJson(
              (l$notBetween as Map<String, dynamic>),
            );
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => (e as num).toDouble())
          .toList();
    }
    return Input$NumberFieldComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  Input$NumberFieldComparisonBetween? get between =>
      (_$data['between'] as Input$NumberFieldComparisonBetween?);

  double? get eq => (_$data['eq'] as double?);

  double? get gt => (_$data['gt'] as double?);

  double? get gte => (_$data['gte'] as double?);

  List<double>? get $in => (_$data['in'] as List<double>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  double? get lt => (_$data['lt'] as double?);

  double? get lte => (_$data['lte'] as double?);

  double? get neq => (_$data['neq'] as double?);

  Input$NumberFieldComparisonBetween? get notBetween =>
      (_$data['notBetween'] as Input$NumberFieldComparisonBetween?);

  List<double>? get notIn => (_$data['notIn'] as List<double>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('between')) {
      final l$between = between;
      result$data['between'] = l$between?.toJson();
    }
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq;
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt;
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte;
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in?.map((e) => e).toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt;
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte;
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq;
    }
    if (_$data.containsKey('notBetween')) {
      final l$notBetween = notBetween;
      result$data['notBetween'] = l$notBetween?.toJson();
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn?.map((e) => e).toList();
    }
    return result$data;
  }

  CopyWith$Input$NumberFieldComparison<Input$NumberFieldComparison>
  get copyWith => CopyWith$Input$NumberFieldComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$NumberFieldComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$between = between;
    final lOther$between = other.between;
    if (_$data.containsKey('between') != other._$data.containsKey('between')) {
      return false;
    }
    if (l$between != lOther$between) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notBetween = notBetween;
    final lOther$notBetween = other.notBetween;
    if (_$data.containsKey('notBetween') !=
        other._$data.containsKey('notBetween')) {
      return false;
    }
    if (l$notBetween != lOther$notBetween) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$between = between;
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notBetween = notBetween;
    final l$notIn = notIn;
    return Object.hashAll([
      _$data.containsKey('between') ? l$between : const {},
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notBetween') ? l$notBetween : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$NumberFieldComparison<TRes> {
  factory CopyWith$Input$NumberFieldComparison(
    Input$NumberFieldComparison instance,
    TRes Function(Input$NumberFieldComparison) then,
  ) = _CopyWithImpl$Input$NumberFieldComparison;

  factory CopyWith$Input$NumberFieldComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$NumberFieldComparison;

  TRes call({
    Input$NumberFieldComparisonBetween? between,
    double? eq,
    double? gt,
    double? gte,
    List<double>? $in,
    bool? $is,
    bool? isNot,
    double? lt,
    double? lte,
    double? neq,
    Input$NumberFieldComparisonBetween? notBetween,
    List<double>? notIn,
  });
  CopyWith$Input$NumberFieldComparisonBetween<TRes> get between;
  CopyWith$Input$NumberFieldComparisonBetween<TRes> get notBetween;
}

class _CopyWithImpl$Input$NumberFieldComparison<TRes>
    implements CopyWith$Input$NumberFieldComparison<TRes> {
  _CopyWithImpl$Input$NumberFieldComparison(this._instance, this._then);

  final Input$NumberFieldComparison _instance;

  final TRes Function(Input$NumberFieldComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? between = _undefined,
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notBetween = _undefined,
    Object? notIn = _undefined,
  }) => _then(
    Input$NumberFieldComparison._({
      ..._instance._$data,
      if (between != _undefined)
        'between': (between as Input$NumberFieldComparisonBetween?),
      if (eq != _undefined) 'eq': (eq as double?),
      if (gt != _undefined) 'gt': (gt as double?),
      if (gte != _undefined) 'gte': (gte as double?),
      if ($in != _undefined) 'in': ($in as List<double>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (lt != _undefined) 'lt': (lt as double?),
      if (lte != _undefined) 'lte': (lte as double?),
      if (neq != _undefined) 'neq': (neq as double?),
      if (notBetween != _undefined)
        'notBetween': (notBetween as Input$NumberFieldComparisonBetween?),
      if (notIn != _undefined) 'notIn': (notIn as List<double>?),
    }),
  );

  CopyWith$Input$NumberFieldComparisonBetween<TRes> get between {
    final local$between = _instance.between;
    return local$between == null
        ? CopyWith$Input$NumberFieldComparisonBetween.stub(_then(_instance))
        : CopyWith$Input$NumberFieldComparisonBetween(
            local$between,
            (e) => call(between: e),
          );
  }

  CopyWith$Input$NumberFieldComparisonBetween<TRes> get notBetween {
    final local$notBetween = _instance.notBetween;
    return local$notBetween == null
        ? CopyWith$Input$NumberFieldComparisonBetween.stub(_then(_instance))
        : CopyWith$Input$NumberFieldComparisonBetween(
            local$notBetween,
            (e) => call(notBetween: e),
          );
  }
}

class _CopyWithStubImpl$Input$NumberFieldComparison<TRes>
    implements CopyWith$Input$NumberFieldComparison<TRes> {
  _CopyWithStubImpl$Input$NumberFieldComparison(this._res);

  TRes _res;

  call({
    Input$NumberFieldComparisonBetween? between,
    double? eq,
    double? gt,
    double? gte,
    List<double>? $in,
    bool? $is,
    bool? isNot,
    double? lt,
    double? lte,
    double? neq,
    Input$NumberFieldComparisonBetween? notBetween,
    List<double>? notIn,
  }) => _res;

  CopyWith$Input$NumberFieldComparisonBetween<TRes> get between =>
      CopyWith$Input$NumberFieldComparisonBetween.stub(_res);

  CopyWith$Input$NumberFieldComparisonBetween<TRes> get notBetween =>
      CopyWith$Input$NumberFieldComparisonBetween.stub(_res);
}

class Input$NumberFieldComparisonBetween {
  factory Input$NumberFieldComparisonBetween({
    required double lower,
    required double upper,
  }) =>
      Input$NumberFieldComparisonBetween._({r'lower': lower, r'upper': upper});

  Input$NumberFieldComparisonBetween._(this._$data);

  factory Input$NumberFieldComparisonBetween.fromJson(
    Map<String, dynamic> data,
  ) {
    final result$data = <String, dynamic>{};
    final l$lower = data['lower'];
    result$data['lower'] = (l$lower as num).toDouble();
    final l$upper = data['upper'];
    result$data['upper'] = (l$upper as num).toDouble();
    return Input$NumberFieldComparisonBetween._(result$data);
  }

  Map<String, dynamic> _$data;

  double get lower => (_$data['lower'] as double);

  double get upper => (_$data['upper'] as double);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$lower = lower;
    result$data['lower'] = l$lower;
    final l$upper = upper;
    result$data['upper'] = l$upper;
    return result$data;
  }

  CopyWith$Input$NumberFieldComparisonBetween<
    Input$NumberFieldComparisonBetween
  >
  get copyWith => CopyWith$Input$NumberFieldComparisonBetween(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$NumberFieldComparisonBetween ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$lower = lower;
    final lOther$lower = other.lower;
    if (l$lower != lOther$lower) {
      return false;
    }
    final l$upper = upper;
    final lOther$upper = other.upper;
    if (l$upper != lOther$upper) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$lower = lower;
    final l$upper = upper;
    return Object.hashAll([l$lower, l$upper]);
  }
}

abstract class CopyWith$Input$NumberFieldComparisonBetween<TRes> {
  factory CopyWith$Input$NumberFieldComparisonBetween(
    Input$NumberFieldComparisonBetween instance,
    TRes Function(Input$NumberFieldComparisonBetween) then,
  ) = _CopyWithImpl$Input$NumberFieldComparisonBetween;

  factory CopyWith$Input$NumberFieldComparisonBetween.stub(TRes res) =
      _CopyWithStubImpl$Input$NumberFieldComparisonBetween;

  TRes call({double? lower, double? upper});
}

class _CopyWithImpl$Input$NumberFieldComparisonBetween<TRes>
    implements CopyWith$Input$NumberFieldComparisonBetween<TRes> {
  _CopyWithImpl$Input$NumberFieldComparisonBetween(this._instance, this._then);

  final Input$NumberFieldComparisonBetween _instance;

  final TRes Function(Input$NumberFieldComparisonBetween) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? lower = _undefined, Object? upper = _undefined}) => _then(
    Input$NumberFieldComparisonBetween._({
      ..._instance._$data,
      if (lower != _undefined && lower != null) 'lower': (lower as double),
      if (upper != _undefined && upper != null) 'upper': (upper as double),
    }),
  );
}

class _CopyWithStubImpl$Input$NumberFieldComparisonBetween<TRes>
    implements CopyWith$Input$NumberFieldComparisonBetween<TRes> {
  _CopyWithStubImpl$Input$NumberFieldComparisonBetween(this._res);

  TRes _res;

  call({double? lower, double? upper}) => _res;
}

class Input$OffsetPaging {
  factory Input$OffsetPaging({int? limit, int? offset}) => Input$OffsetPaging._(
    {if (limit != null) r'limit': limit, if (offset != null) r'offset': offset},
  );

  Input$OffsetPaging._(this._$data);

  factory Input$OffsetPaging.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('limit')) {
      final l$limit = data['limit'];
      result$data['limit'] = (l$limit as int?);
    }
    if (data.containsKey('offset')) {
      final l$offset = data['offset'];
      result$data['offset'] = (l$offset as int?);
    }
    return Input$OffsetPaging._(result$data);
  }

  Map<String, dynamic> _$data;

  int? get limit => (_$data['limit'] as int?);

  int? get offset => (_$data['offset'] as int?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('limit')) {
      final l$limit = limit;
      result$data['limit'] = l$limit;
    }
    if (_$data.containsKey('offset')) {
      final l$offset = offset;
      result$data['offset'] = l$offset;
    }
    return result$data;
  }

  CopyWith$Input$OffsetPaging<Input$OffsetPaging> get copyWith =>
      CopyWith$Input$OffsetPaging(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OffsetPaging || runtimeType != other.runtimeType) {
      return false;
    }
    final l$limit = limit;
    final lOther$limit = other.limit;
    if (_$data.containsKey('limit') != other._$data.containsKey('limit')) {
      return false;
    }
    if (l$limit != lOther$limit) {
      return false;
    }
    final l$offset = offset;
    final lOther$offset = other.offset;
    if (_$data.containsKey('offset') != other._$data.containsKey('offset')) {
      return false;
    }
    if (l$offset != lOther$offset) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$limit = limit;
    final l$offset = offset;
    return Object.hashAll([
      _$data.containsKey('limit') ? l$limit : const {},
      _$data.containsKey('offset') ? l$offset : const {},
    ]);
  }
}

abstract class CopyWith$Input$OffsetPaging<TRes> {
  factory CopyWith$Input$OffsetPaging(
    Input$OffsetPaging instance,
    TRes Function(Input$OffsetPaging) then,
  ) = _CopyWithImpl$Input$OffsetPaging;

  factory CopyWith$Input$OffsetPaging.stub(TRes res) =
      _CopyWithStubImpl$Input$OffsetPaging;

  TRes call({int? limit, int? offset});
}

class _CopyWithImpl$Input$OffsetPaging<TRes>
    implements CopyWith$Input$OffsetPaging<TRes> {
  _CopyWithImpl$Input$OffsetPaging(this._instance, this._then);

  final Input$OffsetPaging _instance;

  final TRes Function(Input$OffsetPaging) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? limit = _undefined, Object? offset = _undefined}) => _then(
    Input$OffsetPaging._({
      ..._instance._$data,
      if (limit != _undefined) 'limit': (limit as int?),
      if (offset != _undefined) 'offset': (offset as int?),
    }),
  );
}

class _CopyWithStubImpl$Input$OffsetPaging<TRes>
    implements CopyWith$Input$OffsetPaging<TRes> {
  _CopyWithStubImpl$Input$OffsetPaging(this._res);

  TRes _res;

  call({int? limit, int? offset}) => _res;
}

class Input$OrderAggregateFilter {
  factory Input$OrderAggregateFilter({
    List<Input$OrderAggregateFilter>? and,
    Input$NumberFieldComparison? costBest,
    Input$DateFieldComparison? createdOn,
    Input$IntFieldComparison? distanceBest,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$OrderAggregateFilter>? or,
    Input$OrderStatusFilterComparison? status,
  }) => Input$OrderAggregateFilter._({
    if (and != null) r'and': and,
    if (costBest != null) r'costBest': costBest,
    if (createdOn != null) r'createdOn': createdOn,
    if (distanceBest != null) r'distanceBest': distanceBest,
    if (driverId != null) r'driverId': driverId,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
    if (status != null) r'status': status,
  });

  Input$OrderAggregateFilter._(this._$data);

  factory Input$OrderAggregateFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$OrderAggregateFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('costBest')) {
      final l$costBest = data['costBest'];
      result$data['costBest'] = l$costBest == null
          ? null
          : Input$NumberFieldComparison.fromJson(
              (l$costBest as Map<String, dynamic>),
            );
    }
    if (data.containsKey('createdOn')) {
      final l$createdOn = data['createdOn'];
      result$data['createdOn'] = l$createdOn == null
          ? null
          : Input$DateFieldComparison.fromJson(
              (l$createdOn as Map<String, dynamic>),
            );
    }
    if (data.containsKey('distanceBest')) {
      final l$distanceBest = data['distanceBest'];
      result$data['distanceBest'] = l$distanceBest == null
          ? null
          : Input$IntFieldComparison.fromJson(
              (l$distanceBest as Map<String, dynamic>),
            );
    }
    if (data.containsKey('driverId')) {
      final l$driverId = data['driverId'];
      result$data['driverId'] = l$driverId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$driverId as Map<String, dynamic>),
            );
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$OrderAggregateFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('status')) {
      final l$status = data['status'];
      result$data['status'] = l$status == null
          ? null
          : Input$OrderStatusFilterComparison.fromJson(
              (l$status as Map<String, dynamic>),
            );
    }
    return Input$OrderAggregateFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$OrderAggregateFilter>? get and =>
      (_$data['and'] as List<Input$OrderAggregateFilter>?);

  Input$NumberFieldComparison? get costBest =>
      (_$data['costBest'] as Input$NumberFieldComparison?);

  Input$DateFieldComparison? get createdOn =>
      (_$data['createdOn'] as Input$DateFieldComparison?);

  Input$IntFieldComparison? get distanceBest =>
      (_$data['distanceBest'] as Input$IntFieldComparison?);

  Input$IDFilterComparison? get driverId =>
      (_$data['driverId'] as Input$IDFilterComparison?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$OrderAggregateFilter>? get or =>
      (_$data['or'] as List<Input$OrderAggregateFilter>?);

  Input$OrderStatusFilterComparison? get status =>
      (_$data['status'] as Input$OrderStatusFilterComparison?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('costBest')) {
      final l$costBest = costBest;
      result$data['costBest'] = l$costBest?.toJson();
    }
    if (_$data.containsKey('createdOn')) {
      final l$createdOn = createdOn;
      result$data['createdOn'] = l$createdOn?.toJson();
    }
    if (_$data.containsKey('distanceBest')) {
      final l$distanceBest = distanceBest;
      result$data['distanceBest'] = l$distanceBest?.toJson();
    }
    if (_$data.containsKey('driverId')) {
      final l$driverId = driverId;
      result$data['driverId'] = l$driverId?.toJson();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('status')) {
      final l$status = status;
      result$data['status'] = l$status?.toJson();
    }
    return result$data;
  }

  CopyWith$Input$OrderAggregateFilter<Input$OrderAggregateFilter>
  get copyWith => CopyWith$Input$OrderAggregateFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderAggregateFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$costBest = costBest;
    final lOther$costBest = other.costBest;
    if (_$data.containsKey('costBest') !=
        other._$data.containsKey('costBest')) {
      return false;
    }
    if (l$costBest != lOther$costBest) {
      return false;
    }
    final l$createdOn = createdOn;
    final lOther$createdOn = other.createdOn;
    if (_$data.containsKey('createdOn') !=
        other._$data.containsKey('createdOn')) {
      return false;
    }
    if (l$createdOn != lOther$createdOn) {
      return false;
    }
    final l$distanceBest = distanceBest;
    final lOther$distanceBest = other.distanceBest;
    if (_$data.containsKey('distanceBest') !=
        other._$data.containsKey('distanceBest')) {
      return false;
    }
    if (l$distanceBest != lOther$distanceBest) {
      return false;
    }
    final l$driverId = driverId;
    final lOther$driverId = other.driverId;
    if (_$data.containsKey('driverId') !=
        other._$data.containsKey('driverId')) {
      return false;
    }
    if (l$driverId != lOther$driverId) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    final l$status = status;
    final lOther$status = other.status;
    if (_$data.containsKey('status') != other._$data.containsKey('status')) {
      return false;
    }
    if (l$status != lOther$status) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$costBest = costBest;
    final l$createdOn = createdOn;
    final l$distanceBest = distanceBest;
    final l$driverId = driverId;
    final l$id = id;
    final l$or = or;
    final l$status = status;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('costBest') ? l$costBest : const {},
      _$data.containsKey('createdOn') ? l$createdOn : const {},
      _$data.containsKey('distanceBest') ? l$distanceBest : const {},
      _$data.containsKey('driverId') ? l$driverId : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
      _$data.containsKey('status') ? l$status : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderAggregateFilter<TRes> {
  factory CopyWith$Input$OrderAggregateFilter(
    Input$OrderAggregateFilter instance,
    TRes Function(Input$OrderAggregateFilter) then,
  ) = _CopyWithImpl$Input$OrderAggregateFilter;

  factory CopyWith$Input$OrderAggregateFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderAggregateFilter;

  TRes call({
    List<Input$OrderAggregateFilter>? and,
    Input$NumberFieldComparison? costBest,
    Input$DateFieldComparison? createdOn,
    Input$IntFieldComparison? distanceBest,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$OrderAggregateFilter>? or,
    Input$OrderStatusFilterComparison? status,
  });
  TRes and(
    Iterable<Input$OrderAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderAggregateFilter<Input$OrderAggregateFilter>
      >?,
    )
    _fn,
  );
  CopyWith$Input$NumberFieldComparison<TRes> get costBest;
  CopyWith$Input$DateFieldComparison<TRes> get createdOn;
  CopyWith$Input$IntFieldComparison<TRes> get distanceBest;
  CopyWith$Input$IDFilterComparison<TRes> get driverId;
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$OrderAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderAggregateFilter<Input$OrderAggregateFilter>
      >?,
    )
    _fn,
  );
  CopyWith$Input$OrderStatusFilterComparison<TRes> get status;
}

class _CopyWithImpl$Input$OrderAggregateFilter<TRes>
    implements CopyWith$Input$OrderAggregateFilter<TRes> {
  _CopyWithImpl$Input$OrderAggregateFilter(this._instance, this._then);

  final Input$OrderAggregateFilter _instance;

  final TRes Function(Input$OrderAggregateFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? costBest = _undefined,
    Object? createdOn = _undefined,
    Object? distanceBest = _undefined,
    Object? driverId = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
    Object? status = _undefined,
  }) => _then(
    Input$OrderAggregateFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$OrderAggregateFilter>?),
      if (costBest != _undefined)
        'costBest': (costBest as Input$NumberFieldComparison?),
      if (createdOn != _undefined)
        'createdOn': (createdOn as Input$DateFieldComparison?),
      if (distanceBest != _undefined)
        'distanceBest': (distanceBest as Input$IntFieldComparison?),
      if (driverId != _undefined)
        'driverId': (driverId as Input$IDFilterComparison?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$OrderAggregateFilter>?),
      if (status != _undefined)
        'status': (status as Input$OrderStatusFilterComparison?),
    }),
  );

  TRes and(
    Iterable<Input$OrderAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderAggregateFilter<Input$OrderAggregateFilter>
      >?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map(
        (e) => CopyWith$Input$OrderAggregateFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$NumberFieldComparison<TRes> get costBest {
    final local$costBest = _instance.costBest;
    return local$costBest == null
        ? CopyWith$Input$NumberFieldComparison.stub(_then(_instance))
        : CopyWith$Input$NumberFieldComparison(
            local$costBest,
            (e) => call(costBest: e),
          );
  }

  CopyWith$Input$DateFieldComparison<TRes> get createdOn {
    final local$createdOn = _instance.createdOn;
    return local$createdOn == null
        ? CopyWith$Input$DateFieldComparison.stub(_then(_instance))
        : CopyWith$Input$DateFieldComparison(
            local$createdOn,
            (e) => call(createdOn: e),
          );
  }

  CopyWith$Input$IntFieldComparison<TRes> get distanceBest {
    final local$distanceBest = _instance.distanceBest;
    return local$distanceBest == null
        ? CopyWith$Input$IntFieldComparison.stub(_then(_instance))
        : CopyWith$Input$IntFieldComparison(
            local$distanceBest,
            (e) => call(distanceBest: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get driverId {
    final local$driverId = _instance.driverId;
    return local$driverId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$driverId,
            (e) => call(driverId: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$OrderAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderAggregateFilter<Input$OrderAggregateFilter>
      >?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map(
        (e) => CopyWith$Input$OrderAggregateFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$OrderStatusFilterComparison<TRes> get status {
    final local$status = _instance.status;
    return local$status == null
        ? CopyWith$Input$OrderStatusFilterComparison.stub(_then(_instance))
        : CopyWith$Input$OrderStatusFilterComparison(
            local$status,
            (e) => call(status: e),
          );
  }
}

class _CopyWithStubImpl$Input$OrderAggregateFilter<TRes>
    implements CopyWith$Input$OrderAggregateFilter<TRes> {
  _CopyWithStubImpl$Input$OrderAggregateFilter(this._res);

  TRes _res;

  call({
    List<Input$OrderAggregateFilter>? and,
    Input$NumberFieldComparison? costBest,
    Input$DateFieldComparison? createdOn,
    Input$IntFieldComparison? distanceBest,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$OrderAggregateFilter>? or,
    Input$OrderStatusFilterComparison? status,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$NumberFieldComparison<TRes> get costBest =>
      CopyWith$Input$NumberFieldComparison.stub(_res);

  CopyWith$Input$DateFieldComparison<TRes> get createdOn =>
      CopyWith$Input$DateFieldComparison.stub(_res);

  CopyWith$Input$IntFieldComparison<TRes> get distanceBest =>
      CopyWith$Input$IntFieldComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get driverId =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;

  CopyWith$Input$OrderStatusFilterComparison<TRes> get status =>
      CopyWith$Input$OrderStatusFilterComparison.stub(_res);
}

class Input$OrderFilter {
  factory Input$OrderFilter({
    List<Input$OrderFilter>? and,
    Input$NumberFieldComparison? costBest,
    Input$DateFieldComparison? createdOn,
    Input$IntFieldComparison? distanceBest,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$OrderFilter>? or,
    Input$OrderStatusFilterComparison? status,
  }) => Input$OrderFilter._({
    if (and != null) r'and': and,
    if (costBest != null) r'costBest': costBest,
    if (createdOn != null) r'createdOn': createdOn,
    if (distanceBest != null) r'distanceBest': distanceBest,
    if (driverId != null) r'driverId': driverId,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
    if (status != null) r'status': status,
  });

  Input$OrderFilter._(this._$data);

  factory Input$OrderFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map((e) => Input$OrderFilter.fromJson((e as Map<String, dynamic>)))
          .toList();
    }
    if (data.containsKey('costBest')) {
      final l$costBest = data['costBest'];
      result$data['costBest'] = l$costBest == null
          ? null
          : Input$NumberFieldComparison.fromJson(
              (l$costBest as Map<String, dynamic>),
            );
    }
    if (data.containsKey('createdOn')) {
      final l$createdOn = data['createdOn'];
      result$data['createdOn'] = l$createdOn == null
          ? null
          : Input$DateFieldComparison.fromJson(
              (l$createdOn as Map<String, dynamic>),
            );
    }
    if (data.containsKey('distanceBest')) {
      final l$distanceBest = data['distanceBest'];
      result$data['distanceBest'] = l$distanceBest == null
          ? null
          : Input$IntFieldComparison.fromJson(
              (l$distanceBest as Map<String, dynamic>),
            );
    }
    if (data.containsKey('driverId')) {
      final l$driverId = data['driverId'];
      result$data['driverId'] = l$driverId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$driverId as Map<String, dynamic>),
            );
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map((e) => Input$OrderFilter.fromJson((e as Map<String, dynamic>)))
          .toList();
    }
    if (data.containsKey('status')) {
      final l$status = data['status'];
      result$data['status'] = l$status == null
          ? null
          : Input$OrderStatusFilterComparison.fromJson(
              (l$status as Map<String, dynamic>),
            );
    }
    return Input$OrderFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$OrderFilter>? get and =>
      (_$data['and'] as List<Input$OrderFilter>?);

  Input$NumberFieldComparison? get costBest =>
      (_$data['costBest'] as Input$NumberFieldComparison?);

  Input$DateFieldComparison? get createdOn =>
      (_$data['createdOn'] as Input$DateFieldComparison?);

  Input$IntFieldComparison? get distanceBest =>
      (_$data['distanceBest'] as Input$IntFieldComparison?);

  Input$IDFilterComparison? get driverId =>
      (_$data['driverId'] as Input$IDFilterComparison?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$OrderFilter>? get or => (_$data['or'] as List<Input$OrderFilter>?);

  Input$OrderStatusFilterComparison? get status =>
      (_$data['status'] as Input$OrderStatusFilterComparison?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('costBest')) {
      final l$costBest = costBest;
      result$data['costBest'] = l$costBest?.toJson();
    }
    if (_$data.containsKey('createdOn')) {
      final l$createdOn = createdOn;
      result$data['createdOn'] = l$createdOn?.toJson();
    }
    if (_$data.containsKey('distanceBest')) {
      final l$distanceBest = distanceBest;
      result$data['distanceBest'] = l$distanceBest?.toJson();
    }
    if (_$data.containsKey('driverId')) {
      final l$driverId = driverId;
      result$data['driverId'] = l$driverId?.toJson();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('status')) {
      final l$status = status;
      result$data['status'] = l$status?.toJson();
    }
    return result$data;
  }

  CopyWith$Input$OrderFilter<Input$OrderFilter> get copyWith =>
      CopyWith$Input$OrderFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$costBest = costBest;
    final lOther$costBest = other.costBest;
    if (_$data.containsKey('costBest') !=
        other._$data.containsKey('costBest')) {
      return false;
    }
    if (l$costBest != lOther$costBest) {
      return false;
    }
    final l$createdOn = createdOn;
    final lOther$createdOn = other.createdOn;
    if (_$data.containsKey('createdOn') !=
        other._$data.containsKey('createdOn')) {
      return false;
    }
    if (l$createdOn != lOther$createdOn) {
      return false;
    }
    final l$distanceBest = distanceBest;
    final lOther$distanceBest = other.distanceBest;
    if (_$data.containsKey('distanceBest') !=
        other._$data.containsKey('distanceBest')) {
      return false;
    }
    if (l$distanceBest != lOther$distanceBest) {
      return false;
    }
    final l$driverId = driverId;
    final lOther$driverId = other.driverId;
    if (_$data.containsKey('driverId') !=
        other._$data.containsKey('driverId')) {
      return false;
    }
    if (l$driverId != lOther$driverId) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    final l$status = status;
    final lOther$status = other.status;
    if (_$data.containsKey('status') != other._$data.containsKey('status')) {
      return false;
    }
    if (l$status != lOther$status) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$costBest = costBest;
    final l$createdOn = createdOn;
    final l$distanceBest = distanceBest;
    final l$driverId = driverId;
    final l$id = id;
    final l$or = or;
    final l$status = status;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('costBest') ? l$costBest : const {},
      _$data.containsKey('createdOn') ? l$createdOn : const {},
      _$data.containsKey('distanceBest') ? l$distanceBest : const {},
      _$data.containsKey('driverId') ? l$driverId : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
      _$data.containsKey('status') ? l$status : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderFilter<TRes> {
  factory CopyWith$Input$OrderFilter(
    Input$OrderFilter instance,
    TRes Function(Input$OrderFilter) then,
  ) = _CopyWithImpl$Input$OrderFilter;

  factory CopyWith$Input$OrderFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderFilter;

  TRes call({
    List<Input$OrderFilter>? and,
    Input$NumberFieldComparison? costBest,
    Input$DateFieldComparison? createdOn,
    Input$IntFieldComparison? distanceBest,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$OrderFilter>? or,
    Input$OrderStatusFilterComparison? status,
  });
  TRes and(
    Iterable<Input$OrderFilter>? Function(
      Iterable<CopyWith$Input$OrderFilter<Input$OrderFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$NumberFieldComparison<TRes> get costBest;
  CopyWith$Input$DateFieldComparison<TRes> get createdOn;
  CopyWith$Input$IntFieldComparison<TRes> get distanceBest;
  CopyWith$Input$IDFilterComparison<TRes> get driverId;
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$OrderFilter>? Function(
      Iterable<CopyWith$Input$OrderFilter<Input$OrderFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$OrderStatusFilterComparison<TRes> get status;
}

class _CopyWithImpl$Input$OrderFilter<TRes>
    implements CopyWith$Input$OrderFilter<TRes> {
  _CopyWithImpl$Input$OrderFilter(this._instance, this._then);

  final Input$OrderFilter _instance;

  final TRes Function(Input$OrderFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? costBest = _undefined,
    Object? createdOn = _undefined,
    Object? distanceBest = _undefined,
    Object? driverId = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
    Object? status = _undefined,
  }) => _then(
    Input$OrderFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$OrderFilter>?),
      if (costBest != _undefined)
        'costBest': (costBest as Input$NumberFieldComparison?),
      if (createdOn != _undefined)
        'createdOn': (createdOn as Input$DateFieldComparison?),
      if (distanceBest != _undefined)
        'distanceBest': (distanceBest as Input$IntFieldComparison?),
      if (driverId != _undefined)
        'driverId': (driverId as Input$IDFilterComparison?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$OrderFilter>?),
      if (status != _undefined)
        'status': (status as Input$OrderStatusFilterComparison?),
    }),
  );

  TRes and(
    Iterable<Input$OrderFilter>? Function(
      Iterable<CopyWith$Input$OrderFilter<Input$OrderFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$OrderFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$NumberFieldComparison<TRes> get costBest {
    final local$costBest = _instance.costBest;
    return local$costBest == null
        ? CopyWith$Input$NumberFieldComparison.stub(_then(_instance))
        : CopyWith$Input$NumberFieldComparison(
            local$costBest,
            (e) => call(costBest: e),
          );
  }

  CopyWith$Input$DateFieldComparison<TRes> get createdOn {
    final local$createdOn = _instance.createdOn;
    return local$createdOn == null
        ? CopyWith$Input$DateFieldComparison.stub(_then(_instance))
        : CopyWith$Input$DateFieldComparison(
            local$createdOn,
            (e) => call(createdOn: e),
          );
  }

  CopyWith$Input$IntFieldComparison<TRes> get distanceBest {
    final local$distanceBest = _instance.distanceBest;
    return local$distanceBest == null
        ? CopyWith$Input$IntFieldComparison.stub(_then(_instance))
        : CopyWith$Input$IntFieldComparison(
            local$distanceBest,
            (e) => call(distanceBest: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get driverId {
    final local$driverId = _instance.driverId;
    return local$driverId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$driverId,
            (e) => call(driverId: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$OrderFilter>? Function(
      Iterable<CopyWith$Input$OrderFilter<Input$OrderFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$OrderFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$OrderStatusFilterComparison<TRes> get status {
    final local$status = _instance.status;
    return local$status == null
        ? CopyWith$Input$OrderStatusFilterComparison.stub(_then(_instance))
        : CopyWith$Input$OrderStatusFilterComparison(
            local$status,
            (e) => call(status: e),
          );
  }
}

class _CopyWithStubImpl$Input$OrderFilter<TRes>
    implements CopyWith$Input$OrderFilter<TRes> {
  _CopyWithStubImpl$Input$OrderFilter(this._res);

  TRes _res;

  call({
    List<Input$OrderFilter>? and,
    Input$NumberFieldComparison? costBest,
    Input$DateFieldComparison? createdOn,
    Input$IntFieldComparison? distanceBest,
    Input$IDFilterComparison? driverId,
    Input$IDFilterComparison? id,
    List<Input$OrderFilter>? or,
    Input$OrderStatusFilterComparison? status,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$NumberFieldComparison<TRes> get costBest =>
      CopyWith$Input$NumberFieldComparison.stub(_res);

  CopyWith$Input$DateFieldComparison<TRes> get createdOn =>
      CopyWith$Input$DateFieldComparison.stub(_res);

  CopyWith$Input$IntFieldComparison<TRes> get distanceBest =>
      CopyWith$Input$IntFieldComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get driverId =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;

  CopyWith$Input$OrderStatusFilterComparison<TRes> get status =>
      CopyWith$Input$OrderStatusFilterComparison.stub(_res);
}

class Input$OrderMessageAggregateFilter {
  factory Input$OrderMessageAggregateFilter({
    List<Input$OrderMessageAggregateFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$OrderMessageAggregateFilter>? or,
    Input$IDFilterComparison? requestId,
  }) => Input$OrderMessageAggregateFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
    if (requestId != null) r'requestId': requestId,
  });

  Input$OrderMessageAggregateFilter._(this._$data);

  factory Input$OrderMessageAggregateFilter.fromJson(
    Map<String, dynamic> data,
  ) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$OrderMessageAggregateFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$OrderMessageAggregateFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('requestId')) {
      final l$requestId = data['requestId'];
      result$data['requestId'] = l$requestId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$requestId as Map<String, dynamic>),
            );
    }
    return Input$OrderMessageAggregateFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$OrderMessageAggregateFilter>? get and =>
      (_$data['and'] as List<Input$OrderMessageAggregateFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$OrderMessageAggregateFilter>? get or =>
      (_$data['or'] as List<Input$OrderMessageAggregateFilter>?);

  Input$IDFilterComparison? get requestId =>
      (_$data['requestId'] as Input$IDFilterComparison?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('requestId')) {
      final l$requestId = requestId;
      result$data['requestId'] = l$requestId?.toJson();
    }
    return result$data;
  }

  CopyWith$Input$OrderMessageAggregateFilter<Input$OrderMessageAggregateFilter>
  get copyWith => CopyWith$Input$OrderMessageAggregateFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderMessageAggregateFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    final l$requestId = requestId;
    final lOther$requestId = other.requestId;
    if (_$data.containsKey('requestId') !=
        other._$data.containsKey('requestId')) {
      return false;
    }
    if (l$requestId != lOther$requestId) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    final l$requestId = requestId;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
      _$data.containsKey('requestId') ? l$requestId : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderMessageAggregateFilter<TRes> {
  factory CopyWith$Input$OrderMessageAggregateFilter(
    Input$OrderMessageAggregateFilter instance,
    TRes Function(Input$OrderMessageAggregateFilter) then,
  ) = _CopyWithImpl$Input$OrderMessageAggregateFilter;

  factory CopyWith$Input$OrderMessageAggregateFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderMessageAggregateFilter;

  TRes call({
    List<Input$OrderMessageAggregateFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$OrderMessageAggregateFilter>? or,
    Input$IDFilterComparison? requestId,
  });
  TRes and(
    Iterable<Input$OrderMessageAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderMessageAggregateFilter<
          Input$OrderMessageAggregateFilter
        >
      >?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$OrderMessageAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderMessageAggregateFilter<
          Input$OrderMessageAggregateFilter
        >
      >?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get requestId;
}

class _CopyWithImpl$Input$OrderMessageAggregateFilter<TRes>
    implements CopyWith$Input$OrderMessageAggregateFilter<TRes> {
  _CopyWithImpl$Input$OrderMessageAggregateFilter(this._instance, this._then);

  final Input$OrderMessageAggregateFilter _instance;

  final TRes Function(Input$OrderMessageAggregateFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
    Object? requestId = _undefined,
  }) => _then(
    Input$OrderMessageAggregateFilter._({
      ..._instance._$data,
      if (and != _undefined)
        'and': (and as List<Input$OrderMessageAggregateFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined)
        'or': (or as List<Input$OrderMessageAggregateFilter>?),
      if (requestId != _undefined)
        'requestId': (requestId as Input$IDFilterComparison?),
    }),
  );

  TRes and(
    Iterable<Input$OrderMessageAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderMessageAggregateFilter<
          Input$OrderMessageAggregateFilter
        >
      >?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map(
        (e) => CopyWith$Input$OrderMessageAggregateFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$OrderMessageAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$OrderMessageAggregateFilter<
          Input$OrderMessageAggregateFilter
        >
      >?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map(
        (e) => CopyWith$Input$OrderMessageAggregateFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get requestId {
    final local$requestId = _instance.requestId;
    return local$requestId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$requestId,
            (e) => call(requestId: e),
          );
  }
}

class _CopyWithStubImpl$Input$OrderMessageAggregateFilter<TRes>
    implements CopyWith$Input$OrderMessageAggregateFilter<TRes> {
  _CopyWithStubImpl$Input$OrderMessageAggregateFilter(this._res);

  TRes _res;

  call({
    List<Input$OrderMessageAggregateFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$OrderMessageAggregateFilter>? or,
    Input$IDFilterComparison? requestId,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get requestId =>
      CopyWith$Input$IDFilterComparison.stub(_res);
}

class Input$OrderMessageFilter {
  factory Input$OrderMessageFilter({
    List<Input$OrderMessageFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$OrderMessageFilter>? or,
    Input$IDFilterComparison? requestId,
  }) => Input$OrderMessageFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
    if (requestId != null) r'requestId': requestId,
  });

  Input$OrderMessageFilter._(this._$data);

  factory Input$OrderMessageFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) =>
                Input$OrderMessageFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) =>
                Input$OrderMessageFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('requestId')) {
      final l$requestId = data['requestId'];
      result$data['requestId'] = l$requestId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$requestId as Map<String, dynamic>),
            );
    }
    return Input$OrderMessageFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$OrderMessageFilter>? get and =>
      (_$data['and'] as List<Input$OrderMessageFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$OrderMessageFilter>? get or =>
      (_$data['or'] as List<Input$OrderMessageFilter>?);

  Input$IDFilterComparison? get requestId =>
      (_$data['requestId'] as Input$IDFilterComparison?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('requestId')) {
      final l$requestId = requestId;
      result$data['requestId'] = l$requestId?.toJson();
    }
    return result$data;
  }

  CopyWith$Input$OrderMessageFilter<Input$OrderMessageFilter> get copyWith =>
      CopyWith$Input$OrderMessageFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderMessageFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    final l$requestId = requestId;
    final lOther$requestId = other.requestId;
    if (_$data.containsKey('requestId') !=
        other._$data.containsKey('requestId')) {
      return false;
    }
    if (l$requestId != lOther$requestId) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    final l$requestId = requestId;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
      _$data.containsKey('requestId') ? l$requestId : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderMessageFilter<TRes> {
  factory CopyWith$Input$OrderMessageFilter(
    Input$OrderMessageFilter instance,
    TRes Function(Input$OrderMessageFilter) then,
  ) = _CopyWithImpl$Input$OrderMessageFilter;

  factory CopyWith$Input$OrderMessageFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderMessageFilter;

  TRes call({
    List<Input$OrderMessageFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$OrderMessageFilter>? or,
    Input$IDFilterComparison? requestId,
  });
  TRes and(
    Iterable<Input$OrderMessageFilter>? Function(
      Iterable<CopyWith$Input$OrderMessageFilter<Input$OrderMessageFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$OrderMessageFilter>? Function(
      Iterable<CopyWith$Input$OrderMessageFilter<Input$OrderMessageFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get requestId;
}

class _CopyWithImpl$Input$OrderMessageFilter<TRes>
    implements CopyWith$Input$OrderMessageFilter<TRes> {
  _CopyWithImpl$Input$OrderMessageFilter(this._instance, this._then);

  final Input$OrderMessageFilter _instance;

  final TRes Function(Input$OrderMessageFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
    Object? requestId = _undefined,
  }) => _then(
    Input$OrderMessageFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$OrderMessageFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$OrderMessageFilter>?),
      if (requestId != _undefined)
        'requestId': (requestId as Input$IDFilterComparison?),
    }),
  );

  TRes and(
    Iterable<Input$OrderMessageFilter>? Function(
      Iterable<CopyWith$Input$OrderMessageFilter<Input$OrderMessageFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$OrderMessageFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$OrderMessageFilter>? Function(
      Iterable<CopyWith$Input$OrderMessageFilter<Input$OrderMessageFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$OrderMessageFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get requestId {
    final local$requestId = _instance.requestId;
    return local$requestId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$requestId,
            (e) => call(requestId: e),
          );
  }
}

class _CopyWithStubImpl$Input$OrderMessageFilter<TRes>
    implements CopyWith$Input$OrderMessageFilter<TRes> {
  _CopyWithStubImpl$Input$OrderMessageFilter(this._res);

  TRes _res;

  call({
    List<Input$OrderMessageFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$OrderMessageFilter>? or,
    Input$IDFilterComparison? requestId,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get requestId =>
      CopyWith$Input$IDFilterComparison.stub(_res);
}

class Input$OrderMessageInput {
  factory Input$OrderMessageInput({
    required String content,
    required String requestId,
  }) =>
      Input$OrderMessageInput._({r'content': content, r'requestId': requestId});

  Input$OrderMessageInput._(this._$data);

  factory Input$OrderMessageInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$content = data['content'];
    result$data['content'] = (l$content as String);
    final l$requestId = data['requestId'];
    result$data['requestId'] = (l$requestId as String);
    return Input$OrderMessageInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String get content => (_$data['content'] as String);

  String get requestId => (_$data['requestId'] as String);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$content = content;
    result$data['content'] = l$content;
    final l$requestId = requestId;
    result$data['requestId'] = l$requestId;
    return result$data;
  }

  CopyWith$Input$OrderMessageInput<Input$OrderMessageInput> get copyWith =>
      CopyWith$Input$OrderMessageInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderMessageInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$content = content;
    final lOther$content = other.content;
    if (l$content != lOther$content) {
      return false;
    }
    final l$requestId = requestId;
    final lOther$requestId = other.requestId;
    if (l$requestId != lOther$requestId) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$content = content;
    final l$requestId = requestId;
    return Object.hashAll([l$content, l$requestId]);
  }
}

abstract class CopyWith$Input$OrderMessageInput<TRes> {
  factory CopyWith$Input$OrderMessageInput(
    Input$OrderMessageInput instance,
    TRes Function(Input$OrderMessageInput) then,
  ) = _CopyWithImpl$Input$OrderMessageInput;

  factory CopyWith$Input$OrderMessageInput.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderMessageInput;

  TRes call({String? content, String? requestId});
}

class _CopyWithImpl$Input$OrderMessageInput<TRes>
    implements CopyWith$Input$OrderMessageInput<TRes> {
  _CopyWithImpl$Input$OrderMessageInput(this._instance, this._then);

  final Input$OrderMessageInput _instance;

  final TRes Function(Input$OrderMessageInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? content = _undefined, Object? requestId = _undefined}) =>
      _then(
        Input$OrderMessageInput._({
          ..._instance._$data,
          if (content != _undefined && content != null)
            'content': (content as String),
          if (requestId != _undefined && requestId != null)
            'requestId': (requestId as String),
        }),
      );
}

class _CopyWithStubImpl$Input$OrderMessageInput<TRes>
    implements CopyWith$Input$OrderMessageInput<TRes> {
  _CopyWithStubImpl$Input$OrderMessageInput(this._res);

  TRes _res;

  call({String? content, String? requestId}) => _res;
}

class Input$OrderMessageSort {
  factory Input$OrderMessageSort({
    required Enum$SortDirection direction,
    required Enum$OrderMessageSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$OrderMessageSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$OrderMessageSort._(this._$data);

  factory Input$OrderMessageSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$OrderMessageSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$OrderMessageSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$OrderMessageSortFields get field =>
      (_$data['field'] as Enum$OrderMessageSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$OrderMessageSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$OrderMessageSort<Input$OrderMessageSort> get copyWith =>
      CopyWith$Input$OrderMessageSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderMessageSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderMessageSort<TRes> {
  factory CopyWith$Input$OrderMessageSort(
    Input$OrderMessageSort instance,
    TRes Function(Input$OrderMessageSort) then,
  ) = _CopyWithImpl$Input$OrderMessageSort;

  factory CopyWith$Input$OrderMessageSort.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderMessageSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$OrderMessageSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$OrderMessageSort<TRes>
    implements CopyWith$Input$OrderMessageSort<TRes> {
  _CopyWithImpl$Input$OrderMessageSort(this._instance, this._then);

  final Input$OrderMessageSort _instance;

  final TRes Function(Input$OrderMessageSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$OrderMessageSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$OrderMessageSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$OrderMessageSort<TRes>
    implements CopyWith$Input$OrderMessageSort<TRes> {
  _CopyWithStubImpl$Input$OrderMessageSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$OrderMessageSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$OrderSort {
  factory Input$OrderSort({
    required Enum$SortDirection direction,
    required Enum$OrderSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$OrderSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$OrderSort._(this._$data);

  factory Input$OrderSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$OrderSortFields((l$field as String));
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$OrderSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$OrderSortFields get field => (_$data['field'] as Enum$OrderSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$OrderSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$OrderSort<Input$OrderSort> get copyWith =>
      CopyWith$Input$OrderSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderSort<TRes> {
  factory CopyWith$Input$OrderSort(
    Input$OrderSort instance,
    TRes Function(Input$OrderSort) then,
  ) = _CopyWithImpl$Input$OrderSort;

  factory CopyWith$Input$OrderSort.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$OrderSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$OrderSort<TRes>
    implements CopyWith$Input$OrderSort<TRes> {
  _CopyWithImpl$Input$OrderSort(this._instance, this._then);

  final Input$OrderSort _instance;

  final TRes Function(Input$OrderSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$OrderSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$OrderSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$OrderSort<TRes>
    implements CopyWith$Input$OrderSort<TRes> {
  _CopyWithStubImpl$Input$OrderSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$OrderSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$OrderStatusFilterComparison {
  factory Input$OrderStatusFilterComparison({
    Enum$OrderStatus? eq,
    Enum$OrderStatus? gt,
    Enum$OrderStatus? gte,
    Enum$OrderStatus? iLike,
    List<Enum$OrderStatus>? $in,
    bool? $is,
    bool? isNot,
    Enum$OrderStatus? like,
    Enum$OrderStatus? lt,
    Enum$OrderStatus? lte,
    Enum$OrderStatus? neq,
    Enum$OrderStatus? notILike,
    List<Enum$OrderStatus>? notIn,
    Enum$OrderStatus? notLike,
  }) => Input$OrderStatusFilterComparison._({
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if (iLike != null) r'iLike': iLike,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (like != null) r'like': like,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notILike != null) r'notILike': notILike,
    if (notIn != null) r'notIn': notIn,
    if (notLike != null) r'notLike': notLike,
  });

  Input$OrderStatusFilterComparison._(this._$data);

  factory Input$OrderStatusFilterComparison.fromJson(
    Map<String, dynamic> data,
  ) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = l$eq == null
          ? null
          : fromJson$Enum$OrderStatus((l$eq as String));
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = l$gt == null
          ? null
          : fromJson$Enum$OrderStatus((l$gt as String));
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = l$gte == null
          ? null
          : fromJson$Enum$OrderStatus((l$gte as String));
    }
    if (data.containsKey('iLike')) {
      final l$iLike = data['iLike'];
      result$data['iLike'] = l$iLike == null
          ? null
          : fromJson$Enum$OrderStatus((l$iLike as String));
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => fromJson$Enum$OrderStatus((e as String)))
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('like')) {
      final l$like = data['like'];
      result$data['like'] = l$like == null
          ? null
          : fromJson$Enum$OrderStatus((l$like as String));
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = l$lt == null
          ? null
          : fromJson$Enum$OrderStatus((l$lt as String));
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = l$lte == null
          ? null
          : fromJson$Enum$OrderStatus((l$lte as String));
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = l$neq == null
          ? null
          : fromJson$Enum$OrderStatus((l$neq as String));
    }
    if (data.containsKey('notILike')) {
      final l$notILike = data['notILike'];
      result$data['notILike'] = l$notILike == null
          ? null
          : fromJson$Enum$OrderStatus((l$notILike as String));
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => fromJson$Enum$OrderStatus((e as String)))
          .toList();
    }
    if (data.containsKey('notLike')) {
      final l$notLike = data['notLike'];
      result$data['notLike'] = l$notLike == null
          ? null
          : fromJson$Enum$OrderStatus((l$notLike as String));
    }
    return Input$OrderStatusFilterComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$OrderStatus? get eq => (_$data['eq'] as Enum$OrderStatus?);

  Enum$OrderStatus? get gt => (_$data['gt'] as Enum$OrderStatus?);

  Enum$OrderStatus? get gte => (_$data['gte'] as Enum$OrderStatus?);

  Enum$OrderStatus? get iLike => (_$data['iLike'] as Enum$OrderStatus?);

  List<Enum$OrderStatus>? get $in => (_$data['in'] as List<Enum$OrderStatus>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  Enum$OrderStatus? get like => (_$data['like'] as Enum$OrderStatus?);

  Enum$OrderStatus? get lt => (_$data['lt'] as Enum$OrderStatus?);

  Enum$OrderStatus? get lte => (_$data['lte'] as Enum$OrderStatus?);

  Enum$OrderStatus? get neq => (_$data['neq'] as Enum$OrderStatus?);

  Enum$OrderStatus? get notILike => (_$data['notILike'] as Enum$OrderStatus?);

  List<Enum$OrderStatus>? get notIn =>
      (_$data['notIn'] as List<Enum$OrderStatus>?);

  Enum$OrderStatus? get notLike => (_$data['notLike'] as Enum$OrderStatus?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq == null ? null : toJson$Enum$OrderStatus(l$eq);
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt == null ? null : toJson$Enum$OrderStatus(l$gt);
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte == null
          ? null
          : toJson$Enum$OrderStatus(l$gte);
    }
    if (_$data.containsKey('iLike')) {
      final l$iLike = iLike;
      result$data['iLike'] = l$iLike == null
          ? null
          : toJson$Enum$OrderStatus(l$iLike);
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in
          ?.map((e) => toJson$Enum$OrderStatus(e))
          .toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('like')) {
      final l$like = like;
      result$data['like'] = l$like == null
          ? null
          : toJson$Enum$OrderStatus(l$like);
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt == null ? null : toJson$Enum$OrderStatus(l$lt);
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte == null
          ? null
          : toJson$Enum$OrderStatus(l$lte);
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq == null
          ? null
          : toJson$Enum$OrderStatus(l$neq);
    }
    if (_$data.containsKey('notILike')) {
      final l$notILike = notILike;
      result$data['notILike'] = l$notILike == null
          ? null
          : toJson$Enum$OrderStatus(l$notILike);
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn
          ?.map((e) => toJson$Enum$OrderStatus(e))
          .toList();
    }
    if (_$data.containsKey('notLike')) {
      final l$notLike = notLike;
      result$data['notLike'] = l$notLike == null
          ? null
          : toJson$Enum$OrderStatus(l$notLike);
    }
    return result$data;
  }

  CopyWith$Input$OrderStatusFilterComparison<Input$OrderStatusFilterComparison>
  get copyWith => CopyWith$Input$OrderStatusFilterComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$OrderStatusFilterComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$iLike = iLike;
    final lOther$iLike = other.iLike;
    if (_$data.containsKey('iLike') != other._$data.containsKey('iLike')) {
      return false;
    }
    if (l$iLike != lOther$iLike) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$like = like;
    final lOther$like = other.like;
    if (_$data.containsKey('like') != other._$data.containsKey('like')) {
      return false;
    }
    if (l$like != lOther$like) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notILike = notILike;
    final lOther$notILike = other.notILike;
    if (_$data.containsKey('notILike') !=
        other._$data.containsKey('notILike')) {
      return false;
    }
    if (l$notILike != lOther$notILike) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    final l$notLike = notLike;
    final lOther$notLike = other.notLike;
    if (_$data.containsKey('notLike') != other._$data.containsKey('notLike')) {
      return false;
    }
    if (l$notLike != lOther$notLike) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$iLike = iLike;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$like = like;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notILike = notILike;
    final l$notIn = notIn;
    final l$notLike = notLike;
    return Object.hashAll([
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('iLike') ? l$iLike : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('like') ? l$like : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notILike') ? l$notILike : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
      _$data.containsKey('notLike') ? l$notLike : const {},
    ]);
  }
}

abstract class CopyWith$Input$OrderStatusFilterComparison<TRes> {
  factory CopyWith$Input$OrderStatusFilterComparison(
    Input$OrderStatusFilterComparison instance,
    TRes Function(Input$OrderStatusFilterComparison) then,
  ) = _CopyWithImpl$Input$OrderStatusFilterComparison;

  factory CopyWith$Input$OrderStatusFilterComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$OrderStatusFilterComparison;

  TRes call({
    Enum$OrderStatus? eq,
    Enum$OrderStatus? gt,
    Enum$OrderStatus? gte,
    Enum$OrderStatus? iLike,
    List<Enum$OrderStatus>? $in,
    bool? $is,
    bool? isNot,
    Enum$OrderStatus? like,
    Enum$OrderStatus? lt,
    Enum$OrderStatus? lte,
    Enum$OrderStatus? neq,
    Enum$OrderStatus? notILike,
    List<Enum$OrderStatus>? notIn,
    Enum$OrderStatus? notLike,
  });
}

class _CopyWithImpl$Input$OrderStatusFilterComparison<TRes>
    implements CopyWith$Input$OrderStatusFilterComparison<TRes> {
  _CopyWithImpl$Input$OrderStatusFilterComparison(this._instance, this._then);

  final Input$OrderStatusFilterComparison _instance;

  final TRes Function(Input$OrderStatusFilterComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? iLike = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? like = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notILike = _undefined,
    Object? notIn = _undefined,
    Object? notLike = _undefined,
  }) => _then(
    Input$OrderStatusFilterComparison._({
      ..._instance._$data,
      if (eq != _undefined) 'eq': (eq as Enum$OrderStatus?),
      if (gt != _undefined) 'gt': (gt as Enum$OrderStatus?),
      if (gte != _undefined) 'gte': (gte as Enum$OrderStatus?),
      if (iLike != _undefined) 'iLike': (iLike as Enum$OrderStatus?),
      if ($in != _undefined) 'in': ($in as List<Enum$OrderStatus>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (like != _undefined) 'like': (like as Enum$OrderStatus?),
      if (lt != _undefined) 'lt': (lt as Enum$OrderStatus?),
      if (lte != _undefined) 'lte': (lte as Enum$OrderStatus?),
      if (neq != _undefined) 'neq': (neq as Enum$OrderStatus?),
      if (notILike != _undefined) 'notILike': (notILike as Enum$OrderStatus?),
      if (notIn != _undefined) 'notIn': (notIn as List<Enum$OrderStatus>?),
      if (notLike != _undefined) 'notLike': (notLike as Enum$OrderStatus?),
    }),
  );
}

class _CopyWithStubImpl$Input$OrderStatusFilterComparison<TRes>
    implements CopyWith$Input$OrderStatusFilterComparison<TRes> {
  _CopyWithStubImpl$Input$OrderStatusFilterComparison(this._res);

  TRes _res;

  call({
    Enum$OrderStatus? eq,
    Enum$OrderStatus? gt,
    Enum$OrderStatus? gte,
    Enum$OrderStatus? iLike,
    List<Enum$OrderStatus>? $in,
    bool? $is,
    bool? isNot,
    Enum$OrderStatus? like,
    Enum$OrderStatus? lt,
    Enum$OrderStatus? lte,
    Enum$OrderStatus? neq,
    Enum$OrderStatus? notILike,
    List<Enum$OrderStatus>? notIn,
    Enum$OrderStatus? notLike,
  }) => _res;
}

class Input$PaymentGatewayFilter {
  factory Input$PaymentGatewayFilter({
    List<Input$PaymentGatewayFilter>? and,
    Input$BooleanFieldComparison? enabled,
    Input$IDFilterComparison? id,
    List<Input$PaymentGatewayFilter>? or,
  }) => Input$PaymentGatewayFilter._({
    if (and != null) r'and': and,
    if (enabled != null) r'enabled': enabled,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$PaymentGatewayFilter._(this._$data);

  factory Input$PaymentGatewayFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$PaymentGatewayFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('enabled')) {
      final l$enabled = data['enabled'];
      result$data['enabled'] = l$enabled == null
          ? null
          : Input$BooleanFieldComparison.fromJson(
              (l$enabled as Map<String, dynamic>),
            );
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$PaymentGatewayFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    return Input$PaymentGatewayFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$PaymentGatewayFilter>? get and =>
      (_$data['and'] as List<Input$PaymentGatewayFilter>?);

  Input$BooleanFieldComparison? get enabled =>
      (_$data['enabled'] as Input$BooleanFieldComparison?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$PaymentGatewayFilter>? get or =>
      (_$data['or'] as List<Input$PaymentGatewayFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('enabled')) {
      final l$enabled = enabled;
      result$data['enabled'] = l$enabled?.toJson();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$PaymentGatewayFilter<Input$PaymentGatewayFilter>
  get copyWith => CopyWith$Input$PaymentGatewayFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$PaymentGatewayFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$enabled = enabled;
    final lOther$enabled = other.enabled;
    if (_$data.containsKey('enabled') != other._$data.containsKey('enabled')) {
      return false;
    }
    if (l$enabled != lOther$enabled) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$enabled = enabled;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('enabled') ? l$enabled : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$PaymentGatewayFilter<TRes> {
  factory CopyWith$Input$PaymentGatewayFilter(
    Input$PaymentGatewayFilter instance,
    TRes Function(Input$PaymentGatewayFilter) then,
  ) = _CopyWithImpl$Input$PaymentGatewayFilter;

  factory CopyWith$Input$PaymentGatewayFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$PaymentGatewayFilter;

  TRes call({
    List<Input$PaymentGatewayFilter>? and,
    Input$BooleanFieldComparison? enabled,
    Input$IDFilterComparison? id,
    List<Input$PaymentGatewayFilter>? or,
  });
  TRes and(
    Iterable<Input$PaymentGatewayFilter>? Function(
      Iterable<
        CopyWith$Input$PaymentGatewayFilter<Input$PaymentGatewayFilter>
      >?,
    )
    _fn,
  );
  CopyWith$Input$BooleanFieldComparison<TRes> get enabled;
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$PaymentGatewayFilter>? Function(
      Iterable<
        CopyWith$Input$PaymentGatewayFilter<Input$PaymentGatewayFilter>
      >?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$PaymentGatewayFilter<TRes>
    implements CopyWith$Input$PaymentGatewayFilter<TRes> {
  _CopyWithImpl$Input$PaymentGatewayFilter(this._instance, this._then);

  final Input$PaymentGatewayFilter _instance;

  final TRes Function(Input$PaymentGatewayFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? enabled = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$PaymentGatewayFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$PaymentGatewayFilter>?),
      if (enabled != _undefined)
        'enabled': (enabled as Input$BooleanFieldComparison?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$PaymentGatewayFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$PaymentGatewayFilter>? Function(
      Iterable<
        CopyWith$Input$PaymentGatewayFilter<Input$PaymentGatewayFilter>
      >?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map(
        (e) => CopyWith$Input$PaymentGatewayFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$BooleanFieldComparison<TRes> get enabled {
    final local$enabled = _instance.enabled;
    return local$enabled == null
        ? CopyWith$Input$BooleanFieldComparison.stub(_then(_instance))
        : CopyWith$Input$BooleanFieldComparison(
            local$enabled,
            (e) => call(enabled: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$PaymentGatewayFilter>? Function(
      Iterable<
        CopyWith$Input$PaymentGatewayFilter<Input$PaymentGatewayFilter>
      >?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map(
        (e) => CopyWith$Input$PaymentGatewayFilter(e, (i) => i),
      ),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$PaymentGatewayFilter<TRes>
    implements CopyWith$Input$PaymentGatewayFilter<TRes> {
  _CopyWithStubImpl$Input$PaymentGatewayFilter(this._res);

  TRes _res;

  call({
    List<Input$PaymentGatewayFilter>? and,
    Input$BooleanFieldComparison? enabled,
    Input$IDFilterComparison? id,
    List<Input$PaymentGatewayFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$BooleanFieldComparison<TRes> get enabled =>
      CopyWith$Input$BooleanFieldComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$PaymentGatewaySort {
  factory Input$PaymentGatewaySort({
    required Enum$SortDirection direction,
    required Enum$PaymentGatewaySortFields field,
    Enum$SortNulls? nulls,
  }) => Input$PaymentGatewaySort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$PaymentGatewaySort._(this._$data);

  factory Input$PaymentGatewaySort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$PaymentGatewaySortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$PaymentGatewaySort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$PaymentGatewaySortFields get field =>
      (_$data['field'] as Enum$PaymentGatewaySortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$PaymentGatewaySortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$PaymentGatewaySort<Input$PaymentGatewaySort> get copyWith =>
      CopyWith$Input$PaymentGatewaySort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$PaymentGatewaySort ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$PaymentGatewaySort<TRes> {
  factory CopyWith$Input$PaymentGatewaySort(
    Input$PaymentGatewaySort instance,
    TRes Function(Input$PaymentGatewaySort) then,
  ) = _CopyWithImpl$Input$PaymentGatewaySort;

  factory CopyWith$Input$PaymentGatewaySort.stub(TRes res) =
      _CopyWithStubImpl$Input$PaymentGatewaySort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$PaymentGatewaySortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$PaymentGatewaySort<TRes>
    implements CopyWith$Input$PaymentGatewaySort<TRes> {
  _CopyWithImpl$Input$PaymentGatewaySort(this._instance, this._then);

  final Input$PaymentGatewaySort _instance;

  final TRes Function(Input$PaymentGatewaySort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$PaymentGatewaySort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$PaymentGatewaySortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$PaymentGatewaySort<TRes>
    implements CopyWith$Input$PaymentGatewaySort<TRes> {
  _CopyWithStubImpl$Input$PaymentGatewaySort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$PaymentGatewaySortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$PointInput {
  factory Input$PointInput({required double lat, required double lng}) =>
      Input$PointInput._({r'lat': lat, r'lng': lng});

  Input$PointInput._(this._$data);

  factory Input$PointInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$lat = data['lat'];
    result$data['lat'] = (l$lat as num).toDouble();
    final l$lng = data['lng'];
    result$data['lng'] = (l$lng as num).toDouble();
    return Input$PointInput._(result$data);
  }

  Map<String, dynamic> _$data;

  double get lat => (_$data['lat'] as double);

  double get lng => (_$data['lng'] as double);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$lat = lat;
    result$data['lat'] = l$lat;
    final l$lng = lng;
    result$data['lng'] = l$lng;
    return result$data;
  }

  CopyWith$Input$PointInput<Input$PointInput> get copyWith =>
      CopyWith$Input$PointInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$PointInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$lat = lat;
    final lOther$lat = other.lat;
    if (l$lat != lOther$lat) {
      return false;
    }
    final l$lng = lng;
    final lOther$lng = other.lng;
    if (l$lng != lOther$lng) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$lat = lat;
    final l$lng = lng;
    return Object.hashAll([l$lat, l$lng]);
  }
}

abstract class CopyWith$Input$PointInput<TRes> {
  factory CopyWith$Input$PointInput(
    Input$PointInput instance,
    TRes Function(Input$PointInput) then,
  ) = _CopyWithImpl$Input$PointInput;

  factory CopyWith$Input$PointInput.stub(TRes res) =
      _CopyWithStubImpl$Input$PointInput;

  TRes call({double? lat, double? lng});
}

class _CopyWithImpl$Input$PointInput<TRes>
    implements CopyWith$Input$PointInput<TRes> {
  _CopyWithImpl$Input$PointInput(this._instance, this._then);

  final Input$PointInput _instance;

  final TRes Function(Input$PointInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? lat = _undefined, Object? lng = _undefined}) => _then(
    Input$PointInput._({
      ..._instance._$data,
      if (lat != _undefined && lat != null) 'lat': (lat as double),
      if (lng != _undefined && lng != null) 'lng': (lng as double),
    }),
  );
}

class _CopyWithStubImpl$Input$PointInput<TRes>
    implements CopyWith$Input$PointInput<TRes> {
  _CopyWithStubImpl$Input$PointInput(this._res);

  TRes _res;

  call({double? lat, double? lng}) => _res;
}

class Input$RiderWalletFilter {
  factory Input$RiderWalletFilter({
    List<Input$RiderWalletFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$RiderWalletFilter>? or,
    Input$IDFilterComparison? riderId,
  }) => Input$RiderWalletFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
    if (riderId != null) r'riderId': riderId,
  });

  Input$RiderWalletFilter._(this._$data);

  factory Input$RiderWalletFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) =>
                Input$RiderWalletFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) =>
                Input$RiderWalletFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('riderId')) {
      final l$riderId = data['riderId'];
      result$data['riderId'] = l$riderId == null
          ? null
          : Input$IDFilterComparison.fromJson(
              (l$riderId as Map<String, dynamic>),
            );
    }
    return Input$RiderWalletFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$RiderWalletFilter>? get and =>
      (_$data['and'] as List<Input$RiderWalletFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$RiderWalletFilter>? get or =>
      (_$data['or'] as List<Input$RiderWalletFilter>?);

  Input$IDFilterComparison? get riderId =>
      (_$data['riderId'] as Input$IDFilterComparison?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('riderId')) {
      final l$riderId = riderId;
      result$data['riderId'] = l$riderId?.toJson();
    }
    return result$data;
  }

  CopyWith$Input$RiderWalletFilter<Input$RiderWalletFilter> get copyWith =>
      CopyWith$Input$RiderWalletFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$RiderWalletFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    final l$riderId = riderId;
    final lOther$riderId = other.riderId;
    if (_$data.containsKey('riderId') != other._$data.containsKey('riderId')) {
      return false;
    }
    if (l$riderId != lOther$riderId) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    final l$riderId = riderId;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
      _$data.containsKey('riderId') ? l$riderId : const {},
    ]);
  }
}

abstract class CopyWith$Input$RiderWalletFilter<TRes> {
  factory CopyWith$Input$RiderWalletFilter(
    Input$RiderWalletFilter instance,
    TRes Function(Input$RiderWalletFilter) then,
  ) = _CopyWithImpl$Input$RiderWalletFilter;

  factory CopyWith$Input$RiderWalletFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$RiderWalletFilter;

  TRes call({
    List<Input$RiderWalletFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$RiderWalletFilter>? or,
    Input$IDFilterComparison? riderId,
  });
  TRes and(
    Iterable<Input$RiderWalletFilter>? Function(
      Iterable<CopyWith$Input$RiderWalletFilter<Input$RiderWalletFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$RiderWalletFilter>? Function(
      Iterable<CopyWith$Input$RiderWalletFilter<Input$RiderWalletFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get riderId;
}

class _CopyWithImpl$Input$RiderWalletFilter<TRes>
    implements CopyWith$Input$RiderWalletFilter<TRes> {
  _CopyWithImpl$Input$RiderWalletFilter(this._instance, this._then);

  final Input$RiderWalletFilter _instance;

  final TRes Function(Input$RiderWalletFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
    Object? riderId = _undefined,
  }) => _then(
    Input$RiderWalletFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$RiderWalletFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$RiderWalletFilter>?),
      if (riderId != _undefined)
        'riderId': (riderId as Input$IDFilterComparison?),
    }),
  );

  TRes and(
    Iterable<Input$RiderWalletFilter>? Function(
      Iterable<CopyWith$Input$RiderWalletFilter<Input$RiderWalletFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$RiderWalletFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$RiderWalletFilter>? Function(
      Iterable<CopyWith$Input$RiderWalletFilter<Input$RiderWalletFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$RiderWalletFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get riderId {
    final local$riderId = _instance.riderId;
    return local$riderId == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(
            local$riderId,
            (e) => call(riderId: e),
          );
  }
}

class _CopyWithStubImpl$Input$RiderWalletFilter<TRes>
    implements CopyWith$Input$RiderWalletFilter<TRes> {
  _CopyWithStubImpl$Input$RiderWalletFilter(this._res);

  TRes _res;

  call({
    List<Input$RiderWalletFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$RiderWalletFilter>? or,
    Input$IDFilterComparison? riderId,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get riderId =>
      CopyWith$Input$IDFilterComparison.stub(_res);
}

class Input$RiderWalletSort {
  factory Input$RiderWalletSort({
    required Enum$SortDirection direction,
    required Enum$RiderWalletSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$RiderWalletSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$RiderWalletSort._(this._$data);

  factory Input$RiderWalletSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$RiderWalletSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$RiderWalletSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$RiderWalletSortFields get field =>
      (_$data['field'] as Enum$RiderWalletSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$RiderWalletSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$RiderWalletSort<Input$RiderWalletSort> get copyWith =>
      CopyWith$Input$RiderWalletSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$RiderWalletSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$RiderWalletSort<TRes> {
  factory CopyWith$Input$RiderWalletSort(
    Input$RiderWalletSort instance,
    TRes Function(Input$RiderWalletSort) then,
  ) = _CopyWithImpl$Input$RiderWalletSort;

  factory CopyWith$Input$RiderWalletSort.stub(TRes res) =
      _CopyWithStubImpl$Input$RiderWalletSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$RiderWalletSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$RiderWalletSort<TRes>
    implements CopyWith$Input$RiderWalletSort<TRes> {
  _CopyWithImpl$Input$RiderWalletSort(this._instance, this._then);

  final Input$RiderWalletSort _instance;

  final TRes Function(Input$RiderWalletSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$RiderWalletSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$RiderWalletSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$RiderWalletSort<TRes>
    implements CopyWith$Input$RiderWalletSort<TRes> {
  _CopyWithStubImpl$Input$RiderWalletSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$RiderWalletSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$ServiceFilter {
  factory Input$ServiceFilter({
    List<Input$ServiceFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceFilter>? or,
  }) => Input$ServiceFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$ServiceFilter._(this._$data);

  factory Input$ServiceFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$ServiceFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$ServiceFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    return Input$ServiceFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$ServiceFilter>? get and =>
      (_$data['and'] as List<Input$ServiceFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$ServiceFilter>? get or =>
      (_$data['or'] as List<Input$ServiceFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$ServiceFilter<Input$ServiceFilter> get copyWith =>
      CopyWith$Input$ServiceFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ServiceFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$ServiceFilter<TRes> {
  factory CopyWith$Input$ServiceFilter(
    Input$ServiceFilter instance,
    TRes Function(Input$ServiceFilter) then,
  ) = _CopyWithImpl$Input$ServiceFilter;

  factory CopyWith$Input$ServiceFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$ServiceFilter;

  TRes call({
    List<Input$ServiceFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceFilter>? or,
  });
  TRes and(
    Iterable<Input$ServiceFilter>? Function(
      Iterable<CopyWith$Input$ServiceFilter<Input$ServiceFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$ServiceFilter>? Function(
      Iterable<CopyWith$Input$ServiceFilter<Input$ServiceFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$ServiceFilter<TRes>
    implements CopyWith$Input$ServiceFilter<TRes> {
  _CopyWithImpl$Input$ServiceFilter(this._instance, this._then);

  final Input$ServiceFilter _instance;

  final TRes Function(Input$ServiceFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$ServiceFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$ServiceFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$ServiceFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$ServiceFilter>? Function(
      Iterable<CopyWith$Input$ServiceFilter<Input$ServiceFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$ServiceFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$ServiceFilter>? Function(
      Iterable<CopyWith$Input$ServiceFilter<Input$ServiceFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$ServiceFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$ServiceFilter<TRes>
    implements CopyWith$Input$ServiceFilter<TRes> {
  _CopyWithStubImpl$Input$ServiceFilter(this._res);

  TRes _res;

  call({
    List<Input$ServiceFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$ServiceOptionAggregateFilter {
  factory Input$ServiceOptionAggregateFilter({
    List<Input$ServiceOptionAggregateFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceOptionAggregateFilter>? or,
  }) => Input$ServiceOptionAggregateFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$ServiceOptionAggregateFilter._(this._$data);

  factory Input$ServiceOptionAggregateFilter.fromJson(
    Map<String, dynamic> data,
  ) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$ServiceOptionAggregateFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$ServiceOptionAggregateFilter.fromJson(
              (e as Map<String, dynamic>),
            ),
          )
          .toList();
    }
    return Input$ServiceOptionAggregateFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$ServiceOptionAggregateFilter>? get and =>
      (_$data['and'] as List<Input$ServiceOptionAggregateFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$ServiceOptionAggregateFilter>? get or =>
      (_$data['or'] as List<Input$ServiceOptionAggregateFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$ServiceOptionAggregateFilter<
    Input$ServiceOptionAggregateFilter
  >
  get copyWith => CopyWith$Input$ServiceOptionAggregateFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ServiceOptionAggregateFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$ServiceOptionAggregateFilter<TRes> {
  factory CopyWith$Input$ServiceOptionAggregateFilter(
    Input$ServiceOptionAggregateFilter instance,
    TRes Function(Input$ServiceOptionAggregateFilter) then,
  ) = _CopyWithImpl$Input$ServiceOptionAggregateFilter;

  factory CopyWith$Input$ServiceOptionAggregateFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$ServiceOptionAggregateFilter;

  TRes call({
    List<Input$ServiceOptionAggregateFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceOptionAggregateFilter>? or,
  });
  TRes and(
    Iterable<Input$ServiceOptionAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$ServiceOptionAggregateFilter<
          Input$ServiceOptionAggregateFilter
        >
      >?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$ServiceOptionAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$ServiceOptionAggregateFilter<
          Input$ServiceOptionAggregateFilter
        >
      >?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$ServiceOptionAggregateFilter<TRes>
    implements CopyWith$Input$ServiceOptionAggregateFilter<TRes> {
  _CopyWithImpl$Input$ServiceOptionAggregateFilter(this._instance, this._then);

  final Input$ServiceOptionAggregateFilter _instance;

  final TRes Function(Input$ServiceOptionAggregateFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$ServiceOptionAggregateFilter._({
      ..._instance._$data,
      if (and != _undefined)
        'and': (and as List<Input$ServiceOptionAggregateFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined)
        'or': (or as List<Input$ServiceOptionAggregateFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$ServiceOptionAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$ServiceOptionAggregateFilter<
          Input$ServiceOptionAggregateFilter
        >
      >?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map(
        (e) => CopyWith$Input$ServiceOptionAggregateFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$ServiceOptionAggregateFilter>? Function(
      Iterable<
        CopyWith$Input$ServiceOptionAggregateFilter<
          Input$ServiceOptionAggregateFilter
        >
      >?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map(
        (e) => CopyWith$Input$ServiceOptionAggregateFilter(e, (i) => i),
      ),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$ServiceOptionAggregateFilter<TRes>
    implements CopyWith$Input$ServiceOptionAggregateFilter<TRes> {
  _CopyWithStubImpl$Input$ServiceOptionAggregateFilter(this._res);

  TRes _res;

  call({
    List<Input$ServiceOptionAggregateFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceOptionAggregateFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$ServiceOptionFilter {
  factory Input$ServiceOptionFilter({
    List<Input$ServiceOptionFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceOptionFilter>? or,
  }) => Input$ServiceOptionFilter._({
    if (and != null) r'and': and,
    if (id != null) r'id': id,
    if (or != null) r'or': or,
  });

  Input$ServiceOptionFilter._(this._$data);

  factory Input$ServiceOptionFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) =>
                Input$ServiceOptionFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) =>
                Input$ServiceOptionFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    return Input$ServiceOptionFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$ServiceOptionFilter>? get and =>
      (_$data['and'] as List<Input$ServiceOptionFilter>?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  List<Input$ServiceOptionFilter>? get or =>
      (_$data['or'] as List<Input$ServiceOptionFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$ServiceOptionFilter<Input$ServiceOptionFilter> get copyWith =>
      CopyWith$Input$ServiceOptionFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ServiceOptionFilter ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$id = id;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$ServiceOptionFilter<TRes> {
  factory CopyWith$Input$ServiceOptionFilter(
    Input$ServiceOptionFilter instance,
    TRes Function(Input$ServiceOptionFilter) then,
  ) = _CopyWithImpl$Input$ServiceOptionFilter;

  factory CopyWith$Input$ServiceOptionFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$ServiceOptionFilter;

  TRes call({
    List<Input$ServiceOptionFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceOptionFilter>? or,
  });
  TRes and(
    Iterable<Input$ServiceOptionFilter>? Function(
      Iterable<CopyWith$Input$ServiceOptionFilter<Input$ServiceOptionFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$IDFilterComparison<TRes> get id;
  TRes or(
    Iterable<Input$ServiceOptionFilter>? Function(
      Iterable<CopyWith$Input$ServiceOptionFilter<Input$ServiceOptionFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$ServiceOptionFilter<TRes>
    implements CopyWith$Input$ServiceOptionFilter<TRes> {
  _CopyWithImpl$Input$ServiceOptionFilter(this._instance, this._then);

  final Input$ServiceOptionFilter _instance;

  final TRes Function(Input$ServiceOptionFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? id = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$ServiceOptionFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$ServiceOptionFilter>?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (or != _undefined) 'or': (or as List<Input$ServiceOptionFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$ServiceOptionFilter>? Function(
      Iterable<CopyWith$Input$ServiceOptionFilter<Input$ServiceOptionFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map(
        (e) => CopyWith$Input$ServiceOptionFilter(e, (i) => i),
      ),
    )?.toList(),
  );

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  TRes or(
    Iterable<Input$ServiceOptionFilter>? Function(
      Iterable<CopyWith$Input$ServiceOptionFilter<Input$ServiceOptionFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$ServiceOptionFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$ServiceOptionFilter<TRes>
    implements CopyWith$Input$ServiceOptionFilter<TRes> {
  _CopyWithStubImpl$Input$ServiceOptionFilter(this._res);

  TRes _res;

  call({
    List<Input$ServiceOptionFilter>? and,
    Input$IDFilterComparison? id,
    List<Input$ServiceOptionFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  or(_fn) => _res;
}

class Input$ServiceOptionSort {
  factory Input$ServiceOptionSort({
    required Enum$SortDirection direction,
    required Enum$ServiceOptionSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$ServiceOptionSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$ServiceOptionSort._(this._$data);

  factory Input$ServiceOptionSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$ServiceOptionSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$ServiceOptionSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$ServiceOptionSortFields get field =>
      (_$data['field'] as Enum$ServiceOptionSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$ServiceOptionSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$ServiceOptionSort<Input$ServiceOptionSort> get copyWith =>
      CopyWith$Input$ServiceOptionSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ServiceOptionSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$ServiceOptionSort<TRes> {
  factory CopyWith$Input$ServiceOptionSort(
    Input$ServiceOptionSort instance,
    TRes Function(Input$ServiceOptionSort) then,
  ) = _CopyWithImpl$Input$ServiceOptionSort;

  factory CopyWith$Input$ServiceOptionSort.stub(TRes res) =
      _CopyWithStubImpl$Input$ServiceOptionSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$ServiceOptionSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$ServiceOptionSort<TRes>
    implements CopyWith$Input$ServiceOptionSort<TRes> {
  _CopyWithImpl$Input$ServiceOptionSort(this._instance, this._then);

  final Input$ServiceOptionSort _instance;

  final TRes Function(Input$ServiceOptionSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$ServiceOptionSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$ServiceOptionSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$ServiceOptionSort<TRes>
    implements CopyWith$Input$ServiceOptionSort<TRes> {
  _CopyWithStubImpl$Input$ServiceOptionSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$ServiceOptionSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$ServiceSort {
  factory Input$ServiceSort({
    required Enum$SortDirection direction,
    required Enum$ServiceSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$ServiceSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$ServiceSort._(this._$data);

  factory Input$ServiceSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$ServiceSortFields((l$field as String));
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$ServiceSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$ServiceSortFields get field =>
      (_$data['field'] as Enum$ServiceSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$ServiceSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$ServiceSort<Input$ServiceSort> get copyWith =>
      CopyWith$Input$ServiceSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ServiceSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$ServiceSort<TRes> {
  factory CopyWith$Input$ServiceSort(
    Input$ServiceSort instance,
    TRes Function(Input$ServiceSort) then,
  ) = _CopyWithImpl$Input$ServiceSort;

  factory CopyWith$Input$ServiceSort.stub(TRes res) =
      _CopyWithStubImpl$Input$ServiceSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$ServiceSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$ServiceSort<TRes>
    implements CopyWith$Input$ServiceSort<TRes> {
  _CopyWithImpl$Input$ServiceSort(this._instance, this._then);

  final Input$ServiceSort _instance;

  final TRes Function(Input$ServiceSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$ServiceSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$ServiceSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$ServiceSort<TRes>
    implements CopyWith$Input$ServiceSort<TRes> {
  _CopyWithStubImpl$Input$ServiceSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$ServiceSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$SetDocumentsOnDriverInput {
  factory Input$SetDocumentsOnDriverInput({
    required String id,
    required List<String> relationIds,
  }) => Input$SetDocumentsOnDriverInput._({
    r'id': id,
    r'relationIds': relationIds,
  });

  Input$SetDocumentsOnDriverInput._(this._$data);

  factory Input$SetDocumentsOnDriverInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$id = data['id'];
    result$data['id'] = (l$id as String);
    final l$relationIds = data['relationIds'];
    result$data['relationIds'] = (l$relationIds as List<dynamic>)
        .map((e) => (e as String))
        .toList();
    return Input$SetDocumentsOnDriverInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String get id => (_$data['id'] as String);

  List<String> get relationIds => (_$data['relationIds'] as List<String>);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$id = id;
    result$data['id'] = l$id;
    final l$relationIds = relationIds;
    result$data['relationIds'] = l$relationIds.map((e) => e).toList();
    return result$data;
  }

  CopyWith$Input$SetDocumentsOnDriverInput<Input$SetDocumentsOnDriverInput>
  get copyWith => CopyWith$Input$SetDocumentsOnDriverInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$SetDocumentsOnDriverInput ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (l$id != lOther$id) {
      return false;
    }
    final l$relationIds = relationIds;
    final lOther$relationIds = other.relationIds;
    if (l$relationIds.length != lOther$relationIds.length) {
      return false;
    }
    for (int i = 0; i < l$relationIds.length; i++) {
      final l$relationIds$entry = l$relationIds[i];
      final lOther$relationIds$entry = lOther$relationIds[i];
      if (l$relationIds$entry != lOther$relationIds$entry) {
        return false;
      }
    }
    return true;
  }

  @override
  int get hashCode {
    final l$id = id;
    final l$relationIds = relationIds;
    return Object.hashAll([l$id, Object.hashAll(l$relationIds.map((v) => v))]);
  }
}

abstract class CopyWith$Input$SetDocumentsOnDriverInput<TRes> {
  factory CopyWith$Input$SetDocumentsOnDriverInput(
    Input$SetDocumentsOnDriverInput instance,
    TRes Function(Input$SetDocumentsOnDriverInput) then,
  ) = _CopyWithImpl$Input$SetDocumentsOnDriverInput;

  factory CopyWith$Input$SetDocumentsOnDriverInput.stub(TRes res) =
      _CopyWithStubImpl$Input$SetDocumentsOnDriverInput;

  TRes call({String? id, List<String>? relationIds});
}

class _CopyWithImpl$Input$SetDocumentsOnDriverInput<TRes>
    implements CopyWith$Input$SetDocumentsOnDriverInput<TRes> {
  _CopyWithImpl$Input$SetDocumentsOnDriverInput(this._instance, this._then);

  final Input$SetDocumentsOnDriverInput _instance;

  final TRes Function(Input$SetDocumentsOnDriverInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? id = _undefined, Object? relationIds = _undefined}) =>
      _then(
        Input$SetDocumentsOnDriverInput._({
          ..._instance._$data,
          if (id != _undefined && id != null) 'id': (id as String),
          if (relationIds != _undefined && relationIds != null)
            'relationIds': (relationIds as List<String>),
        }),
      );
}

class _CopyWithStubImpl$Input$SetDocumentsOnDriverInput<TRes>
    implements CopyWith$Input$SetDocumentsOnDriverInput<TRes> {
  _CopyWithStubImpl$Input$SetDocumentsOnDriverInput(this._res);

  TRes _res;

  call({String? id, List<String>? relationIds}) => _res;
}

class Input$ShiftRuleFilter {
  factory Input$ShiftRuleFilter({
    List<Input$ShiftRuleFilter>? and,
    Input$BooleanFieldComparison? enabled,
    Input$ShiftRuleFrequencyFilterComparison? frequency,
    Input$IDFilterComparison? id,
    Input$IntFieldComparison? mandatoryBreakMinutes,
    Input$IntFieldComparison? maxHoursPerPeriod,
    List<Input$ShiftRuleFilter>? or,
  }) => Input$ShiftRuleFilter._({
    if (and != null) r'and': and,
    if (enabled != null) r'enabled': enabled,
    if (frequency != null) r'frequency': frequency,
    if (id != null) r'id': id,
    if (mandatoryBreakMinutes != null)
      r'mandatoryBreakMinutes': mandatoryBreakMinutes,
    if (maxHoursPerPeriod != null) r'maxHoursPerPeriod': maxHoursPerPeriod,
    if (or != null) r'or': or,
  });

  Input$ShiftRuleFilter._(this._$data);

  factory Input$ShiftRuleFilter.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('and')) {
      final l$and = data['and'];
      result$data['and'] = (l$and as List<dynamic>?)
          ?.map(
            (e) => Input$ShiftRuleFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    if (data.containsKey('enabled')) {
      final l$enabled = data['enabled'];
      result$data['enabled'] = l$enabled == null
          ? null
          : Input$BooleanFieldComparison.fromJson(
              (l$enabled as Map<String, dynamic>),
            );
    }
    if (data.containsKey('frequency')) {
      final l$frequency = data['frequency'];
      result$data['frequency'] = l$frequency == null
          ? null
          : Input$ShiftRuleFrequencyFilterComparison.fromJson(
              (l$frequency as Map<String, dynamic>),
            );
    }
    if (data.containsKey('id')) {
      final l$id = data['id'];
      result$data['id'] = l$id == null
          ? null
          : Input$IDFilterComparison.fromJson((l$id as Map<String, dynamic>));
    }
    if (data.containsKey('mandatoryBreakMinutes')) {
      final l$mandatoryBreakMinutes = data['mandatoryBreakMinutes'];
      result$data['mandatoryBreakMinutes'] = l$mandatoryBreakMinutes == null
          ? null
          : Input$IntFieldComparison.fromJson(
              (l$mandatoryBreakMinutes as Map<String, dynamic>),
            );
    }
    if (data.containsKey('maxHoursPerPeriod')) {
      final l$maxHoursPerPeriod = data['maxHoursPerPeriod'];
      result$data['maxHoursPerPeriod'] = l$maxHoursPerPeriod == null
          ? null
          : Input$IntFieldComparison.fromJson(
              (l$maxHoursPerPeriod as Map<String, dynamic>),
            );
    }
    if (data.containsKey('or')) {
      final l$or = data['or'];
      result$data['or'] = (l$or as List<dynamic>?)
          ?.map(
            (e) => Input$ShiftRuleFilter.fromJson((e as Map<String, dynamic>)),
          )
          .toList();
    }
    return Input$ShiftRuleFilter._(result$data);
  }

  Map<String, dynamic> _$data;

  List<Input$ShiftRuleFilter>? get and =>
      (_$data['and'] as List<Input$ShiftRuleFilter>?);

  Input$BooleanFieldComparison? get enabled =>
      (_$data['enabled'] as Input$BooleanFieldComparison?);

  Input$ShiftRuleFrequencyFilterComparison? get frequency =>
      (_$data['frequency'] as Input$ShiftRuleFrequencyFilterComparison?);

  Input$IDFilterComparison? get id =>
      (_$data['id'] as Input$IDFilterComparison?);

  Input$IntFieldComparison? get mandatoryBreakMinutes =>
      (_$data['mandatoryBreakMinutes'] as Input$IntFieldComparison?);

  Input$IntFieldComparison? get maxHoursPerPeriod =>
      (_$data['maxHoursPerPeriod'] as Input$IntFieldComparison?);

  List<Input$ShiftRuleFilter>? get or =>
      (_$data['or'] as List<Input$ShiftRuleFilter>?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('and')) {
      final l$and = and;
      result$data['and'] = l$and?.map((e) => e.toJson()).toList();
    }
    if (_$data.containsKey('enabled')) {
      final l$enabled = enabled;
      result$data['enabled'] = l$enabled?.toJson();
    }
    if (_$data.containsKey('frequency')) {
      final l$frequency = frequency;
      result$data['frequency'] = l$frequency?.toJson();
    }
    if (_$data.containsKey('id')) {
      final l$id = id;
      result$data['id'] = l$id?.toJson();
    }
    if (_$data.containsKey('mandatoryBreakMinutes')) {
      final l$mandatoryBreakMinutes = mandatoryBreakMinutes;
      result$data['mandatoryBreakMinutes'] = l$mandatoryBreakMinutes?.toJson();
    }
    if (_$data.containsKey('maxHoursPerPeriod')) {
      final l$maxHoursPerPeriod = maxHoursPerPeriod;
      result$data['maxHoursPerPeriod'] = l$maxHoursPerPeriod?.toJson();
    }
    if (_$data.containsKey('or')) {
      final l$or = or;
      result$data['or'] = l$or?.map((e) => e.toJson()).toList();
    }
    return result$data;
  }

  CopyWith$Input$ShiftRuleFilter<Input$ShiftRuleFilter> get copyWith =>
      CopyWith$Input$ShiftRuleFilter(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ShiftRuleFilter || runtimeType != other.runtimeType) {
      return false;
    }
    final l$and = and;
    final lOther$and = other.and;
    if (_$data.containsKey('and') != other._$data.containsKey('and')) {
      return false;
    }
    if (l$and != null && lOther$and != null) {
      if (l$and.length != lOther$and.length) {
        return false;
      }
      for (int i = 0; i < l$and.length; i++) {
        final l$and$entry = l$and[i];
        final lOther$and$entry = lOther$and[i];
        if (l$and$entry != lOther$and$entry) {
          return false;
        }
      }
    } else if (l$and != lOther$and) {
      return false;
    }
    final l$enabled = enabled;
    final lOther$enabled = other.enabled;
    if (_$data.containsKey('enabled') != other._$data.containsKey('enabled')) {
      return false;
    }
    if (l$enabled != lOther$enabled) {
      return false;
    }
    final l$frequency = frequency;
    final lOther$frequency = other.frequency;
    if (_$data.containsKey('frequency') !=
        other._$data.containsKey('frequency')) {
      return false;
    }
    if (l$frequency != lOther$frequency) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (_$data.containsKey('id') != other._$data.containsKey('id')) {
      return false;
    }
    if (l$id != lOther$id) {
      return false;
    }
    final l$mandatoryBreakMinutes = mandatoryBreakMinutes;
    final lOther$mandatoryBreakMinutes = other.mandatoryBreakMinutes;
    if (_$data.containsKey('mandatoryBreakMinutes') !=
        other._$data.containsKey('mandatoryBreakMinutes')) {
      return false;
    }
    if (l$mandatoryBreakMinutes != lOther$mandatoryBreakMinutes) {
      return false;
    }
    final l$maxHoursPerPeriod = maxHoursPerPeriod;
    final lOther$maxHoursPerPeriod = other.maxHoursPerPeriod;
    if (_$data.containsKey('maxHoursPerPeriod') !=
        other._$data.containsKey('maxHoursPerPeriod')) {
      return false;
    }
    if (l$maxHoursPerPeriod != lOther$maxHoursPerPeriod) {
      return false;
    }
    final l$or = or;
    final lOther$or = other.or;
    if (_$data.containsKey('or') != other._$data.containsKey('or')) {
      return false;
    }
    if (l$or != null && lOther$or != null) {
      if (l$or.length != lOther$or.length) {
        return false;
      }
      for (int i = 0; i < l$or.length; i++) {
        final l$or$entry = l$or[i];
        final lOther$or$entry = lOther$or[i];
        if (l$or$entry != lOther$or$entry) {
          return false;
        }
      }
    } else if (l$or != lOther$or) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$and = and;
    final l$enabled = enabled;
    final l$frequency = frequency;
    final l$id = id;
    final l$mandatoryBreakMinutes = mandatoryBreakMinutes;
    final l$maxHoursPerPeriod = maxHoursPerPeriod;
    final l$or = or;
    return Object.hashAll([
      _$data.containsKey('and')
          ? l$and == null
                ? null
                : Object.hashAll(l$and.map((v) => v))
          : const {},
      _$data.containsKey('enabled') ? l$enabled : const {},
      _$data.containsKey('frequency') ? l$frequency : const {},
      _$data.containsKey('id') ? l$id : const {},
      _$data.containsKey('mandatoryBreakMinutes')
          ? l$mandatoryBreakMinutes
          : const {},
      _$data.containsKey('maxHoursPerPeriod') ? l$maxHoursPerPeriod : const {},
      _$data.containsKey('or')
          ? l$or == null
                ? null
                : Object.hashAll(l$or.map((v) => v))
          : const {},
    ]);
  }
}

abstract class CopyWith$Input$ShiftRuleFilter<TRes> {
  factory CopyWith$Input$ShiftRuleFilter(
    Input$ShiftRuleFilter instance,
    TRes Function(Input$ShiftRuleFilter) then,
  ) = _CopyWithImpl$Input$ShiftRuleFilter;

  factory CopyWith$Input$ShiftRuleFilter.stub(TRes res) =
      _CopyWithStubImpl$Input$ShiftRuleFilter;

  TRes call({
    List<Input$ShiftRuleFilter>? and,
    Input$BooleanFieldComparison? enabled,
    Input$ShiftRuleFrequencyFilterComparison? frequency,
    Input$IDFilterComparison? id,
    Input$IntFieldComparison? mandatoryBreakMinutes,
    Input$IntFieldComparison? maxHoursPerPeriod,
    List<Input$ShiftRuleFilter>? or,
  });
  TRes and(
    Iterable<Input$ShiftRuleFilter>? Function(
      Iterable<CopyWith$Input$ShiftRuleFilter<Input$ShiftRuleFilter>>?,
    )
    _fn,
  );
  CopyWith$Input$BooleanFieldComparison<TRes> get enabled;
  CopyWith$Input$ShiftRuleFrequencyFilterComparison<TRes> get frequency;
  CopyWith$Input$IDFilterComparison<TRes> get id;
  CopyWith$Input$IntFieldComparison<TRes> get mandatoryBreakMinutes;
  CopyWith$Input$IntFieldComparison<TRes> get maxHoursPerPeriod;
  TRes or(
    Iterable<Input$ShiftRuleFilter>? Function(
      Iterable<CopyWith$Input$ShiftRuleFilter<Input$ShiftRuleFilter>>?,
    )
    _fn,
  );
}

class _CopyWithImpl$Input$ShiftRuleFilter<TRes>
    implements CopyWith$Input$ShiftRuleFilter<TRes> {
  _CopyWithImpl$Input$ShiftRuleFilter(this._instance, this._then);

  final Input$ShiftRuleFilter _instance;

  final TRes Function(Input$ShiftRuleFilter) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? and = _undefined,
    Object? enabled = _undefined,
    Object? frequency = _undefined,
    Object? id = _undefined,
    Object? mandatoryBreakMinutes = _undefined,
    Object? maxHoursPerPeriod = _undefined,
    Object? or = _undefined,
  }) => _then(
    Input$ShiftRuleFilter._({
      ..._instance._$data,
      if (and != _undefined) 'and': (and as List<Input$ShiftRuleFilter>?),
      if (enabled != _undefined)
        'enabled': (enabled as Input$BooleanFieldComparison?),
      if (frequency != _undefined)
        'frequency': (frequency as Input$ShiftRuleFrequencyFilterComparison?),
      if (id != _undefined) 'id': (id as Input$IDFilterComparison?),
      if (mandatoryBreakMinutes != _undefined)
        'mandatoryBreakMinutes':
            (mandatoryBreakMinutes as Input$IntFieldComparison?),
      if (maxHoursPerPeriod != _undefined)
        'maxHoursPerPeriod': (maxHoursPerPeriod as Input$IntFieldComparison?),
      if (or != _undefined) 'or': (or as List<Input$ShiftRuleFilter>?),
    }),
  );

  TRes and(
    Iterable<Input$ShiftRuleFilter>? Function(
      Iterable<CopyWith$Input$ShiftRuleFilter<Input$ShiftRuleFilter>>?,
    )
    _fn,
  ) => call(
    and: _fn(
      _instance.and?.map((e) => CopyWith$Input$ShiftRuleFilter(e, (i) => i)),
    )?.toList(),
  );

  CopyWith$Input$BooleanFieldComparison<TRes> get enabled {
    final local$enabled = _instance.enabled;
    return local$enabled == null
        ? CopyWith$Input$BooleanFieldComparison.stub(_then(_instance))
        : CopyWith$Input$BooleanFieldComparison(
            local$enabled,
            (e) => call(enabled: e),
          );
  }

  CopyWith$Input$ShiftRuleFrequencyFilterComparison<TRes> get frequency {
    final local$frequency = _instance.frequency;
    return local$frequency == null
        ? CopyWith$Input$ShiftRuleFrequencyFilterComparison.stub(
            _then(_instance),
          )
        : CopyWith$Input$ShiftRuleFrequencyFilterComparison(
            local$frequency,
            (e) => call(frequency: e),
          );
  }

  CopyWith$Input$IDFilterComparison<TRes> get id {
    final local$id = _instance.id;
    return local$id == null
        ? CopyWith$Input$IDFilterComparison.stub(_then(_instance))
        : CopyWith$Input$IDFilterComparison(local$id, (e) => call(id: e));
  }

  CopyWith$Input$IntFieldComparison<TRes> get mandatoryBreakMinutes {
    final local$mandatoryBreakMinutes = _instance.mandatoryBreakMinutes;
    return local$mandatoryBreakMinutes == null
        ? CopyWith$Input$IntFieldComparison.stub(_then(_instance))
        : CopyWith$Input$IntFieldComparison(
            local$mandatoryBreakMinutes,
            (e) => call(mandatoryBreakMinutes: e),
          );
  }

  CopyWith$Input$IntFieldComparison<TRes> get maxHoursPerPeriod {
    final local$maxHoursPerPeriod = _instance.maxHoursPerPeriod;
    return local$maxHoursPerPeriod == null
        ? CopyWith$Input$IntFieldComparison.stub(_then(_instance))
        : CopyWith$Input$IntFieldComparison(
            local$maxHoursPerPeriod,
            (e) => call(maxHoursPerPeriod: e),
          );
  }

  TRes or(
    Iterable<Input$ShiftRuleFilter>? Function(
      Iterable<CopyWith$Input$ShiftRuleFilter<Input$ShiftRuleFilter>>?,
    )
    _fn,
  ) => call(
    or: _fn(
      _instance.or?.map((e) => CopyWith$Input$ShiftRuleFilter(e, (i) => i)),
    )?.toList(),
  );
}

class _CopyWithStubImpl$Input$ShiftRuleFilter<TRes>
    implements CopyWith$Input$ShiftRuleFilter<TRes> {
  _CopyWithStubImpl$Input$ShiftRuleFilter(this._res);

  TRes _res;

  call({
    List<Input$ShiftRuleFilter>? and,
    Input$BooleanFieldComparison? enabled,
    Input$ShiftRuleFrequencyFilterComparison? frequency,
    Input$IDFilterComparison? id,
    Input$IntFieldComparison? mandatoryBreakMinutes,
    Input$IntFieldComparison? maxHoursPerPeriod,
    List<Input$ShiftRuleFilter>? or,
  }) => _res;

  and(_fn) => _res;

  CopyWith$Input$BooleanFieldComparison<TRes> get enabled =>
      CopyWith$Input$BooleanFieldComparison.stub(_res);

  CopyWith$Input$ShiftRuleFrequencyFilterComparison<TRes> get frequency =>
      CopyWith$Input$ShiftRuleFrequencyFilterComparison.stub(_res);

  CopyWith$Input$IDFilterComparison<TRes> get id =>
      CopyWith$Input$IDFilterComparison.stub(_res);

  CopyWith$Input$IntFieldComparison<TRes> get mandatoryBreakMinutes =>
      CopyWith$Input$IntFieldComparison.stub(_res);

  CopyWith$Input$IntFieldComparison<TRes> get maxHoursPerPeriod =>
      CopyWith$Input$IntFieldComparison.stub(_res);

  or(_fn) => _res;
}

class Input$ShiftRuleFrequencyFilterComparison {
  factory Input$ShiftRuleFrequencyFilterComparison({
    Enum$ShiftRuleFrequency? eq,
    Enum$ShiftRuleFrequency? gt,
    Enum$ShiftRuleFrequency? gte,
    Enum$ShiftRuleFrequency? iLike,
    List<Enum$ShiftRuleFrequency>? $in,
    bool? $is,
    bool? isNot,
    Enum$ShiftRuleFrequency? like,
    Enum$ShiftRuleFrequency? lt,
    Enum$ShiftRuleFrequency? lte,
    Enum$ShiftRuleFrequency? neq,
    Enum$ShiftRuleFrequency? notILike,
    List<Enum$ShiftRuleFrequency>? notIn,
    Enum$ShiftRuleFrequency? notLike,
  }) => Input$ShiftRuleFrequencyFilterComparison._({
    if (eq != null) r'eq': eq,
    if (gt != null) r'gt': gt,
    if (gte != null) r'gte': gte,
    if (iLike != null) r'iLike': iLike,
    if ($in != null) r'in': $in,
    if ($is != null) r'is': $is,
    if (isNot != null) r'isNot': isNot,
    if (like != null) r'like': like,
    if (lt != null) r'lt': lt,
    if (lte != null) r'lte': lte,
    if (neq != null) r'neq': neq,
    if (notILike != null) r'notILike': notILike,
    if (notIn != null) r'notIn': notIn,
    if (notLike != null) r'notLike': notLike,
  });

  Input$ShiftRuleFrequencyFilterComparison._(this._$data);

  factory Input$ShiftRuleFrequencyFilterComparison.fromJson(
    Map<String, dynamic> data,
  ) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('eq')) {
      final l$eq = data['eq'];
      result$data['eq'] = l$eq == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$eq as String));
    }
    if (data.containsKey('gt')) {
      final l$gt = data['gt'];
      result$data['gt'] = l$gt == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$gt as String));
    }
    if (data.containsKey('gte')) {
      final l$gte = data['gte'];
      result$data['gte'] = l$gte == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$gte as String));
    }
    if (data.containsKey('iLike')) {
      final l$iLike = data['iLike'];
      result$data['iLike'] = l$iLike == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$iLike as String));
    }
    if (data.containsKey('in')) {
      final l$$in = data['in'];
      result$data['in'] = (l$$in as List<dynamic>?)
          ?.map((e) => fromJson$Enum$ShiftRuleFrequency((e as String)))
          .toList();
    }
    if (data.containsKey('is')) {
      final l$$is = data['is'];
      result$data['is'] = (l$$is as bool?);
    }
    if (data.containsKey('isNot')) {
      final l$isNot = data['isNot'];
      result$data['isNot'] = (l$isNot as bool?);
    }
    if (data.containsKey('like')) {
      final l$like = data['like'];
      result$data['like'] = l$like == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$like as String));
    }
    if (data.containsKey('lt')) {
      final l$lt = data['lt'];
      result$data['lt'] = l$lt == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$lt as String));
    }
    if (data.containsKey('lte')) {
      final l$lte = data['lte'];
      result$data['lte'] = l$lte == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$lte as String));
    }
    if (data.containsKey('neq')) {
      final l$neq = data['neq'];
      result$data['neq'] = l$neq == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$neq as String));
    }
    if (data.containsKey('notILike')) {
      final l$notILike = data['notILike'];
      result$data['notILike'] = l$notILike == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$notILike as String));
    }
    if (data.containsKey('notIn')) {
      final l$notIn = data['notIn'];
      result$data['notIn'] = (l$notIn as List<dynamic>?)
          ?.map((e) => fromJson$Enum$ShiftRuleFrequency((e as String)))
          .toList();
    }
    if (data.containsKey('notLike')) {
      final l$notLike = data['notLike'];
      result$data['notLike'] = l$notLike == null
          ? null
          : fromJson$Enum$ShiftRuleFrequency((l$notLike as String));
    }
    return Input$ShiftRuleFrequencyFilterComparison._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$ShiftRuleFrequency? get eq => (_$data['eq'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get gt => (_$data['gt'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get gte =>
      (_$data['gte'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get iLike =>
      (_$data['iLike'] as Enum$ShiftRuleFrequency?);

  List<Enum$ShiftRuleFrequency>? get $in =>
      (_$data['in'] as List<Enum$ShiftRuleFrequency>?);

  bool? get $is => (_$data['is'] as bool?);

  bool? get isNot => (_$data['isNot'] as bool?);

  Enum$ShiftRuleFrequency? get like =>
      (_$data['like'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get lt => (_$data['lt'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get lte =>
      (_$data['lte'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get neq =>
      (_$data['neq'] as Enum$ShiftRuleFrequency?);

  Enum$ShiftRuleFrequency? get notILike =>
      (_$data['notILike'] as Enum$ShiftRuleFrequency?);

  List<Enum$ShiftRuleFrequency>? get notIn =>
      (_$data['notIn'] as List<Enum$ShiftRuleFrequency>?);

  Enum$ShiftRuleFrequency? get notLike =>
      (_$data['notLike'] as Enum$ShiftRuleFrequency?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('eq')) {
      final l$eq = eq;
      result$data['eq'] = l$eq == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$eq);
    }
    if (_$data.containsKey('gt')) {
      final l$gt = gt;
      result$data['gt'] = l$gt == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$gt);
    }
    if (_$data.containsKey('gte')) {
      final l$gte = gte;
      result$data['gte'] = l$gte == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$gte);
    }
    if (_$data.containsKey('iLike')) {
      final l$iLike = iLike;
      result$data['iLike'] = l$iLike == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$iLike);
    }
    if (_$data.containsKey('in')) {
      final l$$in = $in;
      result$data['in'] = l$$in
          ?.map((e) => toJson$Enum$ShiftRuleFrequency(e))
          .toList();
    }
    if (_$data.containsKey('is')) {
      final l$$is = $is;
      result$data['is'] = l$$is;
    }
    if (_$data.containsKey('isNot')) {
      final l$isNot = isNot;
      result$data['isNot'] = l$isNot;
    }
    if (_$data.containsKey('like')) {
      final l$like = like;
      result$data['like'] = l$like == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$like);
    }
    if (_$data.containsKey('lt')) {
      final l$lt = lt;
      result$data['lt'] = l$lt == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$lt);
    }
    if (_$data.containsKey('lte')) {
      final l$lte = lte;
      result$data['lte'] = l$lte == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$lte);
    }
    if (_$data.containsKey('neq')) {
      final l$neq = neq;
      result$data['neq'] = l$neq == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$neq);
    }
    if (_$data.containsKey('notILike')) {
      final l$notILike = notILike;
      result$data['notILike'] = l$notILike == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$notILike);
    }
    if (_$data.containsKey('notIn')) {
      final l$notIn = notIn;
      result$data['notIn'] = l$notIn
          ?.map((e) => toJson$Enum$ShiftRuleFrequency(e))
          .toList();
    }
    if (_$data.containsKey('notLike')) {
      final l$notLike = notLike;
      result$data['notLike'] = l$notLike == null
          ? null
          : toJson$Enum$ShiftRuleFrequency(l$notLike);
    }
    return result$data;
  }

  CopyWith$Input$ShiftRuleFrequencyFilterComparison<
    Input$ShiftRuleFrequencyFilterComparison
  >
  get copyWith =>
      CopyWith$Input$ShiftRuleFrequencyFilterComparison(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ShiftRuleFrequencyFilterComparison ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$eq = eq;
    final lOther$eq = other.eq;
    if (_$data.containsKey('eq') != other._$data.containsKey('eq')) {
      return false;
    }
    if (l$eq != lOther$eq) {
      return false;
    }
    final l$gt = gt;
    final lOther$gt = other.gt;
    if (_$data.containsKey('gt') != other._$data.containsKey('gt')) {
      return false;
    }
    if (l$gt != lOther$gt) {
      return false;
    }
    final l$gte = gte;
    final lOther$gte = other.gte;
    if (_$data.containsKey('gte') != other._$data.containsKey('gte')) {
      return false;
    }
    if (l$gte != lOther$gte) {
      return false;
    }
    final l$iLike = iLike;
    final lOther$iLike = other.iLike;
    if (_$data.containsKey('iLike') != other._$data.containsKey('iLike')) {
      return false;
    }
    if (l$iLike != lOther$iLike) {
      return false;
    }
    final l$$in = $in;
    final lOther$$in = other.$in;
    if (_$data.containsKey('in') != other._$data.containsKey('in')) {
      return false;
    }
    if (l$$in != null && lOther$$in != null) {
      if (l$$in.length != lOther$$in.length) {
        return false;
      }
      for (int i = 0; i < l$$in.length; i++) {
        final l$$in$entry = l$$in[i];
        final lOther$$in$entry = lOther$$in[i];
        if (l$$in$entry != lOther$$in$entry) {
          return false;
        }
      }
    } else if (l$$in != lOther$$in) {
      return false;
    }
    final l$$is = $is;
    final lOther$$is = other.$is;
    if (_$data.containsKey('is') != other._$data.containsKey('is')) {
      return false;
    }
    if (l$$is != lOther$$is) {
      return false;
    }
    final l$isNot = isNot;
    final lOther$isNot = other.isNot;
    if (_$data.containsKey('isNot') != other._$data.containsKey('isNot')) {
      return false;
    }
    if (l$isNot != lOther$isNot) {
      return false;
    }
    final l$like = like;
    final lOther$like = other.like;
    if (_$data.containsKey('like') != other._$data.containsKey('like')) {
      return false;
    }
    if (l$like != lOther$like) {
      return false;
    }
    final l$lt = lt;
    final lOther$lt = other.lt;
    if (_$data.containsKey('lt') != other._$data.containsKey('lt')) {
      return false;
    }
    if (l$lt != lOther$lt) {
      return false;
    }
    final l$lte = lte;
    final lOther$lte = other.lte;
    if (_$data.containsKey('lte') != other._$data.containsKey('lte')) {
      return false;
    }
    if (l$lte != lOther$lte) {
      return false;
    }
    final l$neq = neq;
    final lOther$neq = other.neq;
    if (_$data.containsKey('neq') != other._$data.containsKey('neq')) {
      return false;
    }
    if (l$neq != lOther$neq) {
      return false;
    }
    final l$notILike = notILike;
    final lOther$notILike = other.notILike;
    if (_$data.containsKey('notILike') !=
        other._$data.containsKey('notILike')) {
      return false;
    }
    if (l$notILike != lOther$notILike) {
      return false;
    }
    final l$notIn = notIn;
    final lOther$notIn = other.notIn;
    if (_$data.containsKey('notIn') != other._$data.containsKey('notIn')) {
      return false;
    }
    if (l$notIn != null && lOther$notIn != null) {
      if (l$notIn.length != lOther$notIn.length) {
        return false;
      }
      for (int i = 0; i < l$notIn.length; i++) {
        final l$notIn$entry = l$notIn[i];
        final lOther$notIn$entry = lOther$notIn[i];
        if (l$notIn$entry != lOther$notIn$entry) {
          return false;
        }
      }
    } else if (l$notIn != lOther$notIn) {
      return false;
    }
    final l$notLike = notLike;
    final lOther$notLike = other.notLike;
    if (_$data.containsKey('notLike') != other._$data.containsKey('notLike')) {
      return false;
    }
    if (l$notLike != lOther$notLike) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$eq = eq;
    final l$gt = gt;
    final l$gte = gte;
    final l$iLike = iLike;
    final l$$in = $in;
    final l$$is = $is;
    final l$isNot = isNot;
    final l$like = like;
    final l$lt = lt;
    final l$lte = lte;
    final l$neq = neq;
    final l$notILike = notILike;
    final l$notIn = notIn;
    final l$notLike = notLike;
    return Object.hashAll([
      _$data.containsKey('eq') ? l$eq : const {},
      _$data.containsKey('gt') ? l$gt : const {},
      _$data.containsKey('gte') ? l$gte : const {},
      _$data.containsKey('iLike') ? l$iLike : const {},
      _$data.containsKey('in')
          ? l$$in == null
                ? null
                : Object.hashAll(l$$in.map((v) => v))
          : const {},
      _$data.containsKey('is') ? l$$is : const {},
      _$data.containsKey('isNot') ? l$isNot : const {},
      _$data.containsKey('like') ? l$like : const {},
      _$data.containsKey('lt') ? l$lt : const {},
      _$data.containsKey('lte') ? l$lte : const {},
      _$data.containsKey('neq') ? l$neq : const {},
      _$data.containsKey('notILike') ? l$notILike : const {},
      _$data.containsKey('notIn')
          ? l$notIn == null
                ? null
                : Object.hashAll(l$notIn.map((v) => v))
          : const {},
      _$data.containsKey('notLike') ? l$notLike : const {},
    ]);
  }
}

abstract class CopyWith$Input$ShiftRuleFrequencyFilterComparison<TRes> {
  factory CopyWith$Input$ShiftRuleFrequencyFilterComparison(
    Input$ShiftRuleFrequencyFilterComparison instance,
    TRes Function(Input$ShiftRuleFrequencyFilterComparison) then,
  ) = _CopyWithImpl$Input$ShiftRuleFrequencyFilterComparison;

  factory CopyWith$Input$ShiftRuleFrequencyFilterComparison.stub(TRes res) =
      _CopyWithStubImpl$Input$ShiftRuleFrequencyFilterComparison;

  TRes call({
    Enum$ShiftRuleFrequency? eq,
    Enum$ShiftRuleFrequency? gt,
    Enum$ShiftRuleFrequency? gte,
    Enum$ShiftRuleFrequency? iLike,
    List<Enum$ShiftRuleFrequency>? $in,
    bool? $is,
    bool? isNot,
    Enum$ShiftRuleFrequency? like,
    Enum$ShiftRuleFrequency? lt,
    Enum$ShiftRuleFrequency? lte,
    Enum$ShiftRuleFrequency? neq,
    Enum$ShiftRuleFrequency? notILike,
    List<Enum$ShiftRuleFrequency>? notIn,
    Enum$ShiftRuleFrequency? notLike,
  });
}

class _CopyWithImpl$Input$ShiftRuleFrequencyFilterComparison<TRes>
    implements CopyWith$Input$ShiftRuleFrequencyFilterComparison<TRes> {
  _CopyWithImpl$Input$ShiftRuleFrequencyFilterComparison(
    this._instance,
    this._then,
  );

  final Input$ShiftRuleFrequencyFilterComparison _instance;

  final TRes Function(Input$ShiftRuleFrequencyFilterComparison) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? eq = _undefined,
    Object? gt = _undefined,
    Object? gte = _undefined,
    Object? iLike = _undefined,
    Object? $in = _undefined,
    Object? $is = _undefined,
    Object? isNot = _undefined,
    Object? like = _undefined,
    Object? lt = _undefined,
    Object? lte = _undefined,
    Object? neq = _undefined,
    Object? notILike = _undefined,
    Object? notIn = _undefined,
    Object? notLike = _undefined,
  }) => _then(
    Input$ShiftRuleFrequencyFilterComparison._({
      ..._instance._$data,
      if (eq != _undefined) 'eq': (eq as Enum$ShiftRuleFrequency?),
      if (gt != _undefined) 'gt': (gt as Enum$ShiftRuleFrequency?),
      if (gte != _undefined) 'gte': (gte as Enum$ShiftRuleFrequency?),
      if (iLike != _undefined) 'iLike': (iLike as Enum$ShiftRuleFrequency?),
      if ($in != _undefined) 'in': ($in as List<Enum$ShiftRuleFrequency>?),
      if ($is != _undefined) 'is': ($is as bool?),
      if (isNot != _undefined) 'isNot': (isNot as bool?),
      if (like != _undefined) 'like': (like as Enum$ShiftRuleFrequency?),
      if (lt != _undefined) 'lt': (lt as Enum$ShiftRuleFrequency?),
      if (lte != _undefined) 'lte': (lte as Enum$ShiftRuleFrequency?),
      if (neq != _undefined) 'neq': (neq as Enum$ShiftRuleFrequency?),
      if (notILike != _undefined)
        'notILike': (notILike as Enum$ShiftRuleFrequency?),
      if (notIn != _undefined)
        'notIn': (notIn as List<Enum$ShiftRuleFrequency>?),
      if (notLike != _undefined)
        'notLike': (notLike as Enum$ShiftRuleFrequency?),
    }),
  );
}

class _CopyWithStubImpl$Input$ShiftRuleFrequencyFilterComparison<TRes>
    implements CopyWith$Input$ShiftRuleFrequencyFilterComparison<TRes> {
  _CopyWithStubImpl$Input$ShiftRuleFrequencyFilterComparison(this._res);

  TRes _res;

  call({
    Enum$ShiftRuleFrequency? eq,
    Enum$ShiftRuleFrequency? gt,
    Enum$ShiftRuleFrequency? gte,
    Enum$ShiftRuleFrequency? iLike,
    List<Enum$ShiftRuleFrequency>? $in,
    bool? $is,
    bool? isNot,
    Enum$ShiftRuleFrequency? like,
    Enum$ShiftRuleFrequency? lt,
    Enum$ShiftRuleFrequency? lte,
    Enum$ShiftRuleFrequency? neq,
    Enum$ShiftRuleFrequency? notILike,
    List<Enum$ShiftRuleFrequency>? notIn,
    Enum$ShiftRuleFrequency? notLike,
  }) => _res;
}

class Input$ShiftRuleSort {
  factory Input$ShiftRuleSort({
    required Enum$SortDirection direction,
    required Enum$ShiftRuleSortFields field,
    Enum$SortNulls? nulls,
  }) => Input$ShiftRuleSort._({
    r'direction': direction,
    r'field': field,
    if (nulls != null) r'nulls': nulls,
  });

  Input$ShiftRuleSort._(this._$data);

  factory Input$ShiftRuleSort.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$direction = data['direction'];
    result$data['direction'] = fromJson$Enum$SortDirection(
      (l$direction as String),
    );
    final l$field = data['field'];
    result$data['field'] = fromJson$Enum$ShiftRuleSortFields(
      (l$field as String),
    );
    if (data.containsKey('nulls')) {
      final l$nulls = data['nulls'];
      result$data['nulls'] = l$nulls == null
          ? null
          : fromJson$Enum$SortNulls((l$nulls as String));
    }
    return Input$ShiftRuleSort._(result$data);
  }

  Map<String, dynamic> _$data;

  Enum$SortDirection get direction =>
      (_$data['direction'] as Enum$SortDirection);

  Enum$ShiftRuleSortFields get field =>
      (_$data['field'] as Enum$ShiftRuleSortFields);

  Enum$SortNulls? get nulls => (_$data['nulls'] as Enum$SortNulls?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$direction = direction;
    result$data['direction'] = toJson$Enum$SortDirection(l$direction);
    final l$field = field;
    result$data['field'] = toJson$Enum$ShiftRuleSortFields(l$field);
    if (_$data.containsKey('nulls')) {
      final l$nulls = nulls;
      result$data['nulls'] = l$nulls == null
          ? null
          : toJson$Enum$SortNulls(l$nulls);
    }
    return result$data;
  }

  CopyWith$Input$ShiftRuleSort<Input$ShiftRuleSort> get copyWith =>
      CopyWith$Input$ShiftRuleSort(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$ShiftRuleSort || runtimeType != other.runtimeType) {
      return false;
    }
    final l$direction = direction;
    final lOther$direction = other.direction;
    if (l$direction != lOther$direction) {
      return false;
    }
    final l$field = field;
    final lOther$field = other.field;
    if (l$field != lOther$field) {
      return false;
    }
    final l$nulls = nulls;
    final lOther$nulls = other.nulls;
    if (_$data.containsKey('nulls') != other._$data.containsKey('nulls')) {
      return false;
    }
    if (l$nulls != lOther$nulls) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$direction = direction;
    final l$field = field;
    final l$nulls = nulls;
    return Object.hashAll([
      l$direction,
      l$field,
      _$data.containsKey('nulls') ? l$nulls : const {},
    ]);
  }
}

abstract class CopyWith$Input$ShiftRuleSort<TRes> {
  factory CopyWith$Input$ShiftRuleSort(
    Input$ShiftRuleSort instance,
    TRes Function(Input$ShiftRuleSort) then,
  ) = _CopyWithImpl$Input$ShiftRuleSort;

  factory CopyWith$Input$ShiftRuleSort.stub(TRes res) =
      _CopyWithStubImpl$Input$ShiftRuleSort;

  TRes call({
    Enum$SortDirection? direction,
    Enum$ShiftRuleSortFields? field,
    Enum$SortNulls? nulls,
  });
}

class _CopyWithImpl$Input$ShiftRuleSort<TRes>
    implements CopyWith$Input$ShiftRuleSort<TRes> {
  _CopyWithImpl$Input$ShiftRuleSort(this._instance, this._then);

  final Input$ShiftRuleSort _instance;

  final TRes Function(Input$ShiftRuleSort) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? direction = _undefined,
    Object? field = _undefined,
    Object? nulls = _undefined,
  }) => _then(
    Input$ShiftRuleSort._({
      ..._instance._$data,
      if (direction != _undefined && direction != null)
        'direction': (direction as Enum$SortDirection),
      if (field != _undefined && field != null)
        'field': (field as Enum$ShiftRuleSortFields),
      if (nulls != _undefined) 'nulls': (nulls as Enum$SortNulls?),
    }),
  );
}

class _CopyWithStubImpl$Input$ShiftRuleSort<TRes>
    implements CopyWith$Input$ShiftRuleSort<TRes> {
  _CopyWithStubImpl$Input$ShiftRuleSort(this._res);

  TRes _res;

  call({
    Enum$SortDirection? direction,
    Enum$ShiftRuleSortFields? field,
    Enum$SortNulls? nulls,
  }) => _res;
}

class Input$TopUpWalletInput {
  factory Input$TopUpWalletInput({
    required double amount,
    required String currency,
    required String gatewayId,
    double? otp,
    double? pin,
    String? token,
    String? transactionId,
  }) => Input$TopUpWalletInput._({
    r'amount': amount,
    r'currency': currency,
    r'gatewayId': gatewayId,
    if (otp != null) r'otp': otp,
    if (pin != null) r'pin': pin,
    if (token != null) r'token': token,
    if (transactionId != null) r'transactionId': transactionId,
  });

  Input$TopUpWalletInput._(this._$data);

  factory Input$TopUpWalletInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$amount = data['amount'];
    result$data['amount'] = (l$amount as num).toDouble();
    final l$currency = data['currency'];
    result$data['currency'] = (l$currency as String);
    final l$gatewayId = data['gatewayId'];
    result$data['gatewayId'] = (l$gatewayId as String);
    if (data.containsKey('otp')) {
      final l$otp = data['otp'];
      result$data['otp'] = (l$otp as num?)?.toDouble();
    }
    if (data.containsKey('pin')) {
      final l$pin = data['pin'];
      result$data['pin'] = (l$pin as num?)?.toDouble();
    }
    if (data.containsKey('token')) {
      final l$token = data['token'];
      result$data['token'] = (l$token as String?);
    }
    if (data.containsKey('transactionId')) {
      final l$transactionId = data['transactionId'];
      result$data['transactionId'] = (l$transactionId as String?);
    }
    return Input$TopUpWalletInput._(result$data);
  }

  Map<String, dynamic> _$data;

  double get amount => (_$data['amount'] as double);

  String get currency => (_$data['currency'] as String);

  String get gatewayId => (_$data['gatewayId'] as String);

  double? get otp => (_$data['otp'] as double?);

  double? get pin => (_$data['pin'] as double?);

  String? get token => (_$data['token'] as String?);

  String? get transactionId => (_$data['transactionId'] as String?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$amount = amount;
    result$data['amount'] = l$amount;
    final l$currency = currency;
    result$data['currency'] = l$currency;
    final l$gatewayId = gatewayId;
    result$data['gatewayId'] = l$gatewayId;
    if (_$data.containsKey('otp')) {
      final l$otp = otp;
      result$data['otp'] = l$otp;
    }
    if (_$data.containsKey('pin')) {
      final l$pin = pin;
      result$data['pin'] = l$pin;
    }
    if (_$data.containsKey('token')) {
      final l$token = token;
      result$data['token'] = l$token;
    }
    if (_$data.containsKey('transactionId')) {
      final l$transactionId = transactionId;
      result$data['transactionId'] = l$transactionId;
    }
    return result$data;
  }

  CopyWith$Input$TopUpWalletInput<Input$TopUpWalletInput> get copyWith =>
      CopyWith$Input$TopUpWalletInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$TopUpWalletInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$amount = amount;
    final lOther$amount = other.amount;
    if (l$amount != lOther$amount) {
      return false;
    }
    final l$currency = currency;
    final lOther$currency = other.currency;
    if (l$currency != lOther$currency) {
      return false;
    }
    final l$gatewayId = gatewayId;
    final lOther$gatewayId = other.gatewayId;
    if (l$gatewayId != lOther$gatewayId) {
      return false;
    }
    final l$otp = otp;
    final lOther$otp = other.otp;
    if (_$data.containsKey('otp') != other._$data.containsKey('otp')) {
      return false;
    }
    if (l$otp != lOther$otp) {
      return false;
    }
    final l$pin = pin;
    final lOther$pin = other.pin;
    if (_$data.containsKey('pin') != other._$data.containsKey('pin')) {
      return false;
    }
    if (l$pin != lOther$pin) {
      return false;
    }
    final l$token = token;
    final lOther$token = other.token;
    if (_$data.containsKey('token') != other._$data.containsKey('token')) {
      return false;
    }
    if (l$token != lOther$token) {
      return false;
    }
    final l$transactionId = transactionId;
    final lOther$transactionId = other.transactionId;
    if (_$data.containsKey('transactionId') !=
        other._$data.containsKey('transactionId')) {
      return false;
    }
    if (l$transactionId != lOther$transactionId) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$amount = amount;
    final l$currency = currency;
    final l$gatewayId = gatewayId;
    final l$otp = otp;
    final l$pin = pin;
    final l$token = token;
    final l$transactionId = transactionId;
    return Object.hashAll([
      l$amount,
      l$currency,
      l$gatewayId,
      _$data.containsKey('otp') ? l$otp : const {},
      _$data.containsKey('pin') ? l$pin : const {},
      _$data.containsKey('token') ? l$token : const {},
      _$data.containsKey('transactionId') ? l$transactionId : const {},
    ]);
  }
}

abstract class CopyWith$Input$TopUpWalletInput<TRes> {
  factory CopyWith$Input$TopUpWalletInput(
    Input$TopUpWalletInput instance,
    TRes Function(Input$TopUpWalletInput) then,
  ) = _CopyWithImpl$Input$TopUpWalletInput;

  factory CopyWith$Input$TopUpWalletInput.stub(TRes res) =
      _CopyWithStubImpl$Input$TopUpWalletInput;

  TRes call({
    double? amount,
    String? currency,
    String? gatewayId,
    double? otp,
    double? pin,
    String? token,
    String? transactionId,
  });
}

class _CopyWithImpl$Input$TopUpWalletInput<TRes>
    implements CopyWith$Input$TopUpWalletInput<TRes> {
  _CopyWithImpl$Input$TopUpWalletInput(this._instance, this._then);

  final Input$TopUpWalletInput _instance;

  final TRes Function(Input$TopUpWalletInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? amount = _undefined,
    Object? currency = _undefined,
    Object? gatewayId = _undefined,
    Object? otp = _undefined,
    Object? pin = _undefined,
    Object? token = _undefined,
    Object? transactionId = _undefined,
  }) => _then(
    Input$TopUpWalletInput._({
      ..._instance._$data,
      if (amount != _undefined && amount != null) 'amount': (amount as double),
      if (currency != _undefined && currency != null)
        'currency': (currency as String),
      if (gatewayId != _undefined && gatewayId != null)
        'gatewayId': (gatewayId as String),
      if (otp != _undefined) 'otp': (otp as double?),
      if (pin != _undefined) 'pin': (pin as double?),
      if (token != _undefined) 'token': (token as String?),
      if (transactionId != _undefined)
        'transactionId': (transactionId as String?),
    }),
  );
}

class _CopyWithStubImpl$Input$TopUpWalletInput<TRes>
    implements CopyWith$Input$TopUpWalletInput<TRes> {
  _CopyWithStubImpl$Input$TopUpWalletInput(this._res);

  TRes _res;

  call({
    double? amount,
    String? currency,
    String? gatewayId,
    double? otp,
    double? pin,
    String? token,
    String? transactionId,
  }) => _res;
}

class Input$UpdateDriverInput {
  factory Input$UpdateDriverInput({
    String? accountNumber,
    String? address,
    String? bankName,
    String? bankRoutingNumber,
    String? bankSwift,
    String? carColorId,
    String? carId,
    String? carModelId,
    String? carPlate,
    int? carProductionYear,
    String? certificateNumber,
    String? email,
    String? firstName,
    Enum$Gender? gender,
    String? lastName,
    String? mediaId,
    String? notificationPlayerId,
    String? payoutAccountNumber,
    String? payoutMethodId,
    int? searchDistance,
    Enum$DriverStatus? status,
  }) => Input$UpdateDriverInput._({
    if (accountNumber != null) r'accountNumber': accountNumber,
    if (address != null) r'address': address,
    if (bankName != null) r'bankName': bankName,
    if (bankRoutingNumber != null) r'bankRoutingNumber': bankRoutingNumber,
    if (bankSwift != null) r'bankSwift': bankSwift,
    if (carColorId != null) r'carColorId': carColorId,
    if (carId != null) r'carId': carId,
    if (carModelId != null) r'carModelId': carModelId,
    if (carPlate != null) r'carPlate': carPlate,
    if (carProductionYear != null) r'carProductionYear': carProductionYear,
    if (certificateNumber != null) r'certificateNumber': certificateNumber,
    if (email != null) r'email': email,
    if (firstName != null) r'firstName': firstName,
    if (gender != null) r'gender': gender,
    if (lastName != null) r'lastName': lastName,
    if (mediaId != null) r'mediaId': mediaId,
    if (notificationPlayerId != null)
      r'notificationPlayerId': notificationPlayerId,
    if (payoutAccountNumber != null)
      r'payoutAccountNumber': payoutAccountNumber,
    if (payoutMethodId != null) r'payoutMethodId': payoutMethodId,
    if (searchDistance != null) r'searchDistance': searchDistance,
    if (status != null) r'status': status,
  });

  Input$UpdateDriverInput._(this._$data);

  factory Input$UpdateDriverInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('accountNumber')) {
      final l$accountNumber = data['accountNumber'];
      result$data['accountNumber'] = (l$accountNumber as String?);
    }
    if (data.containsKey('address')) {
      final l$address = data['address'];
      result$data['address'] = (l$address as String?);
    }
    if (data.containsKey('bankName')) {
      final l$bankName = data['bankName'];
      result$data['bankName'] = (l$bankName as String?);
    }
    if (data.containsKey('bankRoutingNumber')) {
      final l$bankRoutingNumber = data['bankRoutingNumber'];
      result$data['bankRoutingNumber'] = (l$bankRoutingNumber as String?);
    }
    if (data.containsKey('bankSwift')) {
      final l$bankSwift = data['bankSwift'];
      result$data['bankSwift'] = (l$bankSwift as String?);
    }
    if (data.containsKey('carColorId')) {
      final l$carColorId = data['carColorId'];
      result$data['carColorId'] = (l$carColorId as String?);
    }
    if (data.containsKey('carId')) {
      final l$carId = data['carId'];
      result$data['carId'] = (l$carId as String?);
    }
    if (data.containsKey('carModelId')) {
      final l$carModelId = data['carModelId'];
      result$data['carModelId'] = (l$carModelId as String?);
    }
    if (data.containsKey('carPlate')) {
      final l$carPlate = data['carPlate'];
      result$data['carPlate'] = (l$carPlate as String?);
    }
    if (data.containsKey('carProductionYear')) {
      final l$carProductionYear = data['carProductionYear'];
      result$data['carProductionYear'] = (l$carProductionYear as int?);
    }
    if (data.containsKey('certificateNumber')) {
      final l$certificateNumber = data['certificateNumber'];
      result$data['certificateNumber'] = (l$certificateNumber as String?);
    }
    if (data.containsKey('email')) {
      final l$email = data['email'];
      result$data['email'] = (l$email as String?);
    }
    if (data.containsKey('firstName')) {
      final l$firstName = data['firstName'];
      result$data['firstName'] = (l$firstName as String?);
    }
    if (data.containsKey('gender')) {
      final l$gender = data['gender'];
      result$data['gender'] = l$gender == null
          ? null
          : fromJson$Enum$Gender((l$gender as String));
    }
    if (data.containsKey('lastName')) {
      final l$lastName = data['lastName'];
      result$data['lastName'] = (l$lastName as String?);
    }
    if (data.containsKey('mediaId')) {
      final l$mediaId = data['mediaId'];
      result$data['mediaId'] = (l$mediaId as String?);
    }
    if (data.containsKey('notificationPlayerId')) {
      final l$notificationPlayerId = data['notificationPlayerId'];
      result$data['notificationPlayerId'] = (l$notificationPlayerId as String?);
    }
    if (data.containsKey('payoutAccountNumber')) {
      final l$payoutAccountNumber = data['payoutAccountNumber'];
      result$data['payoutAccountNumber'] = (l$payoutAccountNumber as String?);
    }
    if (data.containsKey('payoutMethodId')) {
      final l$payoutMethodId = data['payoutMethodId'];
      result$data['payoutMethodId'] = (l$payoutMethodId as String?);
    }
    if (data.containsKey('searchDistance')) {
      final l$searchDistance = data['searchDistance'];
      result$data['searchDistance'] = (l$searchDistance as int?);
    }
    if (data.containsKey('status')) {
      final l$status = data['status'];
      result$data['status'] = l$status == null
          ? null
          : fromJson$Enum$DriverStatus((l$status as String));
    }
    return Input$UpdateDriverInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String? get accountNumber => (_$data['accountNumber'] as String?);

  String? get address => (_$data['address'] as String?);

  String? get bankName => (_$data['bankName'] as String?);

  String? get bankRoutingNumber => (_$data['bankRoutingNumber'] as String?);

  String? get bankSwift => (_$data['bankSwift'] as String?);

  String? get carColorId => (_$data['carColorId'] as String?);

  String? get carId => (_$data['carId'] as String?);

  String? get carModelId => (_$data['carModelId'] as String?);

  String? get carPlate => (_$data['carPlate'] as String?);

  int? get carProductionYear => (_$data['carProductionYear'] as int?);

  String? get certificateNumber => (_$data['certificateNumber'] as String?);

  String? get email => (_$data['email'] as String?);

  String? get firstName => (_$data['firstName'] as String?);

  Enum$Gender? get gender => (_$data['gender'] as Enum$Gender?);

  String? get lastName => (_$data['lastName'] as String?);

  String? get mediaId => (_$data['mediaId'] as String?);

  String? get notificationPlayerId =>
      (_$data['notificationPlayerId'] as String?);

  String? get payoutAccountNumber => (_$data['payoutAccountNumber'] as String?);

  String? get payoutMethodId => (_$data['payoutMethodId'] as String?);

  int? get searchDistance => (_$data['searchDistance'] as int?);

  Enum$DriverStatus? get status => (_$data['status'] as Enum$DriverStatus?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('accountNumber')) {
      final l$accountNumber = accountNumber;
      result$data['accountNumber'] = l$accountNumber;
    }
    if (_$data.containsKey('address')) {
      final l$address = address;
      result$data['address'] = l$address;
    }
    if (_$data.containsKey('bankName')) {
      final l$bankName = bankName;
      result$data['bankName'] = l$bankName;
    }
    if (_$data.containsKey('bankRoutingNumber')) {
      final l$bankRoutingNumber = bankRoutingNumber;
      result$data['bankRoutingNumber'] = l$bankRoutingNumber;
    }
    if (_$data.containsKey('bankSwift')) {
      final l$bankSwift = bankSwift;
      result$data['bankSwift'] = l$bankSwift;
    }
    if (_$data.containsKey('carColorId')) {
      final l$carColorId = carColorId;
      result$data['carColorId'] = l$carColorId;
    }
    if (_$data.containsKey('carId')) {
      final l$carId = carId;
      result$data['carId'] = l$carId;
    }
    if (_$data.containsKey('carModelId')) {
      final l$carModelId = carModelId;
      result$data['carModelId'] = l$carModelId;
    }
    if (_$data.containsKey('carPlate')) {
      final l$carPlate = carPlate;
      result$data['carPlate'] = l$carPlate;
    }
    if (_$data.containsKey('carProductionYear')) {
      final l$carProductionYear = carProductionYear;
      result$data['carProductionYear'] = l$carProductionYear;
    }
    if (_$data.containsKey('certificateNumber')) {
      final l$certificateNumber = certificateNumber;
      result$data['certificateNumber'] = l$certificateNumber;
    }
    if (_$data.containsKey('email')) {
      final l$email = email;
      result$data['email'] = l$email;
    }
    if (_$data.containsKey('firstName')) {
      final l$firstName = firstName;
      result$data['firstName'] = l$firstName;
    }
    if (_$data.containsKey('gender')) {
      final l$gender = gender;
      result$data['gender'] = l$gender == null
          ? null
          : toJson$Enum$Gender(l$gender);
    }
    if (_$data.containsKey('lastName')) {
      final l$lastName = lastName;
      result$data['lastName'] = l$lastName;
    }
    if (_$data.containsKey('mediaId')) {
      final l$mediaId = mediaId;
      result$data['mediaId'] = l$mediaId;
    }
    if (_$data.containsKey('notificationPlayerId')) {
      final l$notificationPlayerId = notificationPlayerId;
      result$data['notificationPlayerId'] = l$notificationPlayerId;
    }
    if (_$data.containsKey('payoutAccountNumber')) {
      final l$payoutAccountNumber = payoutAccountNumber;
      result$data['payoutAccountNumber'] = l$payoutAccountNumber;
    }
    if (_$data.containsKey('payoutMethodId')) {
      final l$payoutMethodId = payoutMethodId;
      result$data['payoutMethodId'] = l$payoutMethodId;
    }
    if (_$data.containsKey('searchDistance')) {
      final l$searchDistance = searchDistance;
      result$data['searchDistance'] = l$searchDistance;
    }
    if (_$data.containsKey('status')) {
      final l$status = status;
      result$data['status'] = l$status == null
          ? null
          : toJson$Enum$DriverStatus(l$status);
    }
    return result$data;
  }

  CopyWith$Input$UpdateDriverInput<Input$UpdateDriverInput> get copyWith =>
      CopyWith$Input$UpdateDriverInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$UpdateDriverInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$accountNumber = accountNumber;
    final lOther$accountNumber = other.accountNumber;
    if (_$data.containsKey('accountNumber') !=
        other._$data.containsKey('accountNumber')) {
      return false;
    }
    if (l$accountNumber != lOther$accountNumber) {
      return false;
    }
    final l$address = address;
    final lOther$address = other.address;
    if (_$data.containsKey('address') != other._$data.containsKey('address')) {
      return false;
    }
    if (l$address != lOther$address) {
      return false;
    }
    final l$bankName = bankName;
    final lOther$bankName = other.bankName;
    if (_$data.containsKey('bankName') !=
        other._$data.containsKey('bankName')) {
      return false;
    }
    if (l$bankName != lOther$bankName) {
      return false;
    }
    final l$bankRoutingNumber = bankRoutingNumber;
    final lOther$bankRoutingNumber = other.bankRoutingNumber;
    if (_$data.containsKey('bankRoutingNumber') !=
        other._$data.containsKey('bankRoutingNumber')) {
      return false;
    }
    if (l$bankRoutingNumber != lOther$bankRoutingNumber) {
      return false;
    }
    final l$bankSwift = bankSwift;
    final lOther$bankSwift = other.bankSwift;
    if (_$data.containsKey('bankSwift') !=
        other._$data.containsKey('bankSwift')) {
      return false;
    }
    if (l$bankSwift != lOther$bankSwift) {
      return false;
    }
    final l$carColorId = carColorId;
    final lOther$carColorId = other.carColorId;
    if (_$data.containsKey('carColorId') !=
        other._$data.containsKey('carColorId')) {
      return false;
    }
    if (l$carColorId != lOther$carColorId) {
      return false;
    }
    final l$carId = carId;
    final lOther$carId = other.carId;
    if (_$data.containsKey('carId') != other._$data.containsKey('carId')) {
      return false;
    }
    if (l$carId != lOther$carId) {
      return false;
    }
    final l$carModelId = carModelId;
    final lOther$carModelId = other.carModelId;
    if (_$data.containsKey('carModelId') !=
        other._$data.containsKey('carModelId')) {
      return false;
    }
    if (l$carModelId != lOther$carModelId) {
      return false;
    }
    final l$carPlate = carPlate;
    final lOther$carPlate = other.carPlate;
    if (_$data.containsKey('carPlate') !=
        other._$data.containsKey('carPlate')) {
      return false;
    }
    if (l$carPlate != lOther$carPlate) {
      return false;
    }
    final l$carProductionYear = carProductionYear;
    final lOther$carProductionYear = other.carProductionYear;
    if (_$data.containsKey('carProductionYear') !=
        other._$data.containsKey('carProductionYear')) {
      return false;
    }
    if (l$carProductionYear != lOther$carProductionYear) {
      return false;
    }
    final l$certificateNumber = certificateNumber;
    final lOther$certificateNumber = other.certificateNumber;
    if (_$data.containsKey('certificateNumber') !=
        other._$data.containsKey('certificateNumber')) {
      return false;
    }
    if (l$certificateNumber != lOther$certificateNumber) {
      return false;
    }
    final l$email = email;
    final lOther$email = other.email;
    if (_$data.containsKey('email') != other._$data.containsKey('email')) {
      return false;
    }
    if (l$email != lOther$email) {
      return false;
    }
    final l$firstName = firstName;
    final lOther$firstName = other.firstName;
    if (_$data.containsKey('firstName') !=
        other._$data.containsKey('firstName')) {
      return false;
    }
    if (l$firstName != lOther$firstName) {
      return false;
    }
    final l$gender = gender;
    final lOther$gender = other.gender;
    if (_$data.containsKey('gender') != other._$data.containsKey('gender')) {
      return false;
    }
    if (l$gender != lOther$gender) {
      return false;
    }
    final l$lastName = lastName;
    final lOther$lastName = other.lastName;
    if (_$data.containsKey('lastName') !=
        other._$data.containsKey('lastName')) {
      return false;
    }
    if (l$lastName != lOther$lastName) {
      return false;
    }
    final l$mediaId = mediaId;
    final lOther$mediaId = other.mediaId;
    if (_$data.containsKey('mediaId') != other._$data.containsKey('mediaId')) {
      return false;
    }
    if (l$mediaId != lOther$mediaId) {
      return false;
    }
    final l$notificationPlayerId = notificationPlayerId;
    final lOther$notificationPlayerId = other.notificationPlayerId;
    if (_$data.containsKey('notificationPlayerId') !=
        other._$data.containsKey('notificationPlayerId')) {
      return false;
    }
    if (l$notificationPlayerId != lOther$notificationPlayerId) {
      return false;
    }
    final l$payoutAccountNumber = payoutAccountNumber;
    final lOther$payoutAccountNumber = other.payoutAccountNumber;
    if (_$data.containsKey('payoutAccountNumber') !=
        other._$data.containsKey('payoutAccountNumber')) {
      return false;
    }
    if (l$payoutAccountNumber != lOther$payoutAccountNumber) {
      return false;
    }
    final l$payoutMethodId = payoutMethodId;
    final lOther$payoutMethodId = other.payoutMethodId;
    if (_$data.containsKey('payoutMethodId') !=
        other._$data.containsKey('payoutMethodId')) {
      return false;
    }
    if (l$payoutMethodId != lOther$payoutMethodId) {
      return false;
    }
    final l$searchDistance = searchDistance;
    final lOther$searchDistance = other.searchDistance;
    if (_$data.containsKey('searchDistance') !=
        other._$data.containsKey('searchDistance')) {
      return false;
    }
    if (l$searchDistance != lOther$searchDistance) {
      return false;
    }
    final l$status = status;
    final lOther$status = other.status;
    if (_$data.containsKey('status') != other._$data.containsKey('status')) {
      return false;
    }
    if (l$status != lOther$status) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$accountNumber = accountNumber;
    final l$address = address;
    final l$bankName = bankName;
    final l$bankRoutingNumber = bankRoutingNumber;
    final l$bankSwift = bankSwift;
    final l$carColorId = carColorId;
    final l$carId = carId;
    final l$carModelId = carModelId;
    final l$carPlate = carPlate;
    final l$carProductionYear = carProductionYear;
    final l$certificateNumber = certificateNumber;
    final l$email = email;
    final l$firstName = firstName;
    final l$gender = gender;
    final l$lastName = lastName;
    final l$mediaId = mediaId;
    final l$notificationPlayerId = notificationPlayerId;
    final l$payoutAccountNumber = payoutAccountNumber;
    final l$payoutMethodId = payoutMethodId;
    final l$searchDistance = searchDistance;
    final l$status = status;
    return Object.hashAll([
      _$data.containsKey('accountNumber') ? l$accountNumber : const {},
      _$data.containsKey('address') ? l$address : const {},
      _$data.containsKey('bankName') ? l$bankName : const {},
      _$data.containsKey('bankRoutingNumber') ? l$bankRoutingNumber : const {},
      _$data.containsKey('bankSwift') ? l$bankSwift : const {},
      _$data.containsKey('carColorId') ? l$carColorId : const {},
      _$data.containsKey('carId') ? l$carId : const {},
      _$data.containsKey('carModelId') ? l$carModelId : const {},
      _$data.containsKey('carPlate') ? l$carPlate : const {},
      _$data.containsKey('carProductionYear') ? l$carProductionYear : const {},
      _$data.containsKey('certificateNumber') ? l$certificateNumber : const {},
      _$data.containsKey('email') ? l$email : const {},
      _$data.containsKey('firstName') ? l$firstName : const {},
      _$data.containsKey('gender') ? l$gender : const {},
      _$data.containsKey('lastName') ? l$lastName : const {},
      _$data.containsKey('mediaId') ? l$mediaId : const {},
      _$data.containsKey('notificationPlayerId')
          ? l$notificationPlayerId
          : const {},
      _$data.containsKey('payoutAccountNumber')
          ? l$payoutAccountNumber
          : const {},
      _$data.containsKey('payoutMethodId') ? l$payoutMethodId : const {},
      _$data.containsKey('searchDistance') ? l$searchDistance : const {},
      _$data.containsKey('status') ? l$status : const {},
    ]);
  }
}

abstract class CopyWith$Input$UpdateDriverInput<TRes> {
  factory CopyWith$Input$UpdateDriverInput(
    Input$UpdateDriverInput instance,
    TRes Function(Input$UpdateDriverInput) then,
  ) = _CopyWithImpl$Input$UpdateDriverInput;

  factory CopyWith$Input$UpdateDriverInput.stub(TRes res) =
      _CopyWithStubImpl$Input$UpdateDriverInput;

  TRes call({
    String? accountNumber,
    String? address,
    String? bankName,
    String? bankRoutingNumber,
    String? bankSwift,
    String? carColorId,
    String? carId,
    String? carModelId,
    String? carPlate,
    int? carProductionYear,
    String? certificateNumber,
    String? email,
    String? firstName,
    Enum$Gender? gender,
    String? lastName,
    String? mediaId,
    String? notificationPlayerId,
    String? payoutAccountNumber,
    String? payoutMethodId,
    int? searchDistance,
    Enum$DriverStatus? status,
  });
}

class _CopyWithImpl$Input$UpdateDriverInput<TRes>
    implements CopyWith$Input$UpdateDriverInput<TRes> {
  _CopyWithImpl$Input$UpdateDriverInput(this._instance, this._then);

  final Input$UpdateDriverInput _instance;

  final TRes Function(Input$UpdateDriverInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? accountNumber = _undefined,
    Object? address = _undefined,
    Object? bankName = _undefined,
    Object? bankRoutingNumber = _undefined,
    Object? bankSwift = _undefined,
    Object? carColorId = _undefined,
    Object? carId = _undefined,
    Object? carModelId = _undefined,
    Object? carPlate = _undefined,
    Object? carProductionYear = _undefined,
    Object? certificateNumber = _undefined,
    Object? email = _undefined,
    Object? firstName = _undefined,
    Object? gender = _undefined,
    Object? lastName = _undefined,
    Object? mediaId = _undefined,
    Object? notificationPlayerId = _undefined,
    Object? payoutAccountNumber = _undefined,
    Object? payoutMethodId = _undefined,
    Object? searchDistance = _undefined,
    Object? status = _undefined,
  }) => _then(
    Input$UpdateDriverInput._({
      ..._instance._$data,
      if (accountNumber != _undefined)
        'accountNumber': (accountNumber as String?),
      if (address != _undefined) 'address': (address as String?),
      if (bankName != _undefined) 'bankName': (bankName as String?),
      if (bankRoutingNumber != _undefined)
        'bankRoutingNumber': (bankRoutingNumber as String?),
      if (bankSwift != _undefined) 'bankSwift': (bankSwift as String?),
      if (carColorId != _undefined) 'carColorId': (carColorId as String?),
      if (carId != _undefined) 'carId': (carId as String?),
      if (carModelId != _undefined) 'carModelId': (carModelId as String?),
      if (carPlate != _undefined) 'carPlate': (carPlate as String?),
      if (carProductionYear != _undefined)
        'carProductionYear': (carProductionYear as int?),
      if (certificateNumber != _undefined)
        'certificateNumber': (certificateNumber as String?),
      if (email != _undefined) 'email': (email as String?),
      if (firstName != _undefined) 'firstName': (firstName as String?),
      if (gender != _undefined) 'gender': (gender as Enum$Gender?),
      if (lastName != _undefined) 'lastName': (lastName as String?),
      if (mediaId != _undefined) 'mediaId': (mediaId as String?),
      if (notificationPlayerId != _undefined)
        'notificationPlayerId': (notificationPlayerId as String?),
      if (payoutAccountNumber != _undefined)
        'payoutAccountNumber': (payoutAccountNumber as String?),
      if (payoutMethodId != _undefined)
        'payoutMethodId': (payoutMethodId as String?),
      if (searchDistance != _undefined)
        'searchDistance': (searchDistance as int?),
      if (status != _undefined) 'status': (status as Enum$DriverStatus?),
    }),
  );
}

class _CopyWithStubImpl$Input$UpdateDriverInput<TRes>
    implements CopyWith$Input$UpdateDriverInput<TRes> {
  _CopyWithStubImpl$Input$UpdateDriverInput(this._res);

  TRes _res;

  call({
    String? accountNumber,
    String? address,
    String? bankName,
    String? bankRoutingNumber,
    String? bankSwift,
    String? carColorId,
    String? carId,
    String? carModelId,
    String? carPlate,
    int? carProductionYear,
    String? certificateNumber,
    String? email,
    String? firstName,
    Enum$Gender? gender,
    String? lastName,
    String? mediaId,
    String? notificationPlayerId,
    String? payoutAccountNumber,
    String? payoutMethodId,
    int? searchDistance,
    Enum$DriverStatus? status,
  }) => _res;
}

class Input$UpdateOneDriverInput {
  factory Input$UpdateOneDriverInput({
    required String id,
    required Input$UpdateDriverInput update,
  }) => Input$UpdateOneDriverInput._({r'id': id, r'update': update});

  Input$UpdateOneDriverInput._(this._$data);

  factory Input$UpdateOneDriverInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$id = data['id'];
    result$data['id'] = (l$id as String);
    final l$update = data['update'];
    result$data['update'] = Input$UpdateDriverInput.fromJson(
      (l$update as Map<String, dynamic>),
    );
    return Input$UpdateOneDriverInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String get id => (_$data['id'] as String);

  Input$UpdateDriverInput get update =>
      (_$data['update'] as Input$UpdateDriverInput);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$id = id;
    result$data['id'] = l$id;
    final l$update = update;
    result$data['update'] = l$update.toJson();
    return result$data;
  }

  CopyWith$Input$UpdateOneDriverInput<Input$UpdateOneDriverInput>
  get copyWith => CopyWith$Input$UpdateOneDriverInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$UpdateOneDriverInput ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (l$id != lOther$id) {
      return false;
    }
    final l$update = update;
    final lOther$update = other.update;
    if (l$update != lOther$update) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$id = id;
    final l$update = update;
    return Object.hashAll([l$id, l$update]);
  }
}

abstract class CopyWith$Input$UpdateOneDriverInput<TRes> {
  factory CopyWith$Input$UpdateOneDriverInput(
    Input$UpdateOneDriverInput instance,
    TRes Function(Input$UpdateOneDriverInput) then,
  ) = _CopyWithImpl$Input$UpdateOneDriverInput;

  factory CopyWith$Input$UpdateOneDriverInput.stub(TRes res) =
      _CopyWithStubImpl$Input$UpdateOneDriverInput;

  TRes call({String? id, Input$UpdateDriverInput? update});
  CopyWith$Input$UpdateDriverInput<TRes> get update;
}

class _CopyWithImpl$Input$UpdateOneDriverInput<TRes>
    implements CopyWith$Input$UpdateOneDriverInput<TRes> {
  _CopyWithImpl$Input$UpdateOneDriverInput(this._instance, this._then);

  final Input$UpdateOneDriverInput _instance;

  final TRes Function(Input$UpdateOneDriverInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? id = _undefined, Object? update = _undefined}) => _then(
    Input$UpdateOneDriverInput._({
      ..._instance._$data,
      if (id != _undefined && id != null) 'id': (id as String),
      if (update != _undefined && update != null)
        'update': (update as Input$UpdateDriverInput),
    }),
  );

  CopyWith$Input$UpdateDriverInput<TRes> get update {
    final local$update = _instance.update;
    return CopyWith$Input$UpdateDriverInput(
      local$update,
      (e) => call(update: e),
    );
  }
}

class _CopyWithStubImpl$Input$UpdateOneDriverInput<TRes>
    implements CopyWith$Input$UpdateOneDriverInput<TRes> {
  _CopyWithStubImpl$Input$UpdateOneDriverInput(this._res);

  TRes _res;

  call({String? id, Input$UpdateDriverInput? update}) => _res;

  CopyWith$Input$UpdateDriverInput<TRes> get update =>
      CopyWith$Input$UpdateDriverInput.stub(_res);
}

class Input$UpdateOneOrderInput {
  factory Input$UpdateOneOrderInput({
    required String id,
    required Input$UpdateOrderInput update,
  }) => Input$UpdateOneOrderInput._({r'id': id, r'update': update});

  Input$UpdateOneOrderInput._(this._$data);

  factory Input$UpdateOneOrderInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    final l$id = data['id'];
    result$data['id'] = (l$id as String);
    final l$update = data['update'];
    result$data['update'] = Input$UpdateOrderInput.fromJson(
      (l$update as Map<String, dynamic>),
    );
    return Input$UpdateOneOrderInput._(result$data);
  }

  Map<String, dynamic> _$data;

  String get id => (_$data['id'] as String);

  Input$UpdateOrderInput get update =>
      (_$data['update'] as Input$UpdateOrderInput);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    final l$id = id;
    result$data['id'] = l$id;
    final l$update = update;
    result$data['update'] = l$update.toJson();
    return result$data;
  }

  CopyWith$Input$UpdateOneOrderInput<Input$UpdateOneOrderInput> get copyWith =>
      CopyWith$Input$UpdateOneOrderInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$UpdateOneOrderInput ||
        runtimeType != other.runtimeType) {
      return false;
    }
    final l$id = id;
    final lOther$id = other.id;
    if (l$id != lOther$id) {
      return false;
    }
    final l$update = update;
    final lOther$update = other.update;
    if (l$update != lOther$update) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$id = id;
    final l$update = update;
    return Object.hashAll([l$id, l$update]);
  }
}

abstract class CopyWith$Input$UpdateOneOrderInput<TRes> {
  factory CopyWith$Input$UpdateOneOrderInput(
    Input$UpdateOneOrderInput instance,
    TRes Function(Input$UpdateOneOrderInput) then,
  ) = _CopyWithImpl$Input$UpdateOneOrderInput;

  factory CopyWith$Input$UpdateOneOrderInput.stub(TRes res) =
      _CopyWithStubImpl$Input$UpdateOneOrderInput;

  TRes call({String? id, Input$UpdateOrderInput? update});
  CopyWith$Input$UpdateOrderInput<TRes> get update;
}

class _CopyWithImpl$Input$UpdateOneOrderInput<TRes>
    implements CopyWith$Input$UpdateOneOrderInput<TRes> {
  _CopyWithImpl$Input$UpdateOneOrderInput(this._instance, this._then);

  final Input$UpdateOneOrderInput _instance;

  final TRes Function(Input$UpdateOneOrderInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({Object? id = _undefined, Object? update = _undefined}) => _then(
    Input$UpdateOneOrderInput._({
      ..._instance._$data,
      if (id != _undefined && id != null) 'id': (id as String),
      if (update != _undefined && update != null)
        'update': (update as Input$UpdateOrderInput),
    }),
  );

  CopyWith$Input$UpdateOrderInput<TRes> get update {
    final local$update = _instance.update;
    return CopyWith$Input$UpdateOrderInput(
      local$update,
      (e) => call(update: e),
    );
  }
}

class _CopyWithStubImpl$Input$UpdateOneOrderInput<TRes>
    implements CopyWith$Input$UpdateOneOrderInput<TRes> {
  _CopyWithStubImpl$Input$UpdateOneOrderInput(this._res);

  TRes _res;

  call({String? id, Input$UpdateOrderInput? update}) => _res;

  CopyWith$Input$UpdateOrderInput<TRes> get update =>
      CopyWith$Input$UpdateOrderInput.stub(_res);
}

class Input$UpdateOrderInput {
  factory Input$UpdateOrderInput({
    int? destinationArrivedTo,
    double? paidAmount,
    Enum$OrderStatus? status,
  }) => Input$UpdateOrderInput._({
    if (destinationArrivedTo != null)
      r'destinationArrivedTo': destinationArrivedTo,
    if (paidAmount != null) r'paidAmount': paidAmount,
    if (status != null) r'status': status,
  });

  Input$UpdateOrderInput._(this._$data);

  factory Input$UpdateOrderInput.fromJson(Map<String, dynamic> data) {
    final result$data = <String, dynamic>{};
    if (data.containsKey('destinationArrivedTo')) {
      final l$destinationArrivedTo = data['destinationArrivedTo'];
      result$data['destinationArrivedTo'] = (l$destinationArrivedTo as int?);
    }
    if (data.containsKey('paidAmount')) {
      final l$paidAmount = data['paidAmount'];
      result$data['paidAmount'] = (l$paidAmount as num?)?.toDouble();
    }
    if (data.containsKey('status')) {
      final l$status = data['status'];
      result$data['status'] = l$status == null
          ? null
          : fromJson$Enum$OrderStatus((l$status as String));
    }
    return Input$UpdateOrderInput._(result$data);
  }

  Map<String, dynamic> _$data;

  int? get destinationArrivedTo => (_$data['destinationArrivedTo'] as int?);

  double? get paidAmount => (_$data['paidAmount'] as double?);

  Enum$OrderStatus? get status => (_$data['status'] as Enum$OrderStatus?);

  Map<String, dynamic> toJson() {
    final result$data = <String, dynamic>{};
    if (_$data.containsKey('destinationArrivedTo')) {
      final l$destinationArrivedTo = destinationArrivedTo;
      result$data['destinationArrivedTo'] = l$destinationArrivedTo;
    }
    if (_$data.containsKey('paidAmount')) {
      final l$paidAmount = paidAmount;
      result$data['paidAmount'] = l$paidAmount;
    }
    if (_$data.containsKey('status')) {
      final l$status = status;
      result$data['status'] = l$status == null
          ? null
          : toJson$Enum$OrderStatus(l$status);
    }
    return result$data;
  }

  CopyWith$Input$UpdateOrderInput<Input$UpdateOrderInput> get copyWith =>
      CopyWith$Input$UpdateOrderInput(this, (i) => i);

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) {
      return true;
    }
    if (other is! Input$UpdateOrderInput || runtimeType != other.runtimeType) {
      return false;
    }
    final l$destinationArrivedTo = destinationArrivedTo;
    final lOther$destinationArrivedTo = other.destinationArrivedTo;
    if (_$data.containsKey('destinationArrivedTo') !=
        other._$data.containsKey('destinationArrivedTo')) {
      return false;
    }
    if (l$destinationArrivedTo != lOther$destinationArrivedTo) {
      return false;
    }
    final l$paidAmount = paidAmount;
    final lOther$paidAmount = other.paidAmount;
    if (_$data.containsKey('paidAmount') !=
        other._$data.containsKey('paidAmount')) {
      return false;
    }
    if (l$paidAmount != lOther$paidAmount) {
      return false;
    }
    final l$status = status;
    final lOther$status = other.status;
    if (_$data.containsKey('status') != other._$data.containsKey('status')) {
      return false;
    }
    if (l$status != lOther$status) {
      return false;
    }
    return true;
  }

  @override
  int get hashCode {
    final l$destinationArrivedTo = destinationArrivedTo;
    final l$paidAmount = paidAmount;
    final l$status = status;
    return Object.hashAll([
      _$data.containsKey('destinationArrivedTo')
          ? l$destinationArrivedTo
          : const {},
      _$data.containsKey('paidAmount') ? l$paidAmount : const {},
      _$data.containsKey('status') ? l$status : const {},
    ]);
  }
}

abstract class CopyWith$Input$UpdateOrderInput<TRes> {
  factory CopyWith$Input$UpdateOrderInput(
    Input$UpdateOrderInput instance,
    TRes Function(Input$UpdateOrderInput) then,
  ) = _CopyWithImpl$Input$UpdateOrderInput;

  factory CopyWith$Input$UpdateOrderInput.stub(TRes res) =
      _CopyWithStubImpl$Input$UpdateOrderInput;

  TRes call({
    int? destinationArrivedTo,
    double? paidAmount,
    Enum$OrderStatus? status,
  });
}

class _CopyWithImpl$Input$UpdateOrderInput<TRes>
    implements CopyWith$Input$UpdateOrderInput<TRes> {
  _CopyWithImpl$Input$UpdateOrderInput(this._instance, this._then);

  final Input$UpdateOrderInput _instance;

  final TRes Function(Input$UpdateOrderInput) _then;

  static const _undefined = <dynamic, dynamic>{};

  TRes call({
    Object? destinationArrivedTo = _undefined,
    Object? paidAmount = _undefined,
    Object? status = _undefined,
  }) => _then(
    Input$UpdateOrderInput._({
      ..._instance._$data,
      if (destinationArrivedTo != _undefined)
        'destinationArrivedTo': (destinationArrivedTo as int?),
      if (paidAmount != _undefined) 'paidAmount': (paidAmount as double?),
      if (status != _undefined) 'status': (status as Enum$OrderStatus?),
    }),
  );
}

class _CopyWithStubImpl$Input$UpdateOrderInput<TRes>
    implements CopyWith$Input$UpdateOrderInput<TRes> {
  _CopyWithStubImpl$Input$UpdateOrderInput(this._res);

  TRes _res;

  call({
    int? destinationArrivedTo,
    double? paidAmount,
    Enum$OrderStatus? status,
  }) => _res;
}

enum Enum$AnnouncementSortFields {
  id,
  userType,
  $unknown;

  factory Enum$AnnouncementSortFields.fromJson(String value) =>
      fromJson$Enum$AnnouncementSortFields(value);

  String toJson() => toJson$Enum$AnnouncementSortFields(this);
}

String toJson$Enum$AnnouncementSortFields(Enum$AnnouncementSortFields e) {
  switch (e) {
    case Enum$AnnouncementSortFields.id:
      return r'id';
    case Enum$AnnouncementSortFields.userType:
      return r'userType';
    case Enum$AnnouncementSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$AnnouncementSortFields fromJson$Enum$AnnouncementSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$AnnouncementSortFields.id;
    case r'userType':
      return Enum$AnnouncementSortFields.userType;
    default:
      return Enum$AnnouncementSortFields.$unknown;
  }
}

enum Enum$AnnouncementUserType {
  Driver,
  Operator,
  Rider,
  $unknown;

  factory Enum$AnnouncementUserType.fromJson(String value) =>
      fromJson$Enum$AnnouncementUserType(value);

  String toJson() => toJson$Enum$AnnouncementUserType(this);
}

String toJson$Enum$AnnouncementUserType(Enum$AnnouncementUserType e) {
  switch (e) {
    case Enum$AnnouncementUserType.Driver:
      return r'Driver';
    case Enum$AnnouncementUserType.Operator:
      return r'Operator';
    case Enum$AnnouncementUserType.Rider:
      return r'Rider';
    case Enum$AnnouncementUserType.$unknown:
      return r'$unknown';
  }
}

Enum$AnnouncementUserType fromJson$Enum$AnnouncementUserType(String value) {
  switch (value) {
    case r'Driver':
      return Enum$AnnouncementUserType.Driver;
    case r'Operator':
      return Enum$AnnouncementUserType.Operator;
    case r'Rider':
      return Enum$AnnouncementUserType.Rider;
    default:
      return Enum$AnnouncementUserType.$unknown;
  }
}

enum Enum$CarColorSortFields {
  id,
  $unknown;

  factory Enum$CarColorSortFields.fromJson(String value) =>
      fromJson$Enum$CarColorSortFields(value);

  String toJson() => toJson$Enum$CarColorSortFields(this);
}

String toJson$Enum$CarColorSortFields(Enum$CarColorSortFields e) {
  switch (e) {
    case Enum$CarColorSortFields.id:
      return r'id';
    case Enum$CarColorSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$CarColorSortFields fromJson$Enum$CarColorSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$CarColorSortFields.id;
    default:
      return Enum$CarColorSortFields.$unknown;
  }
}

enum Enum$CarModelSortFields {
  id,
  $unknown;

  factory Enum$CarModelSortFields.fromJson(String value) =>
      fromJson$Enum$CarModelSortFields(value);

  String toJson() => toJson$Enum$CarModelSortFields(this);
}

String toJson$Enum$CarModelSortFields(Enum$CarModelSortFields e) {
  switch (e) {
    case Enum$CarModelSortFields.id:
      return r'id';
    case Enum$CarModelSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$CarModelSortFields fromJson$Enum$CarModelSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$CarModelSortFields.id;
    default:
      return Enum$CarModelSortFields.$unknown;
  }
}

enum Enum$ComplaintStatus {
  Resolved,
  Submitted,
  UnderInvestigation,
  $unknown;

  factory Enum$ComplaintStatus.fromJson(String value) =>
      fromJson$Enum$ComplaintStatus(value);

  String toJson() => toJson$Enum$ComplaintStatus(this);
}

String toJson$Enum$ComplaintStatus(Enum$ComplaintStatus e) {
  switch (e) {
    case Enum$ComplaintStatus.Resolved:
      return r'Resolved';
    case Enum$ComplaintStatus.Submitted:
      return r'Submitted';
    case Enum$ComplaintStatus.UnderInvestigation:
      return r'UnderInvestigation';
    case Enum$ComplaintStatus.$unknown:
      return r'$unknown';
  }
}

Enum$ComplaintStatus fromJson$Enum$ComplaintStatus(String value) {
  switch (value) {
    case r'Resolved':
      return Enum$ComplaintStatus.Resolved;
    case r'Submitted':
      return Enum$ComplaintStatus.Submitted;
    case r'UnderInvestigation':
      return Enum$ComplaintStatus.UnderInvestigation;
    default:
      return Enum$ComplaintStatus.$unknown;
  }
}

enum Enum$DriverDeductTransactionType {
  Commission,
  Correction,
  Withdraw,
  $unknown;

  factory Enum$DriverDeductTransactionType.fromJson(String value) =>
      fromJson$Enum$DriverDeductTransactionType(value);

  String toJson() => toJson$Enum$DriverDeductTransactionType(this);
}

String toJson$Enum$DriverDeductTransactionType(
  Enum$DriverDeductTransactionType e,
) {
  switch (e) {
    case Enum$DriverDeductTransactionType.Commission:
      return r'Commission';
    case Enum$DriverDeductTransactionType.Correction:
      return r'Correction';
    case Enum$DriverDeductTransactionType.Withdraw:
      return r'Withdraw';
    case Enum$DriverDeductTransactionType.$unknown:
      return r'$unknown';
  }
}

Enum$DriverDeductTransactionType fromJson$Enum$DriverDeductTransactionType(
  String value,
) {
  switch (value) {
    case r'Commission':
      return Enum$DriverDeductTransactionType.Commission;
    case r'Correction':
      return Enum$DriverDeductTransactionType.Correction;
    case r'Withdraw':
      return Enum$DriverDeductTransactionType.Withdraw;
    default:
      return Enum$DriverDeductTransactionType.$unknown;
  }
}

enum Enum$DriverRechargeTransactionType {
  BankTransfer,
  Gift,
  InAppPayment,
  OrderFee,
  $unknown;

  factory Enum$DriverRechargeTransactionType.fromJson(String value) =>
      fromJson$Enum$DriverRechargeTransactionType(value);

  String toJson() => toJson$Enum$DriverRechargeTransactionType(this);
}

String toJson$Enum$DriverRechargeTransactionType(
  Enum$DriverRechargeTransactionType e,
) {
  switch (e) {
    case Enum$DriverRechargeTransactionType.BankTransfer:
      return r'BankTransfer';
    case Enum$DriverRechargeTransactionType.Gift:
      return r'Gift';
    case Enum$DriverRechargeTransactionType.InAppPayment:
      return r'InAppPayment';
    case Enum$DriverRechargeTransactionType.OrderFee:
      return r'OrderFee';
    case Enum$DriverRechargeTransactionType.$unknown:
      return r'$unknown';
  }
}

Enum$DriverRechargeTransactionType fromJson$Enum$DriverRechargeTransactionType(
  String value,
) {
  switch (value) {
    case r'BankTransfer':
      return Enum$DriverRechargeTransactionType.BankTransfer;
    case r'Gift':
      return Enum$DriverRechargeTransactionType.Gift;
    case r'InAppPayment':
      return Enum$DriverRechargeTransactionType.InAppPayment;
    case r'OrderFee':
      return Enum$DriverRechargeTransactionType.OrderFee;
    default:
      return Enum$DriverRechargeTransactionType.$unknown;
  }
}

enum Enum$DriverStatus {
  Blocked,
  HardReject,
  InService,
  Offline,
  Online,
  PendingApproval,
  SoftReject,
  WaitingDocuments,
  $unknown;

  factory Enum$DriverStatus.fromJson(String value) =>
      fromJson$Enum$DriverStatus(value);

  String toJson() => toJson$Enum$DriverStatus(this);
}

String toJson$Enum$DriverStatus(Enum$DriverStatus e) {
  switch (e) {
    case Enum$DriverStatus.Blocked:
      return r'Blocked';
    case Enum$DriverStatus.HardReject:
      return r'HardReject';
    case Enum$DriverStatus.InService:
      return r'InService';
    case Enum$DriverStatus.Offline:
      return r'Offline';
    case Enum$DriverStatus.Online:
      return r'Online';
    case Enum$DriverStatus.PendingApproval:
      return r'PendingApproval';
    case Enum$DriverStatus.SoftReject:
      return r'SoftReject';
    case Enum$DriverStatus.WaitingDocuments:
      return r'WaitingDocuments';
    case Enum$DriverStatus.$unknown:
      return r'$unknown';
  }
}

Enum$DriverStatus fromJson$Enum$DriverStatus(String value) {
  switch (value) {
    case r'Blocked':
      return Enum$DriverStatus.Blocked;
    case r'HardReject':
      return Enum$DriverStatus.HardReject;
    case r'InService':
      return Enum$DriverStatus.InService;
    case r'Offline':
      return Enum$DriverStatus.Offline;
    case r'Online':
      return Enum$DriverStatus.Online;
    case r'PendingApproval':
      return Enum$DriverStatus.PendingApproval;
    case r'SoftReject':
      return Enum$DriverStatus.SoftReject;
    case r'WaitingDocuments':
      return Enum$DriverStatus.WaitingDocuments;
    default:
      return Enum$DriverStatus.$unknown;
  }
}

enum Enum$DriverTransacionSortFields {
  driverId,
  id,
  $unknown;

  factory Enum$DriverTransacionSortFields.fromJson(String value) =>
      fromJson$Enum$DriverTransacionSortFields(value);

  String toJson() => toJson$Enum$DriverTransacionSortFields(this);
}

String toJson$Enum$DriverTransacionSortFields(
  Enum$DriverTransacionSortFields e,
) {
  switch (e) {
    case Enum$DriverTransacionSortFields.driverId:
      return r'driverId';
    case Enum$DriverTransacionSortFields.id:
      return r'id';
    case Enum$DriverTransacionSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$DriverTransacionSortFields fromJson$Enum$DriverTransacionSortFields(
  String value,
) {
  switch (value) {
    case r'driverId':
      return Enum$DriverTransacionSortFields.driverId;
    case r'id':
      return Enum$DriverTransacionSortFields.id;
    default:
      return Enum$DriverTransacionSortFields.$unknown;
  }
}

enum Enum$DriverWalletSortFields {
  driverId,
  id,
  $unknown;

  factory Enum$DriverWalletSortFields.fromJson(String value) =>
      fromJson$Enum$DriverWalletSortFields(value);

  String toJson() => toJson$Enum$DriverWalletSortFields(this);
}

String toJson$Enum$DriverWalletSortFields(Enum$DriverWalletSortFields e) {
  switch (e) {
    case Enum$DriverWalletSortFields.driverId:
      return r'driverId';
    case Enum$DriverWalletSortFields.id:
      return r'id';
    case Enum$DriverWalletSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$DriverWalletSortFields fromJson$Enum$DriverWalletSortFields(String value) {
  switch (value) {
    case r'driverId':
      return Enum$DriverWalletSortFields.driverId;
    case r'id':
      return Enum$DriverWalletSortFields.id;
    default:
      return Enum$DriverWalletSortFields.$unknown;
  }
}

enum Enum$Gender {
  Female,
  Male,
  Unknown,
  $unknown;

  factory Enum$Gender.fromJson(String value) => fromJson$Enum$Gender(value);

  String toJson() => toJson$Enum$Gender(this);
}

String toJson$Enum$Gender(Enum$Gender e) {
  switch (e) {
    case Enum$Gender.Female:
      return r'Female';
    case Enum$Gender.Male:
      return r'Male';
    case Enum$Gender.Unknown:
      return r'Unknown';
    case Enum$Gender.$unknown:
      return r'$unknown';
  }
}

Enum$Gender fromJson$Enum$Gender(String value) {
  switch (value) {
    case r'Female':
      return Enum$Gender.Female;
    case r'Male':
      return Enum$Gender.Male;
    case r'Unknown':
      return Enum$Gender.Unknown;
    default:
      return Enum$Gender.$unknown;
  }
}

enum Enum$GroupBy {
  DAY,
  MONTH,
  WEEK,
  YEAR,
  $unknown;

  factory Enum$GroupBy.fromJson(String value) => fromJson$Enum$GroupBy(value);

  String toJson() => toJson$Enum$GroupBy(this);
}

String toJson$Enum$GroupBy(Enum$GroupBy e) {
  switch (e) {
    case Enum$GroupBy.DAY:
      return r'DAY';
    case Enum$GroupBy.MONTH:
      return r'MONTH';
    case Enum$GroupBy.WEEK:
      return r'WEEK';
    case Enum$GroupBy.YEAR:
      return r'YEAR';
    case Enum$GroupBy.$unknown:
      return r'$unknown';
  }
}

Enum$GroupBy fromJson$Enum$GroupBy(String value) {
  switch (value) {
    case r'DAY':
      return Enum$GroupBy.DAY;
    case r'MONTH':
      return Enum$GroupBy.MONTH;
    case r'WEEK':
      return Enum$GroupBy.WEEK;
    case r'YEAR':
      return Enum$GroupBy.YEAR;
    default:
      return Enum$GroupBy.$unknown;
  }
}

enum Enum$MapTileProvider {
  Google,
  Mapbox,
  OpenStreetMap,
  $unknown;

  factory Enum$MapTileProvider.fromJson(String value) =>
      fromJson$Enum$MapTileProvider(value);

  String toJson() => toJson$Enum$MapTileProvider(this);
}

String toJson$Enum$MapTileProvider(Enum$MapTileProvider e) {
  switch (e) {
    case Enum$MapTileProvider.Google:
      return r'Google';
    case Enum$MapTileProvider.Mapbox:
      return r'Mapbox';
    case Enum$MapTileProvider.OpenStreetMap:
      return r'OpenStreetMap';
    case Enum$MapTileProvider.$unknown:
      return r'$unknown';
  }
}

Enum$MapTileProvider fromJson$Enum$MapTileProvider(String value) {
  switch (value) {
    case r'Google':
      return Enum$MapTileProvider.Google;
    case r'Mapbox':
      return Enum$MapTileProvider.Mapbox;
    case r'OpenStreetMap':
      return Enum$MapTileProvider.OpenStreetMap;
    default:
      return Enum$MapTileProvider.$unknown;
  }
}

enum Enum$MediaSortFields {
  id,
  $unknown;

  factory Enum$MediaSortFields.fromJson(String value) =>
      fromJson$Enum$MediaSortFields(value);

  String toJson() => toJson$Enum$MediaSortFields(this);
}

String toJson$Enum$MediaSortFields(Enum$MediaSortFields e) {
  switch (e) {
    case Enum$MediaSortFields.id:
      return r'id';
    case Enum$MediaSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$MediaSortFields fromJson$Enum$MediaSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$MediaSortFields.id;
    default:
      return Enum$MediaSortFields.$unknown;
  }
}

enum Enum$MessageStatus {
  Delivered,
  Seen,
  Sent,
  $unknown;

  factory Enum$MessageStatus.fromJson(String value) =>
      fromJson$Enum$MessageStatus(value);

  String toJson() => toJson$Enum$MessageStatus(this);
}

String toJson$Enum$MessageStatus(Enum$MessageStatus e) {
  switch (e) {
    case Enum$MessageStatus.Delivered:
      return r'Delivered';
    case Enum$MessageStatus.Seen:
      return r'Seen';
    case Enum$MessageStatus.Sent:
      return r'Sent';
    case Enum$MessageStatus.$unknown:
      return r'$unknown';
  }
}

Enum$MessageStatus fromJson$Enum$MessageStatus(String value) {
  switch (value) {
    case r'Delivered':
      return Enum$MessageStatus.Delivered;
    case r'Seen':
      return Enum$MessageStatus.Seen;
    case r'Sent':
      return Enum$MessageStatus.Sent;
    default:
      return Enum$MessageStatus.$unknown;
  }
}

enum Enum$OrderMessageSortFields {
  id,
  requestId,
  $unknown;

  factory Enum$OrderMessageSortFields.fromJson(String value) =>
      fromJson$Enum$OrderMessageSortFields(value);

  String toJson() => toJson$Enum$OrderMessageSortFields(this);
}

String toJson$Enum$OrderMessageSortFields(Enum$OrderMessageSortFields e) {
  switch (e) {
    case Enum$OrderMessageSortFields.id:
      return r'id';
    case Enum$OrderMessageSortFields.requestId:
      return r'requestId';
    case Enum$OrderMessageSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$OrderMessageSortFields fromJson$Enum$OrderMessageSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$OrderMessageSortFields.id;
    case r'requestId':
      return Enum$OrderMessageSortFields.requestId;
    default:
      return Enum$OrderMessageSortFields.$unknown;
  }
}

enum Enum$OrderSortFields {
  costBest,
  createdOn,
  distanceBest,
  driverId,
  id,
  status,
  $unknown;

  factory Enum$OrderSortFields.fromJson(String value) =>
      fromJson$Enum$OrderSortFields(value);

  String toJson() => toJson$Enum$OrderSortFields(this);
}

String toJson$Enum$OrderSortFields(Enum$OrderSortFields e) {
  switch (e) {
    case Enum$OrderSortFields.costBest:
      return r'costBest';
    case Enum$OrderSortFields.createdOn:
      return r'createdOn';
    case Enum$OrderSortFields.distanceBest:
      return r'distanceBest';
    case Enum$OrderSortFields.driverId:
      return r'driverId';
    case Enum$OrderSortFields.id:
      return r'id';
    case Enum$OrderSortFields.status:
      return r'status';
    case Enum$OrderSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$OrderSortFields fromJson$Enum$OrderSortFields(String value) {
  switch (value) {
    case r'costBest':
      return Enum$OrderSortFields.costBest;
    case r'createdOn':
      return Enum$OrderSortFields.createdOn;
    case r'distanceBest':
      return Enum$OrderSortFields.distanceBest;
    case r'driverId':
      return Enum$OrderSortFields.driverId;
    case r'id':
      return Enum$OrderSortFields.id;
    case r'status':
      return Enum$OrderSortFields.status;
    default:
      return Enum$OrderSortFields.$unknown;
  }
}

enum Enum$OrderStatus {
  Arrived,
  Booked,
  DriverAccepted,
  DriverCanceled,
  Expired,
  Finished,
  Found,
  NoCloseFound,
  NotFound,
  Requested,
  RiderCanceled,
  Started,
  WaitingForPostPay,
  WaitingForPrePay,
  WaitingForReview,
  $unknown;

  factory Enum$OrderStatus.fromJson(String value) =>
      fromJson$Enum$OrderStatus(value);

  String toJson() => toJson$Enum$OrderStatus(this);
}

String toJson$Enum$OrderStatus(Enum$OrderStatus e) {
  switch (e) {
    case Enum$OrderStatus.Arrived:
      return r'Arrived';
    case Enum$OrderStatus.Booked:
      return r'Booked';
    case Enum$OrderStatus.DriverAccepted:
      return r'DriverAccepted';
    case Enum$OrderStatus.DriverCanceled:
      return r'DriverCanceled';
    case Enum$OrderStatus.Expired:
      return r'Expired';
    case Enum$OrderStatus.Finished:
      return r'Finished';
    case Enum$OrderStatus.Found:
      return r'Found';
    case Enum$OrderStatus.NoCloseFound:
      return r'NoCloseFound';
    case Enum$OrderStatus.NotFound:
      return r'NotFound';
    case Enum$OrderStatus.Requested:
      return r'Requested';
    case Enum$OrderStatus.RiderCanceled:
      return r'RiderCanceled';
    case Enum$OrderStatus.Started:
      return r'Started';
    case Enum$OrderStatus.WaitingForPostPay:
      return r'WaitingForPostPay';
    case Enum$OrderStatus.WaitingForPrePay:
      return r'WaitingForPrePay';
    case Enum$OrderStatus.WaitingForReview:
      return r'WaitingForReview';
    case Enum$OrderStatus.$unknown:
      return r'$unknown';
  }
}

Enum$OrderStatus fromJson$Enum$OrderStatus(String value) {
  switch (value) {
    case r'Arrived':
      return Enum$OrderStatus.Arrived;
    case r'Booked':
      return Enum$OrderStatus.Booked;
    case r'DriverAccepted':
      return Enum$OrderStatus.DriverAccepted;
    case r'DriverCanceled':
      return Enum$OrderStatus.DriverCanceled;
    case r'Expired':
      return Enum$OrderStatus.Expired;
    case r'Finished':
      return Enum$OrderStatus.Finished;
    case r'Found':
      return Enum$OrderStatus.Found;
    case r'NoCloseFound':
      return Enum$OrderStatus.NoCloseFound;
    case r'NotFound':
      return Enum$OrderStatus.NotFound;
    case r'Requested':
      return Enum$OrderStatus.Requested;
    case r'RiderCanceled':
      return Enum$OrderStatus.RiderCanceled;
    case r'Started':
      return Enum$OrderStatus.Started;
    case r'WaitingForPostPay':
      return Enum$OrderStatus.WaitingForPostPay;
    case r'WaitingForPrePay':
      return Enum$OrderStatus.WaitingForPrePay;
    case r'WaitingForReview':
      return Enum$OrderStatus.WaitingForReview;
    default:
      return Enum$OrderStatus.$unknown;
  }
}

enum Enum$PackageSize {
  Large,
  Medium,
  Small,
  $unknown;

  factory Enum$PackageSize.fromJson(String value) =>
      fromJson$Enum$PackageSize(value);

  String toJson() => toJson$Enum$PackageSize(this);
}

String toJson$Enum$PackageSize(Enum$PackageSize e) {
  switch (e) {
    case Enum$PackageSize.Large:
      return r'Large';
    case Enum$PackageSize.Medium:
      return r'Medium';
    case Enum$PackageSize.Small:
      return r'Small';
    case Enum$PackageSize.$unknown:
      return r'$unknown';
  }
}

Enum$PackageSize fromJson$Enum$PackageSize(String value) {
  switch (value) {
    case r'Large':
      return Enum$PackageSize.Large;
    case r'Medium':
      return Enum$PackageSize.Medium;
    case r'Small':
      return Enum$PackageSize.Small;
    default:
      return Enum$PackageSize.$unknown;
  }
}

enum Enum$PaymentGatewaySortFields {
  enabled,
  id,
  $unknown;

  factory Enum$PaymentGatewaySortFields.fromJson(String value) =>
      fromJson$Enum$PaymentGatewaySortFields(value);

  String toJson() => toJson$Enum$PaymentGatewaySortFields(this);
}

String toJson$Enum$PaymentGatewaySortFields(Enum$PaymentGatewaySortFields e) {
  switch (e) {
    case Enum$PaymentGatewaySortFields.enabled:
      return r'enabled';
    case Enum$PaymentGatewaySortFields.id:
      return r'id';
    case Enum$PaymentGatewaySortFields.$unknown:
      return r'$unknown';
  }
}

Enum$PaymentGatewaySortFields fromJson$Enum$PaymentGatewaySortFields(
  String value,
) {
  switch (value) {
    case r'enabled':
      return Enum$PaymentGatewaySortFields.enabled;
    case r'id':
      return Enum$PaymentGatewaySortFields.id;
    default:
      return Enum$PaymentGatewaySortFields.$unknown;
  }
}

enum Enum$PaymentGatewayType {
  AmazonPaymentServices,
  BinancePay,
  BrainTree,
  CustomLink,
  Flutterwave,
  Instamojo,
  MIPS,
  MercadoPago,
  MyFatoorah,
  MyTMoney,
  OpenPix,
  PayGate,
  PayPal,
  PayU,
  Paystack,
  Paytm,
  Razorpay,
  SberBank,
  Stripe,
  WayForPay,
  $unknown;

  factory Enum$PaymentGatewayType.fromJson(String value) =>
      fromJson$Enum$PaymentGatewayType(value);

  String toJson() => toJson$Enum$PaymentGatewayType(this);
}

String toJson$Enum$PaymentGatewayType(Enum$PaymentGatewayType e) {
  switch (e) {
    case Enum$PaymentGatewayType.AmazonPaymentServices:
      return r'AmazonPaymentServices';
    case Enum$PaymentGatewayType.BinancePay:
      return r'BinancePay';
    case Enum$PaymentGatewayType.BrainTree:
      return r'BrainTree';
    case Enum$PaymentGatewayType.CustomLink:
      return r'CustomLink';
    case Enum$PaymentGatewayType.Flutterwave:
      return r'Flutterwave';
    case Enum$PaymentGatewayType.Instamojo:
      return r'Instamojo';
    case Enum$PaymentGatewayType.MIPS:
      return r'MIPS';
    case Enum$PaymentGatewayType.MercadoPago:
      return r'MercadoPago';
    case Enum$PaymentGatewayType.MyFatoorah:
      return r'MyFatoorah';
    case Enum$PaymentGatewayType.MyTMoney:
      return r'MyTMoney';
    case Enum$PaymentGatewayType.OpenPix:
      return r'OpenPix';
    case Enum$PaymentGatewayType.PayGate:
      return r'PayGate';
    case Enum$PaymentGatewayType.PayPal:
      return r'PayPal';
    case Enum$PaymentGatewayType.PayU:
      return r'PayU';
    case Enum$PaymentGatewayType.Paystack:
      return r'Paystack';
    case Enum$PaymentGatewayType.Paytm:
      return r'Paytm';
    case Enum$PaymentGatewayType.Razorpay:
      return r'Razorpay';
    case Enum$PaymentGatewayType.SberBank:
      return r'SberBank';
    case Enum$PaymentGatewayType.Stripe:
      return r'Stripe';
    case Enum$PaymentGatewayType.WayForPay:
      return r'WayForPay';
    case Enum$PaymentGatewayType.$unknown:
      return r'$unknown';
  }
}

Enum$PaymentGatewayType fromJson$Enum$PaymentGatewayType(String value) {
  switch (value) {
    case r'AmazonPaymentServices':
      return Enum$PaymentGatewayType.AmazonPaymentServices;
    case r'BinancePay':
      return Enum$PaymentGatewayType.BinancePay;
    case r'BrainTree':
      return Enum$PaymentGatewayType.BrainTree;
    case r'CustomLink':
      return Enum$PaymentGatewayType.CustomLink;
    case r'Flutterwave':
      return Enum$PaymentGatewayType.Flutterwave;
    case r'Instamojo':
      return Enum$PaymentGatewayType.Instamojo;
    case r'MIPS':
      return Enum$PaymentGatewayType.MIPS;
    case r'MercadoPago':
      return Enum$PaymentGatewayType.MercadoPago;
    case r'MyFatoorah':
      return Enum$PaymentGatewayType.MyFatoorah;
    case r'MyTMoney':
      return Enum$PaymentGatewayType.MyTMoney;
    case r'OpenPix':
      return Enum$PaymentGatewayType.OpenPix;
    case r'PayGate':
      return Enum$PaymentGatewayType.PayGate;
    case r'PayPal':
      return Enum$PaymentGatewayType.PayPal;
    case r'PayU':
      return Enum$PaymentGatewayType.PayU;
    case r'Paystack':
      return Enum$PaymentGatewayType.Paystack;
    case r'Paytm':
      return Enum$PaymentGatewayType.Paytm;
    case r'Razorpay':
      return Enum$PaymentGatewayType.Razorpay;
    case r'SberBank':
      return Enum$PaymentGatewayType.SberBank;
    case r'Stripe':
      return Enum$PaymentGatewayType.Stripe;
    case r'WayForPay':
      return Enum$PaymentGatewayType.WayForPay;
    default:
      return Enum$PaymentGatewayType.$unknown;
  }
}

enum Enum$PayoutMethodType {
  BankTransfer,
  Cash,
  OrangeMoney,
  Wave,
  $unknown;

  factory Enum$PayoutMethodType.fromJson(String value) =>
      fromJson$Enum$PayoutMethodType(value);

  String toJson() => toJson$Enum$PayoutMethodType(this);
}

String toJson$Enum$PayoutMethodType(Enum$PayoutMethodType e) {
  switch (e) {
    case Enum$PayoutMethodType.BankTransfer:
      return r'BankTransfer';
    case Enum$PayoutMethodType.Cash:
      return r'Cash';
    case Enum$PayoutMethodType.OrangeMoney:
      return r'OrangeMoney';
    case Enum$PayoutMethodType.Wave:
      return r'Wave';
    case Enum$PayoutMethodType.$unknown:
      return r'$unknown';
  }
}

Enum$PayoutMethodType fromJson$Enum$PayoutMethodType(String value) {
  switch (value) {
    case r'BankTransfer':
      return Enum$PayoutMethodType.BankTransfer;
    case r'Cash':
      return Enum$PayoutMethodType.Cash;
    case r'OrangeMoney':
      return Enum$PayoutMethodType.OrangeMoney;
    case r'Wave':
      return Enum$PayoutMethodType.Wave;
    default:
      return Enum$PayoutMethodType.$unknown;
  }
}

enum Enum$PayoutStatus {
  Canceled,
  Paid,
  Pending,
  $unknown;

  factory Enum$PayoutStatus.fromJson(String value) =>
      fromJson$Enum$PayoutStatus(value);

  String toJson() => toJson$Enum$PayoutStatus(this);
}

String toJson$Enum$PayoutStatus(Enum$PayoutStatus e) {
  switch (e) {
    case Enum$PayoutStatus.Canceled:
      return r'Canceled';
    case Enum$PayoutStatus.Paid:
      return r'Paid';
    case Enum$PayoutStatus.Pending:
      return r'Pending';
    case Enum$PayoutStatus.$unknown:
      return r'$unknown';
  }
}

Enum$PayoutStatus fromJson$Enum$PayoutStatus(String value) {
  switch (value) {
    case r'Canceled':
      return Enum$PayoutStatus.Canceled;
    case r'Paid':
      return Enum$PayoutStatus.Paid;
    case r'Pending':
      return Enum$PayoutStatus.Pending;
    default:
      return Enum$PayoutStatus.$unknown;
  }
}

enum Enum$RiderWalletSortFields {
  id,
  riderId,
  $unknown;

  factory Enum$RiderWalletSortFields.fromJson(String value) =>
      fromJson$Enum$RiderWalletSortFields(value);

  String toJson() => toJson$Enum$RiderWalletSortFields(this);
}

String toJson$Enum$RiderWalletSortFields(Enum$RiderWalletSortFields e) {
  switch (e) {
    case Enum$RiderWalletSortFields.id:
      return r'id';
    case Enum$RiderWalletSortFields.riderId:
      return r'riderId';
    case Enum$RiderWalletSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$RiderWalletSortFields fromJson$Enum$RiderWalletSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$RiderWalletSortFields.id;
    case r'riderId':
      return Enum$RiderWalletSortFields.riderId;
    default:
      return Enum$RiderWalletSortFields.$unknown;
  }
}

enum Enum$ServiceOptionIcon {
  Custom1,
  Custom2,
  Custom3,
  Custom4,
  Custom5,
  Luggage,
  PackageDelivery,
  Pet,
  Shopping,
  TwoWay,
  $unknown;

  factory Enum$ServiceOptionIcon.fromJson(String value) =>
      fromJson$Enum$ServiceOptionIcon(value);

  String toJson() => toJson$Enum$ServiceOptionIcon(this);
}

String toJson$Enum$ServiceOptionIcon(Enum$ServiceOptionIcon e) {
  switch (e) {
    case Enum$ServiceOptionIcon.Custom1:
      return r'Custom1';
    case Enum$ServiceOptionIcon.Custom2:
      return r'Custom2';
    case Enum$ServiceOptionIcon.Custom3:
      return r'Custom3';
    case Enum$ServiceOptionIcon.Custom4:
      return r'Custom4';
    case Enum$ServiceOptionIcon.Custom5:
      return r'Custom5';
    case Enum$ServiceOptionIcon.Luggage:
      return r'Luggage';
    case Enum$ServiceOptionIcon.PackageDelivery:
      return r'PackageDelivery';
    case Enum$ServiceOptionIcon.Pet:
      return r'Pet';
    case Enum$ServiceOptionIcon.Shopping:
      return r'Shopping';
    case Enum$ServiceOptionIcon.TwoWay:
      return r'TwoWay';
    case Enum$ServiceOptionIcon.$unknown:
      return r'$unknown';
  }
}

Enum$ServiceOptionIcon fromJson$Enum$ServiceOptionIcon(String value) {
  switch (value) {
    case r'Custom1':
      return Enum$ServiceOptionIcon.Custom1;
    case r'Custom2':
      return Enum$ServiceOptionIcon.Custom2;
    case r'Custom3':
      return Enum$ServiceOptionIcon.Custom3;
    case r'Custom4':
      return Enum$ServiceOptionIcon.Custom4;
    case r'Custom5':
      return Enum$ServiceOptionIcon.Custom5;
    case r'Luggage':
      return Enum$ServiceOptionIcon.Luggage;
    case r'PackageDelivery':
      return Enum$ServiceOptionIcon.PackageDelivery;
    case r'Pet':
      return Enum$ServiceOptionIcon.Pet;
    case r'Shopping':
      return Enum$ServiceOptionIcon.Shopping;
    case r'TwoWay':
      return Enum$ServiceOptionIcon.TwoWay;
    default:
      return Enum$ServiceOptionIcon.$unknown;
  }
}

enum Enum$ServiceOptionSortFields {
  id,
  $unknown;

  factory Enum$ServiceOptionSortFields.fromJson(String value) =>
      fromJson$Enum$ServiceOptionSortFields(value);

  String toJson() => toJson$Enum$ServiceOptionSortFields(this);
}

String toJson$Enum$ServiceOptionSortFields(Enum$ServiceOptionSortFields e) {
  switch (e) {
    case Enum$ServiceOptionSortFields.id:
      return r'id';
    case Enum$ServiceOptionSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$ServiceOptionSortFields fromJson$Enum$ServiceOptionSortFields(
  String value,
) {
  switch (value) {
    case r'id':
      return Enum$ServiceOptionSortFields.id;
    default:
      return Enum$ServiceOptionSortFields.$unknown;
  }
}

enum Enum$ServiceOptionType {
  Free,
  Paid,
  TwoWay,
  $unknown;

  factory Enum$ServiceOptionType.fromJson(String value) =>
      fromJson$Enum$ServiceOptionType(value);

  String toJson() => toJson$Enum$ServiceOptionType(this);
}

String toJson$Enum$ServiceOptionType(Enum$ServiceOptionType e) {
  switch (e) {
    case Enum$ServiceOptionType.Free:
      return r'Free';
    case Enum$ServiceOptionType.Paid:
      return r'Paid';
    case Enum$ServiceOptionType.TwoWay:
      return r'TwoWay';
    case Enum$ServiceOptionType.$unknown:
      return r'$unknown';
  }
}

Enum$ServiceOptionType fromJson$Enum$ServiceOptionType(String value) {
  switch (value) {
    case r'Free':
      return Enum$ServiceOptionType.Free;
    case r'Paid':
      return Enum$ServiceOptionType.Paid;
    case r'TwoWay':
      return Enum$ServiceOptionType.TwoWay;
    default:
      return Enum$ServiceOptionType.$unknown;
  }
}

enum Enum$ServiceOrderType {
  Delivery,
  Ride,
  $unknown;

  factory Enum$ServiceOrderType.fromJson(String value) =>
      fromJson$Enum$ServiceOrderType(value);

  String toJson() => toJson$Enum$ServiceOrderType(this);
}

String toJson$Enum$ServiceOrderType(Enum$ServiceOrderType e) {
  switch (e) {
    case Enum$ServiceOrderType.Delivery:
      return r'Delivery';
    case Enum$ServiceOrderType.Ride:
      return r'Ride';
    case Enum$ServiceOrderType.$unknown:
      return r'$unknown';
  }
}

Enum$ServiceOrderType fromJson$Enum$ServiceOrderType(String value) {
  switch (value) {
    case r'Delivery':
      return Enum$ServiceOrderType.Delivery;
    case r'Ride':
      return Enum$ServiceOrderType.Ride;
    default:
      return Enum$ServiceOrderType.$unknown;
  }
}

enum Enum$ServicePaymentMethod {
  CashCredit,
  OnlyCash,
  OnlyCredit,
  $unknown;

  factory Enum$ServicePaymentMethod.fromJson(String value) =>
      fromJson$Enum$ServicePaymentMethod(value);

  String toJson() => toJson$Enum$ServicePaymentMethod(this);
}

String toJson$Enum$ServicePaymentMethod(Enum$ServicePaymentMethod e) {
  switch (e) {
    case Enum$ServicePaymentMethod.CashCredit:
      return r'CashCredit';
    case Enum$ServicePaymentMethod.OnlyCash:
      return r'OnlyCash';
    case Enum$ServicePaymentMethod.OnlyCredit:
      return r'OnlyCredit';
    case Enum$ServicePaymentMethod.$unknown:
      return r'$unknown';
  }
}

Enum$ServicePaymentMethod fromJson$Enum$ServicePaymentMethod(String value) {
  switch (value) {
    case r'CashCredit':
      return Enum$ServicePaymentMethod.CashCredit;
    case r'OnlyCash':
      return Enum$ServicePaymentMethod.OnlyCash;
    case r'OnlyCredit':
      return Enum$ServicePaymentMethod.OnlyCredit;
    default:
      return Enum$ServicePaymentMethod.$unknown;
  }
}

enum Enum$ServiceSortFields {
  id,
  $unknown;

  factory Enum$ServiceSortFields.fromJson(String value) =>
      fromJson$Enum$ServiceSortFields(value);

  String toJson() => toJson$Enum$ServiceSortFields(this);
}

String toJson$Enum$ServiceSortFields(Enum$ServiceSortFields e) {
  switch (e) {
    case Enum$ServiceSortFields.id:
      return r'id';
    case Enum$ServiceSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$ServiceSortFields fromJson$Enum$ServiceSortFields(String value) {
  switch (value) {
    case r'id':
      return Enum$ServiceSortFields.id;
    default:
      return Enum$ServiceSortFields.$unknown;
  }
}

enum Enum$ShiftRuleFrequency {
  Daily,
  Weekly,
  $unknown;

  factory Enum$ShiftRuleFrequency.fromJson(String value) =>
      fromJson$Enum$ShiftRuleFrequency(value);

  String toJson() => toJson$Enum$ShiftRuleFrequency(this);
}

String toJson$Enum$ShiftRuleFrequency(Enum$ShiftRuleFrequency e) {
  switch (e) {
    case Enum$ShiftRuleFrequency.Daily:
      return r'Daily';
    case Enum$ShiftRuleFrequency.Weekly:
      return r'Weekly';
    case Enum$ShiftRuleFrequency.$unknown:
      return r'$unknown';
  }
}

Enum$ShiftRuleFrequency fromJson$Enum$ShiftRuleFrequency(String value) {
  switch (value) {
    case r'Daily':
      return Enum$ShiftRuleFrequency.Daily;
    case r'Weekly':
      return Enum$ShiftRuleFrequency.Weekly;
    default:
      return Enum$ShiftRuleFrequency.$unknown;
  }
}

enum Enum$ShiftRuleSortFields {
  enabled,
  frequency,
  id,
  mandatoryBreakMinutes,
  maxHoursPerPeriod,
  $unknown;

  factory Enum$ShiftRuleSortFields.fromJson(String value) =>
      fromJson$Enum$ShiftRuleSortFields(value);

  String toJson() => toJson$Enum$ShiftRuleSortFields(this);
}

String toJson$Enum$ShiftRuleSortFields(Enum$ShiftRuleSortFields e) {
  switch (e) {
    case Enum$ShiftRuleSortFields.enabled:
      return r'enabled';
    case Enum$ShiftRuleSortFields.frequency:
      return r'frequency';
    case Enum$ShiftRuleSortFields.id:
      return r'id';
    case Enum$ShiftRuleSortFields.mandatoryBreakMinutes:
      return r'mandatoryBreakMinutes';
    case Enum$ShiftRuleSortFields.maxHoursPerPeriod:
      return r'maxHoursPerPeriod';
    case Enum$ShiftRuleSortFields.$unknown:
      return r'$unknown';
  }
}

Enum$ShiftRuleSortFields fromJson$Enum$ShiftRuleSortFields(String value) {
  switch (value) {
    case r'enabled':
      return Enum$ShiftRuleSortFields.enabled;
    case r'frequency':
      return Enum$ShiftRuleSortFields.frequency;
    case r'id':
      return Enum$ShiftRuleSortFields.id;
    case r'mandatoryBreakMinutes':
      return Enum$ShiftRuleSortFields.mandatoryBreakMinutes;
    case r'maxHoursPerPeriod':
      return Enum$ShiftRuleSortFields.maxHoursPerPeriod;
    default:
      return Enum$ShiftRuleSortFields.$unknown;
  }
}

enum Enum$SortDirection {
  ASC,
  DESC,
  $unknown;

  factory Enum$SortDirection.fromJson(String value) =>
      fromJson$Enum$SortDirection(value);

  String toJson() => toJson$Enum$SortDirection(this);
}

String toJson$Enum$SortDirection(Enum$SortDirection e) {
  switch (e) {
    case Enum$SortDirection.ASC:
      return r'ASC';
    case Enum$SortDirection.DESC:
      return r'DESC';
    case Enum$SortDirection.$unknown:
      return r'$unknown';
  }
}

Enum$SortDirection fromJson$Enum$SortDirection(String value) {
  switch (value) {
    case r'ASC':
      return Enum$SortDirection.ASC;
    case r'DESC':
      return Enum$SortDirection.DESC;
    default:
      return Enum$SortDirection.$unknown;
  }
}

enum Enum$SortNulls {
  NULLS_FIRST,
  NULLS_LAST,
  $unknown;

  factory Enum$SortNulls.fromJson(String value) =>
      fromJson$Enum$SortNulls(value);

  String toJson() => toJson$Enum$SortNulls(this);
}

String toJson$Enum$SortNulls(Enum$SortNulls e) {
  switch (e) {
    case Enum$SortNulls.NULLS_FIRST:
      return r'NULLS_FIRST';
    case Enum$SortNulls.NULLS_LAST:
      return r'NULLS_LAST';
    case Enum$SortNulls.$unknown:
      return r'$unknown';
  }
}

Enum$SortNulls fromJson$Enum$SortNulls(String value) {
  switch (value) {
    case r'NULLS_FIRST':
      return Enum$SortNulls.NULLS_FIRST;
    case r'NULLS_LAST':
      return Enum$SortNulls.NULLS_LAST;
    default:
      return Enum$SortNulls.$unknown;
  }
}

enum Enum$TimeQuery {
  Daily,
  Monthly,
  Weekly,
  $unknown;

  factory Enum$TimeQuery.fromJson(String value) =>
      fromJson$Enum$TimeQuery(value);

  String toJson() => toJson$Enum$TimeQuery(this);
}

String toJson$Enum$TimeQuery(Enum$TimeQuery e) {
  switch (e) {
    case Enum$TimeQuery.Daily:
      return r'Daily';
    case Enum$TimeQuery.Monthly:
      return r'Monthly';
    case Enum$TimeQuery.Weekly:
      return r'Weekly';
    case Enum$TimeQuery.$unknown:
      return r'$unknown';
  }
}

Enum$TimeQuery fromJson$Enum$TimeQuery(String value) {
  switch (value) {
    case r'Daily':
      return Enum$TimeQuery.Daily;
    case r'Monthly':
      return Enum$TimeQuery.Monthly;
    case r'Weekly':
      return Enum$TimeQuery.Weekly;
    default:
      return Enum$TimeQuery.$unknown;
  }
}

enum Enum$TopUpWalletStatus {
  OK,
  Redirect,
  $unknown;

  factory Enum$TopUpWalletStatus.fromJson(String value) =>
      fromJson$Enum$TopUpWalletStatus(value);

  String toJson() => toJson$Enum$TopUpWalletStatus(this);
}

String toJson$Enum$TopUpWalletStatus(Enum$TopUpWalletStatus e) {
  switch (e) {
    case Enum$TopUpWalletStatus.OK:
      return r'OK';
    case Enum$TopUpWalletStatus.Redirect:
      return r'Redirect';
    case Enum$TopUpWalletStatus.$unknown:
      return r'$unknown';
  }
}

Enum$TopUpWalletStatus fromJson$Enum$TopUpWalletStatus(String value) {
  switch (value) {
    case r'OK':
      return Enum$TopUpWalletStatus.OK;
    case r'Redirect':
      return Enum$TopUpWalletStatus.Redirect;
    default:
      return Enum$TopUpWalletStatus.$unknown;
  }
}

enum Enum$TransactionAction {
  Deduct,
  Recharge,
  $unknown;

  factory Enum$TransactionAction.fromJson(String value) =>
      fromJson$Enum$TransactionAction(value);

  String toJson() => toJson$Enum$TransactionAction(this);
}

String toJson$Enum$TransactionAction(Enum$TransactionAction e) {
  switch (e) {
    case Enum$TransactionAction.Deduct:
      return r'Deduct';
    case Enum$TransactionAction.Recharge:
      return r'Recharge';
    case Enum$TransactionAction.$unknown:
      return r'$unknown';
  }
}

Enum$TransactionAction fromJson$Enum$TransactionAction(String value) {
  switch (value) {
    case r'Deduct':
      return Enum$TransactionAction.Deduct;
    case r'Recharge':
      return Enum$TransactionAction.Recharge;
    default:
      return Enum$TransactionAction.$unknown;
  }
}

enum Enum$VersionStatus {
  Latest,
  MandatoryUpdate,
  OptionalUpdate,
  $unknown;

  factory Enum$VersionStatus.fromJson(String value) =>
      fromJson$Enum$VersionStatus(value);

  String toJson() => toJson$Enum$VersionStatus(this);
}

String toJson$Enum$VersionStatus(Enum$VersionStatus e) {
  switch (e) {
    case Enum$VersionStatus.Latest:
      return r'Latest';
    case Enum$VersionStatus.MandatoryUpdate:
      return r'MandatoryUpdate';
    case Enum$VersionStatus.OptionalUpdate:
      return r'OptionalUpdate';
    case Enum$VersionStatus.$unknown:
      return r'$unknown';
  }
}

Enum$VersionStatus fromJson$Enum$VersionStatus(String value) {
  switch (value) {
    case r'Latest':
      return Enum$VersionStatus.Latest;
    case r'MandatoryUpdate':
      return Enum$VersionStatus.MandatoryUpdate;
    case r'OptionalUpdate':
      return Enum$VersionStatus.OptionalUpdate;
    default:
      return Enum$VersionStatus.$unknown;
  }
}

enum Enum$__TypeKind {
  SCALAR,
  OBJECT,
  INTERFACE,
  UNION,
  ENUM,
  INPUT_OBJECT,
  LIST,
  NON_NULL,
  $unknown;

  factory Enum$__TypeKind.fromJson(String value) =>
      fromJson$Enum$__TypeKind(value);

  String toJson() => toJson$Enum$__TypeKind(this);
}

String toJson$Enum$__TypeKind(Enum$__TypeKind e) {
  switch (e) {
    case Enum$__TypeKind.SCALAR:
      return r'SCALAR';
    case Enum$__TypeKind.OBJECT:
      return r'OBJECT';
    case Enum$__TypeKind.INTERFACE:
      return r'INTERFACE';
    case Enum$__TypeKind.UNION:
      return r'UNION';
    case Enum$__TypeKind.ENUM:
      return r'ENUM';
    case Enum$__TypeKind.INPUT_OBJECT:
      return r'INPUT_OBJECT';
    case Enum$__TypeKind.LIST:
      return r'LIST';
    case Enum$__TypeKind.NON_NULL:
      return r'NON_NULL';
    case Enum$__TypeKind.$unknown:
      return r'$unknown';
  }
}

Enum$__TypeKind fromJson$Enum$__TypeKind(String value) {
  switch (value) {
    case r'SCALAR':
      return Enum$__TypeKind.SCALAR;
    case r'OBJECT':
      return Enum$__TypeKind.OBJECT;
    case r'INTERFACE':
      return Enum$__TypeKind.INTERFACE;
    case r'UNION':
      return Enum$__TypeKind.UNION;
    case r'ENUM':
      return Enum$__TypeKind.ENUM;
    case r'INPUT_OBJECT':
      return Enum$__TypeKind.INPUT_OBJECT;
    case r'LIST':
      return Enum$__TypeKind.LIST;
    case r'NON_NULL':
      return Enum$__TypeKind.NON_NULL;
    default:
      return Enum$__TypeKind.$unknown;
  }
}

enum Enum$__DirectiveLocation {
  QUERY,
  MUTATION,
  SUBSCRIPTION,
  FIELD,
  FRAGMENT_DEFINITION,
  FRAGMENT_SPREAD,
  INLINE_FRAGMENT,
  VARIABLE_DEFINITION,
  SCHEMA,
  SCALAR,
  OBJECT,
  FIELD_DEFINITION,
  ARGUMENT_DEFINITION,
  INTERFACE,
  UNION,
  ENUM,
  ENUM_VALUE,
  INPUT_OBJECT,
  INPUT_FIELD_DEFINITION,
  $unknown;

  factory Enum$__DirectiveLocation.fromJson(String value) =>
      fromJson$Enum$__DirectiveLocation(value);

  String toJson() => toJson$Enum$__DirectiveLocation(this);
}

String toJson$Enum$__DirectiveLocation(Enum$__DirectiveLocation e) {
  switch (e) {
    case Enum$__DirectiveLocation.QUERY:
      return r'QUERY';
    case Enum$__DirectiveLocation.MUTATION:
      return r'MUTATION';
    case Enum$__DirectiveLocation.SUBSCRIPTION:
      return r'SUBSCRIPTION';
    case Enum$__DirectiveLocation.FIELD:
      return r'FIELD';
    case Enum$__DirectiveLocation.FRAGMENT_DEFINITION:
      return r'FRAGMENT_DEFINITION';
    case Enum$__DirectiveLocation.FRAGMENT_SPREAD:
      return r'FRAGMENT_SPREAD';
    case Enum$__DirectiveLocation.INLINE_FRAGMENT:
      return r'INLINE_FRAGMENT';
    case Enum$__DirectiveLocation.VARIABLE_DEFINITION:
      return r'VARIABLE_DEFINITION';
    case Enum$__DirectiveLocation.SCHEMA:
      return r'SCHEMA';
    case Enum$__DirectiveLocation.SCALAR:
      return r'SCALAR';
    case Enum$__DirectiveLocation.OBJECT:
      return r'OBJECT';
    case Enum$__DirectiveLocation.FIELD_DEFINITION:
      return r'FIELD_DEFINITION';
    case Enum$__DirectiveLocation.ARGUMENT_DEFINITION:
      return r'ARGUMENT_DEFINITION';
    case Enum$__DirectiveLocation.INTERFACE:
      return r'INTERFACE';
    case Enum$__DirectiveLocation.UNION:
      return r'UNION';
    case Enum$__DirectiveLocation.ENUM:
      return r'ENUM';
    case Enum$__DirectiveLocation.ENUM_VALUE:
      return r'ENUM_VALUE';
    case Enum$__DirectiveLocation.INPUT_OBJECT:
      return r'INPUT_OBJECT';
    case Enum$__DirectiveLocation.INPUT_FIELD_DEFINITION:
      return r'INPUT_FIELD_DEFINITION';
    case Enum$__DirectiveLocation.$unknown:
      return r'$unknown';
  }
}

Enum$__DirectiveLocation fromJson$Enum$__DirectiveLocation(String value) {
  switch (value) {
    case r'QUERY':
      return Enum$__DirectiveLocation.QUERY;
    case r'MUTATION':
      return Enum$__DirectiveLocation.MUTATION;
    case r'SUBSCRIPTION':
      return Enum$__DirectiveLocation.SUBSCRIPTION;
    case r'FIELD':
      return Enum$__DirectiveLocation.FIELD;
    case r'FRAGMENT_DEFINITION':
      return Enum$__DirectiveLocation.FRAGMENT_DEFINITION;
    case r'FRAGMENT_SPREAD':
      return Enum$__DirectiveLocation.FRAGMENT_SPREAD;
    case r'INLINE_FRAGMENT':
      return Enum$__DirectiveLocation.INLINE_FRAGMENT;
    case r'VARIABLE_DEFINITION':
      return Enum$__DirectiveLocation.VARIABLE_DEFINITION;
    case r'SCHEMA':
      return Enum$__DirectiveLocation.SCHEMA;
    case r'SCALAR':
      return Enum$__DirectiveLocation.SCALAR;
    case r'OBJECT':
      return Enum$__DirectiveLocation.OBJECT;
    case r'FIELD_DEFINITION':
      return Enum$__DirectiveLocation.FIELD_DEFINITION;
    case r'ARGUMENT_DEFINITION':
      return Enum$__DirectiveLocation.ARGUMENT_DEFINITION;
    case r'INTERFACE':
      return Enum$__DirectiveLocation.INTERFACE;
    case r'UNION':
      return Enum$__DirectiveLocation.UNION;
    case r'ENUM':
      return Enum$__DirectiveLocation.ENUM;
    case r'ENUM_VALUE':
      return Enum$__DirectiveLocation.ENUM_VALUE;
    case r'INPUT_OBJECT':
      return Enum$__DirectiveLocation.INPUT_OBJECT;
    case r'INPUT_FIELD_DEFINITION':
      return Enum$__DirectiveLocation.INPUT_FIELD_DEFINITION;
    default:
      return Enum$__DirectiveLocation.$unknown;
  }
}

const possibleTypesMap = <String, Set<String>>{};
