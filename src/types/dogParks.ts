export type DogParkStatus = 'pending' | 'approved' | 'rejected';

export type MobileDogPark = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: DogParkStatus;
  createdBy: string;
  createdAt: string;
};

export type CreateDogParkInput = {
  name: string;
  latitude: number;
  longitude: number;
};

export type MobileDogParkFavorite = {
  dogParkId: string;
  createdAt: string;
};

export type MobileDogParkCheckInPet = {
  id: string;
  name: string;
  breed: string;
  bio: string | null;
  profilePhotoUri: string | null;
};

export type MobileDogParkCheckIn = {
  id: string;
  dogParkId: string;
  userId: string;
  petId: string;
  startsAt: string;
  endsAt: string;
  checkedOutAt: string | null;
  createdAt: string;
  pet: MobileDogParkCheckInPet | null;
};

export type CreateDogParkCheckInInput = {
  dogParkId: string;
  petIds: string[];
  startsAt: Date;
  endsAt: Date;
};
