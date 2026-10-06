export type AuthMode = 'login' | 'register';

export interface AuthCredentials {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  verified: boolean;
}
