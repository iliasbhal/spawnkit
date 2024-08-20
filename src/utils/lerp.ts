export const lerp = (min: number, max: number, ratio: number) => {
	return min + ratio * (max - min);
};
