import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, output} from "@angular/core";
import {MatListItem} from "@angular/material/list";
import {MatFormField} from "@angular/material/form-field";
import {
  MatAutocomplete,
  MatAutocompleteModule,
  MatOption
} from "@angular/material/autocomplete";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from "@angular/forms";
import {AirtableEntity, Good, displayGoodName} from "../model";
import {MatInputModule} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";
import {AsyncPipe, JsonPipe} from "@angular/common"
import {MatButtonModule} from "@angular/material/button";
import {debounceTime, distinctUntilChanged, filter, Observable, of, Subscription, switchMap, tap} from "rxjs";
import {AirtableClientReadService} from "../airtable-api/airtable-client-read.service";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@Component({
  selector: "app-support-good-entry",
  standalone: true,
  imports: [
    MatListItem,
    MatFormField,
    MatAutocomplete,
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIcon,
    MatOption,
    MatButtonModule,
    AsyncPipe,
    JsonPipe,
    MatProgressSpinnerModule
  ],
  templateUrl: "./support-good-entry.component.html",
  styleUrl: "./support-good-entry.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupportGoodEntryComponent implements OnInit, OnDestroy {
  @Input("formGroup") goodEntryFormGroup!: FormGroup
  @Input("searchGoodEntryIndexById") searchGoodEntryIndexById!: (id: string) => number
  @Input("index") indexInFormArray!: number

  enter = output<FormGroup>();
  remove = output<number>();

  goodEntryFormGroupEventSubscription?: Subscription

  goodFC!: FormControl<AirtableEntity<Good> | string | null>;
  goodOptions: Observable<AirtableEntity<Good>[]> = of([]);
  goodFCSpinner: boolean = false;
  displayGoodName: (good?: AirtableEntity<Good>) => string = displayGoodName

  quantityFC!: FormControl<number>

  constructor(private apiClient: AirtableClientReadService, private cdr: ChangeDetectorRef,) {
  }

  ngOnInit(): void {
    this.goodFC = this.goodEntryFormGroup.get("good") as FormControl<AirtableEntity<Good> | string | null>;
    this.goodFC.addValidators([this.validatorUniqueGood()]);

    this.quantityFC = this.goodEntryFormGroup.get("quantity") as FormControl<number>;
    this.quantityFC.addValidators([Validators.required, Validators.min(1), Validators.max(999)])

    this.goodOptions = this.goodFC.valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(500),
      filter(it => !!it && typeof it == "string" && it.length > 2),
      tap(() => {
        this.goodFCSpinner = true;
        this.cdr.detectChanges()
      }),
      switchMap(it => this.apiClient.searchGood(<string>it)
        .pipe(tap(() => {
          this.goodFCSpinner = false;
          this.cdr.detectChanges()
        }))
      ),
    );

   this.goodEntryFormGroupEventSubscription = this.goodEntryFormGroup.events.subscribe(_ => this.cdr.detectChanges())
  }

  ngOnDestroy() {
    this.goodEntryFormGroupEventSubscription?.unsubscribe()
  }

  minusOne(): void {
    let value = this.quantityFC?.value;
    if (value && value > 1) this.quantityFC.setValue(--value);
  }

  plusOne(): void {
    let value = this.quantityFC.value;
    if (value && value < 999) {
      this.quantityFC.setValue(++value);
    } else if (!value) {
      this.quantityFC.setValue(1);
    }
  }

  goodEntryFormEnter(): void {
    this.enter.emit(this.goodEntryFormGroup)
  }

  clickRemoveEntry(): void {
    this.remove.emit(this.indexInFormArray)
  }

  validatorUniqueGood(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!this.goodFC.value) {
        return null
      }
      if (this.goodFC.value && typeof this.goodFC.value === "string") {
        return {good: "Search and choose an option"}
      }
      const goodName = (<AirtableEntity<Good>>this.goodFC.value)?.fields?.ID_name
      if (!goodName) {
        return {good: "Search and choose an option"}
      }
      const firstIndex = this.searchGoodEntryIndexById(control.value.id);
      if (firstIndex !== this.indexInFormArray) {
        return {good: "Good is already exists in list"}
      }
      return null;
    };
  }

}
