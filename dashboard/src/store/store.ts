import { configureStore } from '@reduxjs/toolkit';
import { activityReducer } from './activitySlice';

export const store = configureStore({
  reducer: {
    activity: activityReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
