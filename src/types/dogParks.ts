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
