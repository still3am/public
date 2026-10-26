// Bound reads only. Never time out writes here: an unconfirmed write may have saved.
export function withReadTimeout(read, milliseconds = 15000, message = "This request took too long. Please retry.") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error(message), {status: 408, code: "READ_TIMEOUT"})), milliseconds);
    Promise.resolve(read).then(value => {clearTimeout(timer);resolve(value);}, error => {clearTimeout(timer);reject(error);});
  });
}
