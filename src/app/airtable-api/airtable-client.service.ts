import {Injectable, signal, WritableSignal} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError, map, Observable, of} from "rxjs";
import {_API_ROOT} from "../app.config";
import {
  AirtableEntity,
  AirtableCreateEntityRequest,
  AirtableEntityResponse,
  Base,
  Good,
  Refugee,
  Support,
  Minus
} from "../model";

@Injectable({
  providedIn: 'root'
})
export class AirtableClientService {

  airtableDatabase: WritableSignal<Base | undefined> = signal(undefined);
  private translateCommaToDotInSearch: boolean = true

  constructor(private http: HttpClient) {
  }

  private apiUrl(): string {
    return `${_API_ROOT}/${this.airtableDatabase()?.id}`
  }

  searchGood(search: string): Observable<AirtableEntity<Good>[]> {
    if (!this.airtableDatabase()) return of([])

    return this.http.get<AirtableEntityResponse<Good>>(`${this.apiUrl()}/Goods`, this.searchRequestParams(search, "ID_name"))
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records)
      )
  }

  searchRefugee(search: string): Observable<AirtableEntity<Refugee>[]> {
    if (!this.airtableDatabase()) return of([])

    return this.http.get<AirtableEntityResponse<Refugee>>(`${this.apiUrl()}/Refugees`, this.searchRequestParams(search, "Name"))
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records))
  }

  createSupport(request: AirtableCreateEntityRequest<Support>) {
    if (!this.airtableDatabase()) return of([])

    return this.http.post<AirtableEntityResponse<Support>>(`${this.apiUrl()}/Support`, request)
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records))
  }

  createMinus(request: AirtableCreateEntityRequest<Minus>) {
    if (!this.airtableDatabase()) return of([])

    return this.http.post<AirtableEntityResponse<Minus>>(`${this.apiUrl()}/Minus`, request)
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records))
  }

  setDatabase(base: Base) {
    this.airtableDatabase.set(base)
  }

  setTranslateCommaToDotInSearch(value: boolean) {
    this.translateCommaToDotInSearch = value
  }

  private searchRequestParams(search: string, fieldName: string): Params {
    return {
      params: {
        "filterByFormula": this.filterFormula(search, fieldName),
        "maxRecords": 10
      }
    }
  }

  private filterFormula(search: string, fieldName: string): string {
    const searchWords = search.trim().split(" ")
      .filter(it => it.length > 0)
      .map(it => this.translateCommaToDotInSearch ? it.replace(",", ".") : it)
    if (searchWords.length === 1) {
      return `FIND("${searchWords[0]}", {${fieldName}})`
    }
    if (searchWords.length > 1) {
      return `AND(FIND("${searchWords[0]}", {${fieldName}}), FIND("${searchWords[1]}", {${fieldName}}))`
    }
    return ""
  }

}

declare type Params = {
  params: { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> }
};
