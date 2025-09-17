import {AirtableEntity, AirtableDraftEntity, Fields} from "../model";

export class AirtableCreateEntityRequest<T extends Fields> {
  constructor(public records: AirtableDraftEntity<T>[] = []) {
  }
}

export class AirtableEntityResponse<T extends Fields> {
  records: AirtableEntity<T>[] = []
}

export enum SavingMode {
  DEFAULT = "DEFAULT", DENORMALIZED = "DENORMALIZED"
}
