export type MobilePetProfile = {
  id: string;
  userId: string;
  name: string;
  breed: string;
  bio: string | null;
  profilePhotoUri: string | null;
  createdAt: string;
};

export type CreateMobilePetInput = {
  name: string;
  breed: string;
  bio: string;
  profilePhotoUri: string | null;
  profilePhotoBase64: string | null;
  profilePhotoMimeType: string | null;
};
