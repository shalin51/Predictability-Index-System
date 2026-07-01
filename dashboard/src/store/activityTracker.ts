import { beginActivity, endActivity } from './activitySlice';
import type { AppDispatch } from './store';

export async function trackActivity<T>(
  dispatch: AppDispatch,
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  const action = beginActivity(label);
  dispatch(action);

  try {
    return await run();
  } finally {
    dispatch(endActivity(action.payload.id));
  }
}
