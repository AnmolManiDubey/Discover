export type Profile = {
  id: number;
  name: string;
  age: number;
  photo: string;
  bio: string;
  city: string;
  college: string;
  interests: string[];
};

export type SwipeResult = { matched: boolean; match?: Profile };
