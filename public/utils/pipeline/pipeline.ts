/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

import { Operator } from './Operator';

export class Pipeline {
  input$ = new BehaviorSubject<any>(null);
  output$: Observable<any>;
  status$ = new BehaviorSubject<'RUNNING' | 'STOPPED'>('STOPPED');

  constructor(private readonly operators: Array<Operator<any, any>>) {
    this.output$ = this.input$
      .pipe(tap(() => this.status$.next('RUNNING')))
      .pipe(
        switchMap((value) => {
          return this.operators
            .reduce((acc$, operator) => {
              return acc$.pipe(switchMap((result) => operator.execute(result)));
            }, of(value))
            .pipe(catchError((e) => of({ error: e })));
        })
      )
      .pipe(tap(() => this.status$.next('STOPPED')));
  }

  invoke(v: any) {
    this.input$.next(v);
  }

  getResult$() {
    return this.output$;
  }
}
