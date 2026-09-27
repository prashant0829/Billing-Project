"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { userCollection } from "@/services/billingService";
import { auditsReceived, billsReceived, creditsReceived, customersReceived, dataCleared } from "./dataSlice";

const COLLECTIONS = [
  { name: "customers", action: customersReceived },
  { name: "bills", action: billsReceived },
  { name: "credits", action: creditsReceived },
  { name: "audits", action: auditsReceived },
];

function toPlainData(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value?.toMillis === "function" ? value.toMillis() : value]));
}

export default function FirestoreSync() {
  const { effectiveUid } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!effectiveUid) { dispatch(dataCleared()); return; }
    const unsubscribers = COLLECTIONS.map(({ name, action }) =>
      onSnapshot(userCollection(effectiveUid, name), (snapshot) => {
        dispatch(action(snapshot.docs.map((item) => ({ id: item.id, ...toPlainData(item.data()) }))));
      }, (err) => console.error(`Firestore listener failed for "${name}":`, err.message))
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [effectiveUid, dispatch]);

  return null;
}
