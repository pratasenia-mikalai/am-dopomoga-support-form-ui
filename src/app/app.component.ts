import {ChangeDetectionStrategy, Component} from '@angular/core';
import {SupportFormComponent} from "./support-form/support-form.component";

@Component({
    selector: 'app-root',
    imports: [SupportFormComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'aid-tools-support-ui';
}
