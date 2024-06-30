import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
import {AirtableClientService} from "../airtable-api/airtable-client.service";
import {AsyncPipe} from '@angular/common'
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

@Component({
  selector: 'app-airtable-api-settings',
  standalone: true,
  imports: [FormsModule, AsyncPipe, MatToolbarModule, MatFormFieldModule, MatInputModule, MatButton, MatSelectModule, MatCheckboxModule, MatExpansionModule, MatIcon, MatTooltipModule],
  templateUrl: './airtable-api-settings.component.html',
  styleUrl: './airtable-api-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirtableApiSettingsComponent {

  headerExpanded: boolean = true

  token?: string

  userId?: string
  authErrorMessage?: string
  authErrorStateMatcher: ErrorStateMatcher

  database?: Base
  databaseOptions: Base[] = []
  databaseOptionsSpinner: boolean = false

  constructor(private apiClient: AirtableClientService, private authService: AuthService, private cdr: ChangeDetectorRef) {
    const authErrorMessageProducer: () => string | undefined = () => {
      return this.authErrorMessage
    }
    this.authErrorStateMatcher = new OnValueExistsErrorStateMatcher(authErrorMessageProducer)
  }

  toggleCommaToDotTranslation(event: any) {
    this.apiClient.setTranslateCommaToDotInSearch(event.checked)
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

  databaseSelected(event: any) {
    this.apiClient.setDatabase(event.value)
    this.headerExpanded = false
  }
}

export class OnValueExistsErrorStateMatcher implements ErrorStateMatcher {

  constructor(private valueProducer: () => any) {
  }

  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!this.valueProducer();
  }
}
