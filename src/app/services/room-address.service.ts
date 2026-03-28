import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Khớp với RoomAddressResponse.java */
export interface RoomAddressResponse {
  room_address_id: number;
  street_address: string;
  city_name: string;
  district_name: string;
  ward_name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

/** Dùng khi tạo / cập nhật phòng – khớp với CreateRoomRequest.java */
export interface RoomAddressPayload {
  streetAddress: string;
  cityName: string;
  districtName: string;
  wardName: string;
  latitude?: number | null;
  longitude?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RoomAddressService {
  constructor(private http: HttpClient) {}

  /** Lấy địa chỉ của 1 phòng */
  getByRoom(roomId: number): Observable<RoomAddressResponse> {
    return this.http.get<RoomAddressResponse>(`${environment.apiUrl}/rooms/${roomId}/address`);
  }
}
