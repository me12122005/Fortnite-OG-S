import { ObjectId } from "mongodb";

export interface Favorite {
  id: string;
  image: string;
  weapon: string;
  emote: string;
}

export interface Blacklist {
  name: string;
  note: string;
}

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  favorite: Favorite[];
  blacklist?: Blacklist[];
}
