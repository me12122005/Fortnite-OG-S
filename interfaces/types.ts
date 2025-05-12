export interface User{
    name: string;
    email: string;
    password: string;
    favorite: Favorite[];
    blacklist: Blacklist[];
}

export interface Blacklist{
  name:string;
  notes:string;
}

export interface Favorite{
    name:string;
    score:number;
}