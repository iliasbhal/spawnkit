const ONE_HOUR = 1000 * 60 * 60;
const FIFTEEN_MINUTES = ONE_HOUR / 4; // 15min
const TIMESZONE_DIFF = FIFTEEN_MINUTES;

export const computeLatency = (timestamps: { before: number, remoteTime: number, after: number }) => {
  const timeSpent = timestamps.after - timestamps.before
  const isCannotCompute = timeSpent >= FIFTEEN_MINUTES;
  // if time spent is greater than 15 minutes, we cannot compute the latency
  // Because we can't detect if the difference is due to timezone or network latency
  if (isCannotCompute) {
    throw new Error('Cannot compute latency');
  }

  let up = timestamps.remoteTime - timestamps.before;
  let down = timestamps.after - timestamps.remoteTime;

  const timwzoneDiffUp = TIMESZONE_DIFF / up;
  const timwzoneDiffDown = TIMESZONE_DIFF / down;
  const times = Math.abs(Math.floor(1 / timwzoneDiffDown));

  if (timwzoneDiffUp < 0) {
    up += (TIMESZONE_DIFF * times)
    down -= (TIMESZONE_DIFF * times)
  } else if (timwzoneDiffDown < 0) {
    up -= (TIMESZONE_DIFF * times)
    down += (TIMESZONE_DIFF * times)
  }

  return {
    up: up,
    down: down,
    timeszoneDiffHours: times / 4,
    total: up + down,
  };
}