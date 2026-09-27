"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import FirestoreSync from "./FirestoreSync";

export default function StoreProvider({ children }) {
  return (
    <Provider store={store}>
      <FirestoreSync/>
      {children}
    </Provider>
  );
}
