export interface Address {
  _id: string;
  department: string;
  municipality: string;
  street?: string;
  full_address: string;
  shipping_cost?: number;
  is_default: boolean;
  state?: boolean;
  phoneNumber: string;
  recipient: string;
}

export interface AddressesResponse {
  ok: boolean;
  addresses: Address[];
}

export interface AddressResponse {
  ok: boolean;
  msg?: string;
  address: Address;
}

export interface CreateAddressPayload {
  department: string;
  municipality: string;
  street?: string;
  full_address: string;
  phoneNumber: string;
  is_default: boolean;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;
