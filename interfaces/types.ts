import { ObjectId } from "mongodb";

export interface Favorite {
  id: string;
  image: string;
}

export interface Blacklist {
  name: string;
}

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  favorite: Favorite[];
  blacklist: string[];
}
