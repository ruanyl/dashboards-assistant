/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// import { Observable } from 'rxjs';
//
// export interface Operator<IInput, IOutput> {
//   execute(v: IInput): Promise<IInput & IOutput>;
//   catchError?(err: unknown): Observable<never>;
// }

export abstract class Operator<T, P> {
  abstract execute(v: T): Promise<P>;
}
