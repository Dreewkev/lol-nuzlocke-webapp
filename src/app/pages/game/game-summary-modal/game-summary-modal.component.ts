import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoundOutcome } from '../../../enums/roundOutcome';
import { Role } from '../../../enums/role';
import { RoundSummarySubmit } from '../../../models/round-summary-submit.model';
import {CHAMPIONS} from '../../../enums/champions';

@Component({
  selector: 'app-game-summary-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './game-summary-modal.component.html',
})
export class GameSummaryModalComponent {
  @Input({ required: true }) outcome!: RoundOutcome; // 'WIN' | 'LOSS'
  @Input({ required: true }) round!: number;
  @Input() aliveChampions: string[] | null = null;

  @Output() submit = new EventEmitter<RoundSummarySubmit>();
  @Output() cancel = new EventEmitter<void>();

  readonly roles: Role[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  // 👉 für <datalist>
  readonly champions = CHAMPIONS;

  // ---- Form ----
  readonly form = new FormGroup({
    actualLane: new FormControl<Role | null>(null, {
      validators: [Validators.required],
    }),

    // WIN + LOSS
    kp50: new FormControl<boolean | null>(null),

    // earned champ (shown if kp50 === true)
    gainedChamp: new FormControl<string>(''),

    // LOSS only
    playedChamp: new FormControl<string>(''),
  });

  // ---- UI ----
  readonly errorMsg = signal<string | null>(null);

  submitClicked() {
    this.errorMsg.set(null);

    const actualLane = this.form.controls.actualLane.value;
    if (!actualLane) {
      this.errorMsg.set('Please select the lane you actually played.');
      return;
    }

    const kp50 = this.form.controls.kp50.value;
    if (kp50 === null) {
      this.errorMsg.set('Please choose Yes or No for ≥ 50% Kill Participation.');
      return;
    }

    const gainedRaw = (this.form.controls.gainedChamp.value ?? '').trim();
    if (kp50 && !gainedRaw) {
      this.errorMsg.set('If KP50 is Yes, please select the earned champion.');
      return;
    }

    if (this.outcome === 'LOSS') {
      const playedRaw = (this.form.controls.playedChamp.value ?? '').trim();
      if (!playedRaw) {
        this.errorMsg.set('Please select the champion you played.');
        return;
      }

      this.submit.emit({
        actualLane,
        outcome: 'LOSS',
        kp50,
        gainedChamp: kp50 ? gainedRaw : undefined,
        playedChamp: playedRaw,
      });
      return;
    }

    // WIN
    this.submit.emit({
      actualLane,
      outcome: 'WIN',
      kp50,
      gainedChamp: kp50 ? gainedRaw : undefined,
    });
  }

  reset() {
    this.form.reset({
      actualLane: null,
      kp50: null,
      gainedChamp: '',
      playedChamp: '',
    });
    this.errorMsg.set(null);
  }
}
