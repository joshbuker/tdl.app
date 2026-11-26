import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Calls `save` when the tab is hidden, closed or reloaded, while the component is mounted, so
 * typing that hasn't been saved yet isn't lost. It's best effort: the browser may end the page
 * before the device's storage has finished writing.
 */
export function useSaveWhenHidden(save: () => Promise<void>): void {
  const run = (): void => {
    save().catch((error: unknown) => {
      console.error(error);
    });
  };
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') run();
  };
  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', run);
  });
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', run);
  });
}
