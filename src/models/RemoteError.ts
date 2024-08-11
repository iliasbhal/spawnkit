
export class RemoteError extends Error {
  static deserialize(serializedError: { message: string; name: string }) {
    const error = new RemoteError();
    Object.assign(error, serializedError);
    return error;
  }


  static serialize(error: Error) {
    if (!error) {
      return null;
    }

    return Object.assign(
      {},
      error,
      {
        message: error.message,
        name: error.constructor.name,
        stack: error.stack,
      },
      {
        originalLine: undefined,
        originalColumn: undefined,
      },
    );
  }
}