import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AddressRequest {
  streetAddress: string;
  cityName: string;
  districtName: string;
  wardName: string;
}

export interface AddressResponse {
  address_id: number;
  street_address: string;
  city_name: string;
  district_name: string;
  ward_name: string;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly baseUrl = `${environment.apiUrl}/v1/users/me/address`;

  constructor(private http: HttpClient) {}

  getAddress(): Observable<AddressResponse> {
    return this.http.get<AddressResponse>(this.baseUrl);
  }

  upsertAddress(payload: AddressRequest): Observable<AddressResponse> {
    return this.http.put<AddressResponse>(this.baseUrl, payload);
  }

  deleteAddress(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }
}
