import { requireToolOwner } from "./request.server";

/** Close an owner job stream when its session expires or is revoked. */
export function ownerEventStream<T extends { type: string }>(
  request: Request,
  first: T,
  subscribe: (send: (event: T) => void) => () => void,
  encode: (event: T) => string,
) {
  let stop = () => {};
  let cancel = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let unsubscribe = () => {};
      let timer: ReturnType<typeof setInterval> | undefined;
      let pending = Promise.resolve();
      const close = (notify: boolean) => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(timer);
        request.signal.removeEventListener("abort", stop);
        if (notify) controller.close();
      };
      stop = () => close(true);
      cancel = () => close(false);
      const send = (event: T) => {
        pending = pending.then(async () => {
          if (closed) return;
          try {
            await requireToolOwner(request);
            if (closed) return;
            controller.enqueue(encoder.encode(encode(event)));
            if (event.type === "complete" || event.type === "failed") stop();
          } catch { stop(); }
        });
      };
      request.signal.addEventListener("abort", stop, { once: true });
      if (request.signal.aborted) { stop(); return; }
      send(first);
      if (first.type !== "complete" && first.type !== "failed") {
        unsubscribe = subscribe(send);
        timer = setInterval(() => { void requireToolOwner(request).catch(stop); }, 5_000);
      }
    },
    cancel() { cancel(); },
  });
}
