import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  effect,
  ElementRef, input,
  OnInit,
  output,
  ViewChild
} from '@angular/core';
import {AirtableEntity, Good, displayGoodName, HotButton} from "../model";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {debounceTime, distinctUntilChanged, filter, Observable, of, switchMap, tap} from "rxjs";
import {MatGridListModule} from '@angular/material/grid-list';
import {MatCardModule} from "@angular/material/card";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIcon} from "@angular/material/icon";
import {MatInputModule} from '@angular/material/input';
import {AirtableClientReadService} from "../airtable-api/airtable-client-read.service";
import {MatAutocomplete, MatAutocompleteModule, MatOption} from "@angular/material/autocomplete";
import {AsyncPipe, SlicePipe} from "@angular/common";
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {ConnectedPosition, OverlayModule} from '@angular/cdk/overlay';
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
  selector: 'app-hot-button-panel',
  standalone: true,
  imports: [
    MatGridListModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    ReactiveFormsModule,
    FormsModule,
    MatAutocomplete,
    MatAutocompleteModule,
    MatOption,
    AsyncPipe,
    CdkDropList,
    CdkDrag,
    CdkDropListGroup,
    MatProgressSpinnerModule,
    SlicePipe,
    OverlayModule,
    MatToolbarModule,
    MatExpansionModule
  ],
  templateUrl: './hot-button-panel.component.html',
  styleUrl: './hot-button-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotButtonPanelComponent implements OnInit, AfterViewInit {

  hotButtonClick = output<HotButton>();
  @ViewChild('hotButtonsPanel', { static: true }) hotButtonsPanel!: ElementRef;
  hotButtonMacroInput = input<HotButton | undefined>(undefined, {alias: "addMacroFrom"})

  private _SYNTHETIC_ID_COUNTER = 0;

  databaseId?: string
  editMode: boolean = false;

  goodFC: FormControl<AirtableEntity<Good> | string | null> = new FormControl<AirtableEntity<Good> | string | null>({ value: null, disabled: true });
  goodOptions: Observable<AirtableEntity<Good>[]> = of([]);
  goodFCSpinner: boolean = false;
  displayGoodName: (good?: AirtableEntity<Good>) => string = displayGoodName

  hotButtons: HotButtonRow[] = [];

  macroTooltipsShow: { [id: string]: boolean } = {}
  macroTooltipPositionStrategy: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
      offsetX: 8
    },
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetX: 8
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'top',
      offsetX: -8
    },
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetX: -8
    },
  ]

  constructor(private apiClient: AirtableClientReadService, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar) {
    effect(() => {
      this.databaseId = this.apiClient.airtableGoodDatabase()?.id;
      this.loadHotButtonsPanel()
      this.refreshGoodFCDisabled()
    });
    effect(() => {
      let hotButton = this.hotButtonMacroInput()
      if (hotButton) this.addHotButton(hotButton)
      this.cdr.detectChanges()
    })
  }

  ngOnInit(): void {
    this.goodOptions = this.goodFC.valueChanges.pipe(
      distinctUntilChanged(),
      debounceTime(500),
      filter(it => !!it && typeof it == 'string' && it.length > 2),
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
    this.addHotButtonRowWithDummy()
  }

  ngAfterViewInit() {
    this.refreshHotPanelRowLength()
  }

  private nextId(): string {
    return (++this._SYNTHETIC_ID_COUNTER).toString();
  }

  private refreshHotPanelRowLength() {
    let colsNumber = this.maxHotButtonRowLength() + (this.editMode ? 1 : 0)
    colsNumber = colsNumber < 3 ? 3 : colsNumber;
    this.hotButtonsPanel.nativeElement.style.setProperty("--hot-panel-row-length", colsNumber.toString())
  }

  private maxHotButtonRowLength(): number {
    let maxLength = 0;
    this.hotButtons.forEach(it => {
      if (it.row.length > maxLength) maxLength = it.row.length
    })
    return maxLength
  }

  toggleEditMode(editModeValue: boolean) {
    this.editMode = editModeValue
    this.refreshGoodFCDisabled()
    this.refreshHotPanelRowLength()
  }

  refreshGoodFCDisabled() {
    this.databaseId ? this.goodFC.enable() : this.goodFC.disable();
  }

  clickHotButton(hotButton: HotButton): void {
    if (!hotButton.isDummy()) this.hotButtonClick.emit(hotButton)
  }

  addHotButton(hotButton?: HotButton) {
    let newValue = hotButton
    if (newValue) {
      newValue.id = this.nextId()
    } else {
      if (!this.goodFC.value || typeof this.goodFC.value === "string") return;

      newValue = new HotButton(this.nextId()).with(this.goodFC.value)
      this.goodFC.setValue(null)
    }

    if (this.hotButtons.length === 0) {
      this.addHotButtonRowWithDummy()
    }

    if (this.hotButtons.length < 3) {
      this.hotButtons[0].row.push(newValue)
      this.refreshDummyInRowAfterGoodAdded(this.hotButtons[0].row)
      this.refreshHotPanelRowLength()
      return;
    }

    if (this.hotButtons.at(-2)!.row.length < this.maxHotButtonRowLength()) {
      this.hotButtons.at(-2)!.row.push(newValue)
      return;
    }

    this.hotButtons.at(-1)!.row.push(newValue)
    this.refreshDummyInRowAfterGoodAdded(this.hotButtons.at(-1)!.row)
    this.refreshHotPanelRowLength()
  }

  private refreshDummyInRowAfterGoodAdded(row: HotButton[]) {
    let dummyIndex = row.findIndex(it => it.isDummy())
    if (dummyIndex >= 0) {
      row.splice(dummyIndex, 1)
      this.addHotButtonRowWithDummy()
    }
  }

  private addHotButtonRowWithDummy() {
    this.hotButtons.push({id: this.nextId(), row: [new HotButton(this.nextId())]})
  }

  removeHotButton(arrayIndex: number, index: number) {
    if (!this.editMode) return;

    this.hotButtons[arrayIndex].row.splice(index, 1)

    if (this.hotButtons[arrayIndex].row.length === 0) {
      this.hotButtons.splice(arrayIndex, 1)
    }
  }

  drop(event: CdkDragDrop<HotButton[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      if (event.container.data.length < 3) {
        this.refreshDummyInRowAfterGoodAdded(event.container.data)
      }
      if (event.previousContainer.data.length === 0) {
        let emptyRowIndex: number = this.hotButtons.findIndex(it => it.row == event.previousContainer.data)
        if (emptyRowIndex > -1) {
          this.hotButtons.splice(emptyRowIndex, 1)
        }
      }
      this.refreshHotPanelRowLength()
    }
  }

  saveHotButtonsPanel() {
    if (this.databaseId) {
      window.localStorage.setItem(this.databaseId, JSON.stringify(this.hotButtons))
      this.snackBar.open(`Hot Panel Saved`, "X", {duration: 5000})
    }
  }

  loadHotButtonsPanel() {
    if (this.databaseId) {
      const rawValue = window.localStorage.getItem(<string>this.databaseId);
      if (rawValue) {
        this.hotButtons = this.parseHotButtons(rawValue)
        this.refreshHotPanelRowLength()
        return
      }
    }
    this.hotButtons = []
    this.refreshHotPanelRowLength()
  }

  private parseHotButtons(rawString: string): HotButtonRow[] {
    const rawObjectArray: any[] = JSON.parse(rawString) as Array<any>
    const result: HotButtonRow[] = []

    rawObjectArray.forEach(rawRow => {

      const hotButtonsRow: HotButtonRow = {id: this.nextId(), row: ([] as HotButton[])};
      (rawRow.row as Array<HotButton>)
        .map(rawHotButton => new HotButton(this.nextId(), rawHotButton.entries))
        .forEach(it => hotButtonsRow.row.push(it))

      result.push(hotButtonsRow)
    })

    return result
  }

  showMacroTooltip(id: string) {
    this.macroTooltipsShow[id] = true;
  }

  hideMacroTooltip(id: string) {
    this.macroTooltipsShow[id] = false;
  }
}

declare type HotButtonRow = { id: string, row: HotButton[] };
