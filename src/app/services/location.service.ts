import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private base = '/province-api/api/v1';

  constructor(private http: HttpClient) {}

  getCities(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/p/`);
  }

  getDistricts(cityCode: number): Observable<any> {
    return this.http.get<any>(`${this.base}/p/${cityCode}?depth=2`);
  }

  getWards(districtCode: number): Observable<any> {
    return this.http.get<any>(`${this.base}/d/${districtCode}?depth=2`);
  }
}
