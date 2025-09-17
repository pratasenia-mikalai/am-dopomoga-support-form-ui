import {ChangeDetectionStrategy, Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {SupportFormComponent} from "./support-form/support-form.component";
import {AirtableApiSettingsComponent} from "./airtable-api-settings/airtable-api-settings.component";

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, SupportFormComponent, AirtableApiSettingsComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'aid-tools-support-ui';
}
