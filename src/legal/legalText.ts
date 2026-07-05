export type LegalDocumentType = 'privacy' | 'terms';

export const SUPPORT_EMAIL = 'info.pawcult@gmail.com';

export const legalDocuments: Record<
  LegalDocumentType,
  { title: string; body: string }
> = {
  privacy: {
    title: 'Privacy Policy',
    body: `Last updated: July 5, 2026

PawCult helps pet owners create pet profiles, connect with friends, share pet ownership, submit dog parks, and check pets in at dog parks.

Information we collect:
- Account information, including your email address and authentication identifiers.
- Pet profile information you add, including pet name, breed or mix, bio, and optional pet profile photos.
- Social information, including friend requests, accepted friendships, shared pet owner invites, invite email addresses, reports, and blocks.
- Dog park information, including submitted park names, coordinates, favorites, and check-in start/end/check-out times.
- Support and moderation information you send to us, including report reasons and notes.

How information is used:
- To create and secure your account.
- To show your pet profiles, friends, shared pets, dog parks, favorites, and check-ins.
- To send and accept friend or shared-owner requests.
- To review reports, enforce our rules, and respond to support requests.

Visibility:
- Pet photos are stored with public URLs. Anyone with a valid photo URL may be able to view that photo.
- Active or scheduled dog park check-ins may show pet name, breed, bio, and pet photo to other signed-in PawCult users who can view that park check-in.
- Your email/display name is shown to your friends, shared pet owners, and users involved in requests or invites.
- Reports are visible to PawCult moderators.

Service providers:
PawCult uses Supabase for authentication, database, storage, and backend functions. Your device platform may provide map and email-composer functionality.

Account deletion:
You can delete your account from Settings. Deleting your account removes your Supabase Auth account and cascades app data tied to your user ID where supported. Pet photos stored in your user photo folder are also removed.

Contact:
For privacy or support questions, contact ${SUPPORT_EMAIL}.`,
  },
  terms: {
    title: 'Terms of Service',
    body: `Last updated: July 5, 2026

By using PawCult, you agree to use the app responsibly and follow these terms.

Accounts:
You are responsible for your account and for keeping your login information secure. You may delete your account from Settings.

User content:
You are responsible for pet profiles, photos, bios, dog park submissions, check-ins, reports, and other content you submit. Do not submit unlawful, abusive, misleading, harassing, hateful, private, or infringing content.

Moderation:
PawCult may review reports, remove content, reject dog park submissions, restrict accounts, or take other action to protect users and the service.

Dog parks and check-ins:
Dog park listings and check-ins are social and informational. PawCult does not guarantee that a park exists, is open, safe, suitable, or supervised. You are responsible for your pet and your interactions with others.

Friends and shared pets:
Only send friend or shared-pet invitations to people you know or have permission to contact. You may block users or report concerns.

Support:
For support, moderation, or legal questions, contact ${SUPPORT_EMAIL}.`,
  },
};
