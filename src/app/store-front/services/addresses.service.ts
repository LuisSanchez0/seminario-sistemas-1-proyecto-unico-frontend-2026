import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Address,
  AddressesResponse,
  AddressResponse,
  CreateAddressPayload,
  UpdateAddressPayload,
} from '../interfaces/addresses.interface';

const baseUrl = environment.baseUrl;

@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly http = inject(HttpClient);

  getAddresses(): Observable<Address[]> {
    return this.http
      .get<AddressesResponse>(`${baseUrl}/address`)
      .pipe(map((res) => res.addresses));
  }

  getAddressById(id: string): Observable<Address> {
    return this.http
      .get<AddressResponse>(`${baseUrl}/address/${id}`)
      .pipe(map((res) => res.address));
  }

  createAddress(payload: CreateAddressPayload): Observable<Address> {
    return this.http
      .post<AddressResponse>(`${baseUrl}/address`, payload)
      .pipe(map((res) => res.address));
  }

  updateAddress(id: string, payload: UpdateAddressPayload): Observable<Address> {
    return this.http
      .patch<AddressResponse>(`${baseUrl}/address/${id}`, payload)
      .pipe(map((res) => res.address));
  }

  deleteAddress(id: string): Observable<void> {
    return this.http
      .put<void>(`${baseUrl}/address/delete/${id}`, {});
  }
}
