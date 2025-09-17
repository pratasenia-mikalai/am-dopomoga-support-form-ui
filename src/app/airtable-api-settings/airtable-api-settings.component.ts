import {ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, signal, WritableSignal} from '@angular/core';
import {AirtableClientReadService} from "../airtable-api/airtable-client-read.service";
import {AuthService} from "../airtable-api/auth.service";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {FormControl, FormGroupDirective, FormsModule, NgForm} from '@angular/forms';
import {MatButton} from "@angular/material/button";
import {ErrorStateMatcher} from "@angular/material/core";
import {Base} from "../model";
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIcon} from "@angular/material/icon";
import {MatTooltipModule} from '@angular/material/tooltip';
import {AirtableClientWriteService} from "../airtable-api/airtable-client-write.service";
import {MatRadioButton, MatRadioGroup} from "@angular/material/radio";
import {SavingMode} from "../airtable-api/model";

@Component({
    selector: 'app-airtable-api-settings',
  imports: [FormsModule, MatToolbarModule, MatFormFieldModule, MatInputModule, MatButton, MatSelectModule, MatCheckboxModule, MatExpansionModule, MatIcon, MatTooltipModule, MatRadioGroup, MatRadioButton],
    templateUrl: './airtable-api-settings.component.html',
    styleUrl: './airtable-api-settings.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirtableApiSettingsComponent {

  headerExpanded: WritableSignal<boolean> = signal(true)

  token?: string

  userId?: string
  authErrorMessage?: string
  authErrorStateMatcher: ErrorStateMatcher

  databaseOptions: Base[] = []
  databases: BasesNamedArray = {
    "good": signal(undefined),
    "refugee": signal(undefined),
    "support": signal(undefined)
  }
  savingMode: WritableSignal<SavingMode> = signal(SavingMode.DEFAULT)

  constructor(private apiReadClient: AirtableClientReadService,
              private apiWriteClient: AirtableClientWriteService,
              private authService: AuthService, private cdr: ChangeDetectorRef) {
    const authErrorMessageProducer: () => string | undefined = () => {
      return this.authErrorMessage
    }
    this.authErrorStateMatcher = new OnValueExistsErrorStateMatcher(authErrorMessageProducer)
    effect(() => {
      this.apiReadClient.setRefugeeDatabase(this.databases["refugee"]())
    });
    effect(() => {
      this.apiReadClient.setGoodDatabase(this.databases["good"]())
    });
    effect(() => {
      this.apiWriteClient.setSupportDatabase(this.databases["support"]())
    });
    effect(() => {
      this.apiWriteClient.setSavingMode(this.savingMode())
    });
  }

  toggleCommaToDotTranslation(event: any) {
    this.apiReadClient.setTranslateCommaToDotInSearch(event.checked)
  }

  submitAuthToken() {
    if (!this.token) {
      this.authErrorMessage = "Enter personal access token"
      return
    }

    let rawToken = this.token
    this.authService.submitAccessToken(rawToken)
      .subscribe({
        next: it => this.tokenApproved(it),
        error: err => this.tokenRejected(err),
        complete: () => this.cdr.detectChanges()
      })
    this.token = undefined
  }

  tokenApproved(userId: string) {
    this.userId = userId;
    this.authErrorMessage = undefined
    this.loadDatabaseList()
  }

  tokenRejected(error: any) {
    this.userId = undefined;
    this.authErrorMessage = JSON.stringify(error.error)
    this.databaseOptions = []
  }

  loadDatabaseList() {
    this.authService.getDatabaseList()
      .subscribe({
        next: it => {
          this.databaseOptions = it.bases
        },
        error: err => console.log(`Fail loading database list: ${JSON.stringify(err.error)}`)
      })
  }

  clearDatabaseSet() {
    Object.keys(this.databases)
      .forEach(key => this.databases[key].set(undefined))
  }

  databaseSelected(event: any) {
    if (this.savingMode() == SavingMode.DEFAULT) {
      Object.keys(this.databases)
        .forEach(key => this.databases[key].set(event.value))
    }
    if (this.checkDatabaseSet()) {
      this.headerExpanded.set(false)
    }
  }

  checkDatabaseSet(): boolean {
    return !Object.keys(this.databases).some(key => !this.databases[key]())
  }

  protected readonly SavingMode = SavingMode;
}

type BasesNamedArray = { [key: string]: WritableSignal<Base | undefined> }

class OnValueExistsErrorStateMatcher implements ErrorStateMatcher {

  constructor(private valueProducer: () => any) {
  }

  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!this.valueProducer();
  }
}


