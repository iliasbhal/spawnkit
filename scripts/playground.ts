import { wait } from "../src/utils/wait";

// const SIMULATED_UP = 30;
// const SIMULATED_DOWN = 10;

// const ONE_HOUR = 1000 * 60 * 60;
// const FIFTEEN_MINUTES = ONE_HOUR / 4;
// const TIMESZONE_DIFF = FIFTEEN_MINUTES;


// const remoteUtils = {
//   async getLocalTimeUnix() {
//     await wait(SIMULATED_UP)
//     const now = Date.now()
//     await wait(SIMULATED_DOWN);
//     return now;
//   }
// }

// const computeWith = async (timesoneDiff: number) => {
//   const before = Date.now(); // 13h
//   const remoteTime = timesoneDiff + await remoteUtils.getLocalTimeUnix(); // 15h
//   const before2 = Date.now() // 13h:10

//   let up = remoteTime - before;
//   let down = before2 - remoteTime;

//   const timwzoneDiffUp = TIMESZONE_DIFF / up;
//   const timwzoneDiffDown = TIMESZONE_DIFF / down;
//   const times = Math.abs(Math.floor(1 / timwzoneDiffDown));
//   if (timwzoneDiffUp < 0) {
//     up += (TIMESZONE_DIFF * times)
//     down -= (TIMESZONE_DIFF * times)
//   } else if (timwzoneDiffDown < 0) {
//     up -= (TIMESZONE_DIFF * times)
//     down += (TIMESZONE_DIFF * times)
//   }

//   return {
//     up: up,
//     down: down,
//     timeszoneDiffHours: times / 4,
//     total: up + down,
//   };
// }

export const main = async () => {

  // computeWith(0).then(a => console.log('same', a))
  // computeWith(TIMESZONE_DIFF).then(a => console.log('+1h', a));
  // computeWith(TIMESZONE_DIFF * 2).then(a => console.log('+2h', a));
  // computeWith(TIMESZONE_DIFF * 3).then(a => console.log('+3h', a));

  // computeWith(-TIMESZONE_DIFF).then(a => console.log('-1h', a));
  // computeWith(-TIMESZONE_DIFF * 2).then(a => console.log('-2h', a));
  // computeWith(-TIMESZONE_DIFF * 3).then(a => console.log('-3h', a));
}