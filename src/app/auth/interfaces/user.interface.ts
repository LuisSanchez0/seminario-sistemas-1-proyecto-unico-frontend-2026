
export interface User {
  email:  string;
  role:   string;
  name:   string;
  state:  boolean;
  google: boolean;
  isAuthenticated: boolean;
  uid:    string;
}

export interface Imagenes {
  key: string;
  url: string;
}
