import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FavouriteService {
  private savedIds$ = new BehaviorSubject<Set<number>>(new Set());

  savedIds = this.savedIds$.asObservable();

  constructor(private http: HttpClient) {}

  /** Load all saved roomIds for the current user into the BehaviorSubject */
  loadSavedIds(): void {
    this.http.get<any>(`${environment.apiUrl}/favourites/ids`).subscribe({
      next: (res) => {
        const ids: number[] = res?.data ?? [];
        this.savedIds$.next(new Set(ids));
      },
      error: () => {
        // Not authenticated — clear
        this.savedIds$.next(new Set());
      },
    });
  }

  /** Returns current snapshot without subscribing */
  isSaved(roomId: number): boolean {
    return this.savedIds$.getValue().has(roomId);
  }

  /**
   * Toggle save/unsave — updates the local BehaviorSubject immediately (optimistic)
   * then confirms with the server.
   */
  toggle(roomId: number): Observable<any> {
    // Optimistic update
    const current = new Set(this.savedIds$.getValue());
    if (current.has(roomId)) {
      current.delete(roomId);
    } else {
      current.add(roomId);
    }
    this.savedIds$.next(current);

    return this.http.post<any>(`${environment.apiUrl}/favourites/${roomId}/toggle`, {}).pipe(
      tap({
        next: (res) => {
          // Sync with server truth
          const saved: boolean = res?.data?.saved ?? false;
          const synced = new Set(this.savedIds$.getValue());
          if (saved) {
            synced.add(roomId);
          } else {
            synced.delete(roomId);
          }
          this.savedIds$.next(synced);
        },
        error: () => {
          // Revert optimistic update on error
          const reverted = new Set(this.savedIds$.getValue());
          if (reverted.has(roomId)) {
            reverted.delete(roomId);
          } else {
            reverted.add(roomId);
          }
          this.savedIds$.next(reverted);
        },
      }),
    );
  }

  /** Get paginated favourites list */
  getMyFavourites(page = 0, size = 12): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/favourites`, {
      params: { page: page.toString(), size: size.toString() },
    });
  }
}
