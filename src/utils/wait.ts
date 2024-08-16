export const wait = async (timeout: number) => {
  return new Promise((r) => setTimeout(r, timeout));
};
