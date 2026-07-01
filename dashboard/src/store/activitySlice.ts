import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ActivityEntry {
  id: string;
  label: string;
}

interface ActivityState {
  entries: ActivityEntry[];
}

const initialState: ActivityState = {
  entries: [],
};

const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    beginActivity: {
      prepare(label: string) {
        return {
          payload: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            label,
          },
        };
      },
      reducer(state, action: PayloadAction<ActivityEntry>) {
        state.entries.push(action.payload);
      },
    },
    endActivity(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter((entry) => entry.id !== action.payload);
    },
  },
});

export const { beginActivity, endActivity } = activitySlice.actions;
export const activityReducer = activitySlice.reducer;
