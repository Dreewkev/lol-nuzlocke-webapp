import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-end-round-modal',
  templateUrl: './end-round-modal.component.html',
})
export class EndRoundModalComponent {
  @Output() decision = new EventEmitter<'WIN'|'LOSS'>();
  @Output() cancel = new EventEmitter<void>();

  select(result: 'WIN'|'LOSS') {
    this.decision.emit(result);
  }

  close() {
    this.cancel.emit();
  }
}
