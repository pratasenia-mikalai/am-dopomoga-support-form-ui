import { Injectable } from '@angular/core';
import {BehaviorSubject, map, Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {_API_ROOT} from "../app.config";
import {Bases} from "../model";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private headerToken?: string;
  private stateSubscribers: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

  constructor(private http: HttpClient) { }

  private toHeaderToken(raw: string): string {
    return `Bearer ${raw}`;
  }

  submitAccessToken(raw: string): Observable<string> {
    return this.http.get<Whoami>(`${_API_ROOT}/meta/whoami`, {
      headers: {"Authorization": this.toHeaderToken(raw)}
    }).pipe(map(it => {
      if (it.id) {
        this.setToken(raw)
      } else {
        this.dropToken()
      }
      return it.id
    }))
  }

  getDatabaseList(): Observable<Bases> {
    return this.http.get<Bases>(`${_API_ROOT}/meta/bases`)
  }

  private setToken(raw: string): void {
    this.headerToken = this.toHeaderToken(raw);
    this.stateSubscribers.next(true)
  }

  private dropToken() {
    this.headerToken = undefined
    this.stateSubscribers.next(false)
  }

  getToken(): string | undefined {
    return this.headerToken;
  }
}

declare type Whoami = { id: string }
