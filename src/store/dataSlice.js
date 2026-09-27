import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  customers: [], bills: [], credits: [], audits: [],
  loaded: { customers: false, bills: false, credits: false, audits: false },
};

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    customersReceived(state, action) { state.customers = action.payload; state.loaded.customers = true; },
    billsReceived(state, action) { state.bills = action.payload.filter((item) => !item.deleted); state.loaded.bills = true; },
    creditsReceived(state, action) { state.credits = action.payload.filter((item) => !item.deleted); state.loaded.credits = true; },
    auditsReceived(state, action) { state.audits = action.payload; state.loaded.audits = true; },
    dataCleared() { return initialState; },
  },
});

export const { customersReceived, billsReceived, creditsReceived, auditsReceived, dataCleared } = dataSlice.actions;
export default dataSlice.reducer;
