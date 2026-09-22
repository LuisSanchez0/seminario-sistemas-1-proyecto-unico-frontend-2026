import { User } from './user.interface';

export interface AuthResponse {
  user:  User;
  token: string;
  ok:    boolean;
  error?: Error;
}

export interface Error{
  msg: string;
  ok: boolean
}


