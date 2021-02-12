import {
  race,
  concat,
  of,
  timer,
  fromEvent,
  forkJoin,
  defer,
  Observable
} from "rxjs";
import {
  shareReplay,
  delay,
  tap,
  exhaustMap,
  takeUntil,
  last,
  endWith,
  share
} from "rxjs/operators";

// Import stylesheets
import "./style.css";

const $finishXhrAfter: HTMLInputElement = document.getElementById(
  "finish-xhr-after"
) as HTMLInputElement;
const $showSpinnerAfter: HTMLInputElement = document.getElementById(
  "show-spinner-after"
) as HTMLInputElement;
const $showSpinnerFor: HTMLInputElement = document.getElementById(
  "show-spinner-for"
) as HTMLInputElement;
const $timer = document.getElementById("timer");
const $spinner = document.getElementById("spinner");
const $startButton = document.getElementById("start-button");

$finishXhrAfter.value = "2000";
$showSpinnerAfter.value = "500";
$showSpinnerFor.value = "300";

const timerInterval = 100;

fromEvent($startButton, "click")
  .pipe(
    exhaustMap(() => {
      const fetch$ = fetchData().pipe(share());
      return forkJoin([createTimer(fetch$), fetch$]);
    })
  )
  .subscribe();

function fetchData() {
  const finishXhrAfter = +$finishXhrAfter.value;
  const showSpinnerAfter = +$showSpinnerAfter.value;
  const showSpinnerFor = +$showSpinnerFor.value;

  const data$ = of("Fetched").pipe(
    // simulate ajax call
    tap(_ => console.log(Date.now(), "fetching data starts")),
    delay(finishXhrAfter),
    shareReplay(1),
    tap(_ => console.log(Date.now(), "fetching data completed"))
  );

  const showSpinner$ = of(true).pipe(
    tap(_ => console.log(Date.now(), "showing spinner start")),
    delay(showSpinnerAfter),
    tap(val => toggleSpinner(val)),
    tap(_ => console.log(Date.now(), "showing spinner completed"))
  );

  /*
    avoids spinner flickering
   */
  const keepSpinnerAliveForAtLeast$ = timer(showSpinnerFor);

  /*
    sequentially emits all values from given Observable and then 
    ... moves on to the next.
   */
  const spinner$ = concat(
    showSpinner$,
    keepSpinnerAliveForAtLeast$,
    data$.pipe(tap(() => toggleSpinner(false)))
  );

  /*
    We don't want to show the spinner
    ... if the fetch ist fast enough.
   */
  return race(data$, spinner$);
}

function toggleSpinner(show: boolean) {
  if (show) {
    $spinner.classList.remove("hidden");
  } else {
    $spinner.classList.add("hidden");
  }
}

function createTimer(notifier$: Observable<any>) {
  return defer(() => {
    const start = Date.now();

    return timer(0, timerInterval).pipe(
      takeUntil(notifier$.pipe(last())),
      endWith("done"),
      tap(() => ($timer.innerHTML = formatTimer(Date.now() - start)))
    );
  });
}

function formatTimer(curr: number) {
  curr /= 1000;
  return curr.toFixed(1);
}
