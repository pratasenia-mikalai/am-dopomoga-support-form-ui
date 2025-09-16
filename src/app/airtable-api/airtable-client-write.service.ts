import {Injectable, signal, WritableSignal} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {
  AirtableEntity,
  AirtableDraftEntity,
  Base,
  Minus,
  Support, GoodEntry, SupportEntry
} from "../model";
import {_API_ROOT} from "../app.config";
import {catchError, firstValueFrom, forkJoin, map, Observable, of} from "rxjs";
import {AirtableCreateEntityRequest, AirtableEntityResponse} from "./model";

@Injectable({
  providedIn: 'root'
})
export class AirtableClientWriteService {

  airtableSupportDatabase: WritableSignal<Base | undefined> = signal(undefined);

  constructor(private http: HttpClient) { }

  async saveSupport(supportEntry: SupportEntry, goodEntries: GoodEntry[]): Promise<boolean> {
      return this.saveSupportDefault(supportEntry, goodEntries)
  }

  private supportApiUrl(): string {
    return `${_API_ROOT}/${this.airtableSupportDatabase()?.id}`
  }

  async saveSupportDefault(supportEntry: SupportEntry, goodEntries: GoodEntry[]): Promise<boolean> {
    const support: AirtableDraftEntity<Support> = new AirtableDraftEntity(
      new Support([supportEntry.who.id], supportEntry.date, supportEntry.familySize)
    )

    const supportSaved: AirtableEntity<Support> | undefined =
      await firstValueFrom(
        this.createSupport(new AirtableCreateEntityRequest<Support>([support]))
          .pipe(
            catchError(err => of([])),
            map(it => it[0] ? it[0] : undefined)
          ))

    if (!supportSaved) {
      return false
    }

    const minuses: AirtableDraftEntity<Minus>[] = goodEntries
      .map(it => new AirtableDraftEntity<Minus>(
        new Minus([supportSaved.id], [it.good.id], it.quantity)
      ))

    const minusesSaved: AirtableEntity<Minus>[] = await firstValueFrom(this.createMinuses(minuses)
      .pipe(catchError(err => of([])))
    )
    return true
  }

  private createSupport(request: AirtableCreateEntityRequest<Support>) {
    if (!this.airtableSupportDatabase()) return of([])

    return this.http.post<AirtableEntityResponse<Support>>(`${this.supportApiUrl()}/Support`, request)
      .pipe(
        catchError(err => {
          console.log(err);
          return of({records: []})
        }),
        map(it => it.records))
  }

  private createMinuses(minuses: AirtableDraftEntity<Minus>[]): Observable<never[] | AirtableEntity<Minus>[]> {
    if (!this.airtableSupportDatabase()) return of([])

    const chunks: AirtableDraftEntity<Minus>[][] = minuses.reduce((result: AirtableDraftEntity<Minus>[][], _, index) =>
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
