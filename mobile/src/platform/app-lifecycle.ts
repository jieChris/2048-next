import { App } from "@capacitor/app";

export interface BackButtonEvent {
  canGoBack: boolean;
}

interface ListenerHandle {
  remove(): Promise<void>;
}

export interface AppLifecyclePort {
  addListener(
    eventName: "pause" | "resume",
    listener: () => void,
  ): Promise<ListenerHandle>;
  addListener(
    eventName: "backButton",
    listener: (event: BackButtonEvent) => void,
  ): Promise<ListenerHandle>;
}

export type AppLifecyclePhase = "pause" | "resume" | "backButton";

export interface AppLifecycleHandlers {
  onPause(): void | Promise<void>;
  onResume(): void | Promise<void>;
  onBackButton(event: BackButtonEvent): void | Promise<void>;
  onError(event: {
    phase: AppLifecyclePhase;
    error: unknown;
  }): void | Promise<void>;
}

export interface AppLifecycleBinding {
  drain(): Promise<void>;
  remove(): Promise<void>;
}

function rejectionReasons(
  results: readonly PromiseSettledResult<void>[],
): unknown[] {
  const reasons: unknown[] = [];
  for (const result of results) {
    if (result.status === "rejected") reasons.push(result.reason);
  }
  return reasons;
}

export async function bindAppLifecycle(
  app: AppLifecyclePort,
  handlers: AppLifecycleHandlers,
): Promise<AppLifecycleBinding> {
  const pending = new Set<Promise<void>>();
  let eventTail = Promise.resolve();
  let accepting = true;

  const schedule = (
    phase: AppLifecyclePhase,
    handler: () => void | Promise<void>,
  ): void => {
    if (!accepting) return;
    const operation = eventTail.then(handler);
    const guarded = operation.catch(async (error: unknown) => {
      try {
        await handlers.onError({ phase, error });
      } catch {
        // Lifecycle callbacks cannot surface exceptions to Capacitor safely.
      }
    });
    eventTail = guarded;
    pending.add(guarded);
    void guarded.then(() => pending.delete(guarded));
  };

  const drain = async (): Promise<void> => {
    while (pending.size > 0) await Promise.all([...pending]);
  };

  const handles: ListenerHandle[] = [];
  try {
    handles.push(
      await app.addListener("pause", () => {
        schedule("pause", () => handlers.onPause());
      }),
    );
    handles.push(
      await app.addListener("resume", () => {
        schedule("resume", () => handlers.onResume());
      }),
    );
    handles.push(
      await app.addListener("backButton", (event) => {
        schedule("backButton", () => handlers.onBackButton(event));
      }),
    );
  } catch (error) {
    accepting = false;
    const removalResults = await Promise.allSettled(
      handles.map((handle) => handle.remove()),
    );
    await drain();
    const cleanupErrors = rejectionReasons(removalResults);
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "app_lifecycle_registration_failed",
      );
    }
    throw error;
  }

  let removal: Promise<void> | null = null;

  return {
    drain,
    remove() {
      if (removal) return removal;
      accepting = false;
      removal = (async () => {
        const results = await Promise.allSettled(
          handles.map((handle) => handle.remove()),
        );
        await drain();
        const errors = rejectionReasons(results);
        if (errors.length > 0) {
          throw new AggregateError(errors, "app_lifecycle_remove_failed");
        }
      })();
      return removal;
    },
  };
}

export function bindAndroidAppLifecycle(
  handlers: AppLifecycleHandlers,
): Promise<AppLifecycleBinding> {
  return bindAppLifecycle(App, handlers);
}
