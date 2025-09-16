import {Injectable, signal, WritableSignal} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {
  AirtableDraftEntity,
  AirtableEntity,
  Base,
  displayRefugeeNameWithDOB,
  GoodEntry,
  Minus,
  Support,
  SupportDenormalized,
  SupportEntry
} from "../model";
import {_API_ROOT} from "../app.config";
import {catchError, firstValueFrom, forkJoin, lastValueFrom, map, Observable, of} from "rxjs";
import {AirtableCreateEntityRequest, AirtableEntityResponse, SavingMode} from "./model";

@Injectable({
  providedIn: 'root'
})
export class AirtableClientWriteService {

  savingMode: SavingMode = SavingMode.DEFAULT
  airtableSupportDatabase: WritableSignal<Base | undefined> = signal(undefined);

  constructor(private http: HttpClient) { }

  private supportApiUrl(): string {
    return `${_API_ROOT}/${this.airtableSupportDatabase()?.id}`
  }

  async saveSupport(supportEntry: SupportEntry, goodEntries: GoodEntry[]): Promise<boolean> {
    switch (this.savingMode) {
      case SavingMode.DEFAULT:
        return this.saveSupportDefault(supportEntry, goodEntries)
      case SavingMode.DENORMALIZED:
        return this.saveSupportDenormalized(supportEntry, goodEntries)
      default:
        throw new Error("Saving Mode is not set up!")
    }
  }

  private async saveSupportDenormalized(supportEntry: SupportEntry, goodEntries: GoodEntry[]): Promise<boolean> {
    const goodsTextRowBuilder = (goodEntry: GoodEntry) =>
      [goodEntry.good.fields.ID_name,
        goodEntry.quantity,
        goodEntry.good.fields["Weight 1 unit, kg"] ? (goodEntry.good.fields["Weight 1 unit, kg"] * goodEntry.quantity).toFixed(3) : 0
      ].join(';')

    const support: AirtableDraftEntity<SupportDenormalized> = new AirtableDraftEntity(
      new SupportDenormalized(
        displayRefugeeNameWithDOB(supportEntry.who),
        supportEntry.date,
        goodEntries.map(goodsTextRowBuilder).join('\n'),
        supportEntry.customFamilySize ? supportEntry.customFamilySize : supportEntry.who.fields["Family size"]
      )
    )

    return firstValueFrom(
      this.createSupport(new AirtableCreateEntityRequest<SupportDenormalized>([support]))
        .pipe(
          catchError(err => of([])),
          map(it => !!it[0])
        ))
  }

  private async saveSupportDefault(supportEntry: SupportEntry, goodEntries: GoodEntry[]): Promise<boolean> {
    const support: AirtableDraftEntity<Support> = new AirtableDraftEntity(
      new Support([supportEntry.who.id], supportEntry.date, supportEntry.customFamilySize)
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

    return lastValueFrom(this.createMinuses(minuses)
        .pipe(
          catchError(err => of([])),
          map(it => it.length > 0)
        )
    )
  }

  private createSupport<T extends Support | SupportDenormalized>(request: AirtableCreateEntityRequest<T>) {
    if (!this.airtableSupportDatabase()) return of([])

    return this.http.post<AirtableEntityResponse<T>>(`${this.supportApiUrl()}/Support`, request)
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
