import {Injectable, signal, WritableSignal} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {
  AirtableCreateEntityRequest, AirtableEntity,
  AirtableEntityResponse,
  AirtableRequestEntity,
  Base,
  Minus,
  Support
} from "../model";
import {_API_ROOT} from "../app.config";
import {catchError, forkJoin, map, Observable, of} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AirtableClientWriteDefaultService {

  airtableSupportDatabase: WritableSignal<Base | undefined> = signal(undefined);

  constructor(private http: HttpClient) { }

  private supportApiUrl(): string {
    return `${_API_ROOT}/${this.airtableSupportDatabase()?.id}`
  }

  createSupport(request: AirtableCreateEntityRequest<Support>) {
    if (!this.airtableSupportDatabase()) return of([])

    return this.http.post<AirtableEntityResponse<Support>>(`${this.supportApiUrl()}/Support`, request)
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records))
  }

  createMinuses(minuses: AirtableRequestEntity<Minus>[]): Observable<never[] | AirtableEntity<Minus>[]> {
    if (!this.airtableSupportDatabase()) return of([])

    const chunks: AirtableRequestEntity<Minus>[][] = minuses.reduce((result: AirtableRequestEntity<Minus>[][], _, index) =>
      (index % 10 === 0 ? [...result, minuses.slice(index, index + 10)] : result), []);

    const requestObservables = chunks.map(it => this.requestCreateMinuses(new AirtableCreateEntityRequest<Minus>(it)))

    return forkJoin(requestObservables).pipe(
      map(it => it.reduce(
        (result: AirtableEntity<Minus>[], value: AirtableEntity<Minus>[], index: number) => result.concat(value),
        []
      ))
    )
  }

  private requestCreateMinuses(request: AirtableCreateEntityRequest<Minus>) {
    if (!this.airtableSupportDatabase()) return of([])

    return this.http.post<AirtableEntityResponse<Minus>>(`${this.supportApiUrl()}/Minus`, request)
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records))
  }

  setSupportDatabase(base: Base) {
    this.airtableSupportDatabase.set(base)
  }

}
