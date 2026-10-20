/**
 * bug-push-anglais (p2-vehicules, 2026-10-20) : textes des notifications push,
 * en francais, envoyes tels quels par le serveur.
 *
 * Avant : le serveur n'envoyait que des cles (`titleLocKey`), resolues par les
 * `strings.xml` des apps, en anglais seulement (« Started / The trip has
 * begun »). Les apps deja installees ne se mettent pas a jour seules : seul un
 * texte envoye par le serveur corrige leur affichage. Les cles ne sont plus
 * envoyees (Android prefere la cle au texte quand les deux sont presents).
 */
export interface PushText {
  title: string;
  body: string;
}

export const DRIVER_PUSH = {
  newRequest: { title: 'Nouvelle demande', body: 'Une nouvelle demande est disponible près de vous.' },
  newMessageTitle: 'Nouveau message',
  canceled: { title: 'Course annulée', body: 'La course a été annulée.' },
  paid: { title: 'Course payée', body: 'Le paiement de la course est réglé.' },
  assigned: (time: string, from: string, to: string): PushText => ({
    title: 'Réservation attribuée',
    body: `Une course réservée vous est attribuée (${time}). Départ : ${from}, arrivée : ${to}.`,
  }),
  upcomingBooking: { title: 'Course à venir', body: 'Vous avez une course réservée dans moins de 10 minutes.' },
} as const;

export const RIDER_PUSH = {
  newMessageTitle: 'Nouveau message',
  canceled: { title: 'Course annulée', body: 'Votre course a été annulée. Vous pouvez en commander une nouvelle.' },
  accepted: { title: 'Kasiman trouvé', body: 'Votre Kasiman est en route vers vous.' },
  bookingAssigned: (time: string): PushText => ({
    title: 'Réservation confirmée',
    body: `Votre course du ${time} est confirmée : un Kasiman vous est attribué.`,
  }),
  arrived: { title: 'Votre Kasiman est arrivé', body: 'Il vous attend au point de départ.' },
  started: { title: 'Course commencée', body: 'Votre course a commencé. Bon trajet avec Kasi.' },
  waitingForPostPay: { title: 'Paiement attendu', body: 'La course est terminée. Merci de procéder au paiement.' },
  finished: { title: 'Course terminée', body: "La course est terminée et réglée. Merci d'avoir choisi Kasi." },
} as const;
