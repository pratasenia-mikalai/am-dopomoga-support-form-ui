export class Bases {
  bases: Base[] = []
}

export class Base {
  id?: string
  name?: string
  permissionLevel?: string
}

export interface Fields {
}

export class AirtableDraftEntity<T extends Fields> {
  constructor(public readonly fields: T) {
  }
}

export class AirtableEntity<T extends Fields> extends AirtableDraftEntity<T> {
  createdTime?: string

  constructor(fields: T, public readonly id: string = "") {
    super(fields)
  }
}

export class Refugee implements Fields {
  Name?: string
  Phone?: string
  DOB?: string
  "Family size"?: number
}

export class Good implements Fields {
  Type?: string
  "Weight 1 unit, kg"?: number
  Name?: string
  ID_name?: string
}

export class SupportEntry {
  constructor(
    public readonly who: AirtableEntity<Refugee>,
    public readonly date: string,
    public readonly customFamilySize?: number
  ) {
  }
}

export class GoodEntry {
  constructor(
    public readonly good: AirtableEntity<Good>,
    public readonly quantity: number
  ) {
  }
}

export class Support implements Fields {
  constructor(
    public readonly Who: string[], // array with ONE refugee Id inside
    public readonly Date: string,
    public readonly Custom_family_size?: number
  ) {
  }
}

export class Minus implements Fields {
  constructor(
    public readonly Support: string[], // array with ONE support Id inside
    public readonly Goods: string[], // array with ONE good Id inside
    public readonly _minus: number // quantity
  ) {
  }
}

export class SupportDenormalized implements Fields {
  constructor(
    public readonly Who: string,
    public readonly Date: string,
    public readonly Goods: string,
    public readonly Family_Size?: number
  ) {
  }
}

export class HotButton {
  readonly entries: HotButtonEntry[] = []
  type: HotButtonType = HotButtonType.Single

  constructor(public id: string, entries?: HotButtonEntry[]) {
    if (entries) this.entries = entries
    this.refreshType()
  }

  private refreshType() {
    switch (this.entries.length) {
      case 0 :
        this.type = HotButtonType.Dummy;
        break;
      case 1: {
        if (this.entries[0].quantity > 1) this.type = HotButtonType.Macro;
        else this.type = HotButtonType.Single;
        break;
      }
      default:
        this.type = HotButtonType.Macro;
    }
  }

  with(good?: AirtableEntity<Good>): HotButton {
    if (good) {
      this.entries.push(new HotButtonEntry(good))
      this.refreshType()
    }
    return this;
  }

  isDummy(): boolean {
    return this.entries.length === 0;
  }
}

export enum HotButtonType {
  Dummy, Single, Macro,
}

export class HotButtonEntry {
  constructor(public readonly good: AirtableEntity<Good>, public readonly quantity: number = 1) {
  }
}

export function displayGoodName(good?: AirtableEntity<Good>): string {
  return good?.fields?.ID_name ? good.fields.ID_name : "";
}

export function displayRefugeeNameWithDOB(refugee?: AirtableEntity<Refugee>): string {
  const name = refugee?.fields?.Name ? refugee.fields.Name : '';
  const dob = refugee?.fields?.DOB ? ` (${new Date(refugee!.fields!.DOB!).toLocaleDateString()})` : ''
  return name + dob;
}
