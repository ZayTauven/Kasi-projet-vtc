import 'package:client_shared/components/kasi_banner.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_vector_icons/flutter_vector_icons.dart';
import 'package:client_shared/components/back_button.dart';
import 'package:client_shared/components/user_avatar_view.dart';
import 'package:kasi_rider/l10n/messages.dart';
import 'package:client_shared/theme/theme.dart';
import 'package:kasi_rider/profile/profile.graphql.dart';
import 'package:kasi_rider/schema.gql.dart';
import '../config.dart';
import '../main/bloc/jwt_cubit.dart';
import '../main/bloc/rider_profile_cubit.dart';
import '../query_result_view.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:kasi_rider/session_token.dart';

class ProfileView extends StatefulWidget {
  const ProfileView({Key? key}) : super(key: key);

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  String? firstName;
  String? lastName;
  String? email;
  Enum$Gender? gender;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: SafeArea(
            child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Query$GetRider$Widget(builder: (result, {refetch, fetchMore}) {
        if (result.hasException || result.isLoading) {
          return Center(child: QueryResultView(result, refetch: refetch));
        }
        final rider = result.parsedData!.rider;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                KasiBackButton(text: S.of(context).action_back),
                const Spacer(),
                PopupMenuButton(itemBuilder: (context) {
                  return [
                    PopupMenuItem(
                      child: Text(S.of(context).action_delete_account),
                      onTap: () {
                        Future.delayed(
                            const Duration(seconds: 0),
                            () => showDialog(
                                context: context,
                                builder: (BuildContext ncontext) {
                                  return AlertDialog(
                                    title: Text(S
                                        .of(context)
                                        .message_delete_account_title),
                                    content: Text(S
                                        .of(context)
                                        .message_delete_account_body),
                                    actions: [
                                      Row(
                                        children: [
                                          Padding(
                                            padding:
                                                const EdgeInsets.only(left: 8),
                                            child: Mutation$DeleteUser$Widget(
                                                options:
                                                    WidgetOptions$Mutation$DeleteUser(
                                                        onCompleted: (result,
                                                            parsedData) {
                                                          // TODO: IMPORTANT - try logout to see if it works without blinking
                                                          context
                                                              .read<
                                                                  RiderProfileCubit>()
                                                              .updateProfile(
                                                                  null);
                                                          context
                                                              .read<JWTCubit>()
                                                              .logOut();

                                                          context
                                                              .read<JWTCubit>()
                                                              .logOut();
                                                          Navigator.popUntil(
                                                              context,
                                                              (route) => route
                                                                  .isFirst);
                                                        },
                                                        onError: (error) =>
                                                            showOperationErrorMessage(
                                                                context,
                                                                error)),
                                                builder: (runMutation, result) {
                                                  return TextButton(
                                                      onPressed: () async {
                                                        runMutation();
                                                        context
                                                            .read<
                                                                RiderProfileCubit>()
                                                            .updateProfile(
                                                                null);
                                                        // Deconnecte aussi
                                                        // Firebase, qui restait
                                                        // connecte apres une
                                                        // suppression de compte.
                                                        await clearSession();
                                                      },
                                                      child: Text(
                                                        S
                                                            .of(context)
                                                            .action_delete_account,
                                                        textAlign:
                                                            TextAlign.end,
                                                        style: const TextStyle(
                                                            color: Color(
                                                                0xffb20d0e)),
                                                      ));
                                                }),
                                          ),
                                          const Spacer(),
                                          TextButton(
                                              onPressed: () =>
                                                  Navigator.of(context).pop(),
                                              child: Text(
                                                S.of(context).action_cancel,
                                                textAlign: TextAlign.end,
                                              ))
                                        ],
                                      ),
                                    ],
                                  );
                                }));
                      },
                    )
                  ];
                })
              ],
            ),
            SingleChildScrollView(
                child: Column(children: [
              const SizedBox(height: 16),
              Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: UserAvatarView(
                      urlPrefix: serverUrl,
                      url: rider.media?.address,
                      cornerRadius: 10,
                      size: 50,
                    ),
                  ),
                  Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        decoration: BoxDecoration(
                            color: CustomTheme.primaryColors.shade300,
                            borderRadius: BorderRadius.circular(10)),
                        child: Icon(
                          Icons.add,
                          color: CustomTheme.neutralColors.shade500,
                        ),
                      ))
                ],
              ),
              const SizedBox(height: 15),
              Text(
                "+${rider.mobileNumber}",
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              CupertinoButton(
                  minSize: 0,
                  padding:
                      const EdgeInsets.symmetric(vertical: 4, horizontal: 0),
                  child: Text(S.of(context).action_add_photo),
                  onPressed: () async {
                    FilePickerResult? result = await FilePicker.platform
                        .pickFiles(type: FileType.image);

                    if (result != null && result.files.single.path != null) {
                      final uploaded =
                          await uploadFile(result.files.single.path!);
                      if (!context.mounted) return;
                      if (!uploaded) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: KasiBanner(
                          S.of(context).error_upload_failed,
                          type: BannerType.error,
                        )));
                        return;
                      }
                      refetch!();
                    }
                  }),
              Form(
                key: _formKey,
                child: Column(children: [
                  const SizedBox(height: 20),
                  TextFormField(
                    initialValue: rider.firstName,
                    onSaved: (newValue) => firstName = newValue,
                    decoration: InputDecoration(
                        labelText: S.of(context).profile_firstname,
                        fillColor: CustomTheme.primaryColors.shade100),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    initialValue: rider.lastName,
                    onSaved: (newValue) => lastName = newValue,
                    decoration: InputDecoration(
                        fillColor: CustomTheme.primaryColors.shade100,
                        labelText: S.of(context).profile_lastname),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    initialValue: rider.email,
                    onSaved: (newValue) => email = newValue,
                    decoration: InputDecoration(
                        fillColor: CustomTheme.primaryColors.shade100,
                        labelText: S.of(context).profile_email),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<Enum$Gender>(
                      value: rider.gender,
                      onSaved: (newValue) => gender = newValue,
                      decoration: InputDecoration(
                          fillColor: CustomTheme.primaryColors.shade100,
                          labelText: S.of(context).profile_gender),
                      icon: const Icon(Ionicons.chevron_down),
                      items: <DropdownMenuItem<Enum$Gender>>[
                        DropdownMenuItem(
                            value: Enum$Gender.Male,
                            child: Text(S.of(context).enum_gender_male)),
                        DropdownMenuItem(
                            value: Enum$Gender.Female,
                            child: Text(S.of(context).enum_gender_female)),
                        DropdownMenuItem(
                            value: Enum$Gender.$unknown,
                            child: Text(S.of(context).enum_gender_unknown))
                      ],
                      onChanged: (Enum$Gender? value) => gender = value),
                ]),
              ),
            ])),
            const Spacer(),
            Row(
              children: [
                Expanded(
                    child: Mutation$UpdateProfile$Widget(
                        options: WidgetOptions$Mutation$UpdateProfile(
                            onCompleted: (result, parsedData) {
                              const snackBar = SnackBar(
                                  content: KasiBanner(
                                      "Profile information saved",
                                      type: BannerType.success));
                              ScaffoldMessenger.of(context)
                                  .showSnackBar(snackBar);
                              Navigator.pop(context);
                            },
                            onError: (error) =>
                                showOperationErrorMessage(context, error)),
                        builder: (runMutation, result) {
                          return ElevatedButton(
                            child: Text(S.of(context).action_save),
                            onPressed: () {
                              if (_formKey.currentState?.validate() != true) {
                                return;
                              }
                              _formKey.currentState?.save();
                              runMutation(Variables$Mutation$UpdateProfile(
                                  firstName: firstName!,
                                  lastName: lastName!,
                                  email: email,
                                  gender: gender));
                            },
                          );
                        }))
              ],
            )
          ],
        );
      }),
    )));
  }

  /// Envoie la photo de profil.
  ///
  /// Renvoie `true` en cas de succes. La version precedente ignorait
  /// COMPLETEMENT la reponse (`await request.send();` seul, le reste commente) :
  /// un 401, un 413 ou un 500 passaient totalement inapercus, puis le `refetch`
  /// reaffichait l'ancien avatar comme si de rien n'etait.
  Future<bool> uploadFile(String path) async {
    var postUri = Uri.parse("${serverUrl}upload_profile");
    var request = http.MultipartRequest("POST", postUri);
    final authorization = readStoredAuthorizationHeader();
    if (authorization == null) {
      return false;
    }
    request.headers['Authorization'] = authorization;
    request.files.add(await http.MultipartFile.fromPath('file', path));
    final streamedResponse = await request.send();
    return streamedResponse.statusCode >= 200 &&
        streamedResponse.statusCode < 300;
  }
}
