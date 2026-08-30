import { addDoc, collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const userCollection = (uid, name) => collection(db, "users", uid, name);
const auditPayload = (entityType, entityId, action, reason, changes) => ({
  entityType, entityId, action, reason, changes, createdAt: serverTimestamp(),
});

export async function listCustomers(uid) {
  const snapshot = await getDocs(query(userCollection(uid, "customers"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createCustomer(uid, values) {
  return addDoc(userCollection(uid, "customers"), {
    name: values.name.trim(), primaryContact: values.primaryContact.trim(),
    secondaryContact: values.secondaryContact?.trim() || "",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function updateCustomer(uid, customerId, previous, values, reason) {
  const ref = doc(db, "users", uid, "customers", customerId);
  const auditRef = doc(userCollection(uid, "audits"));
  await runTransaction(db, async (tx) => {
    tx.update(ref, { ...values, updatedAt: serverTimestamp() });
    tx.set(auditRef, auditPayload("customer", customerId, "edited", reason, { before: previous, after: values }));
  });
}

export async function createBill(uid, customerId, values) {
  const duplicate = await getDocs(query(userCollection(uid, "bills"), where("billId", "==", values.billId.trim())));
  if (!duplicate.empty) throw new Error("This bill ID is already in use.");
  return addDoc(userCollection(uid, "bills"), {
    customerId, billId: values.billId.trim(), description: values.description.trim(), amount: Number(values.amount), status: values.status || "pending",
    billDate: values.billDate, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function addCredit(uid, billId, values) {
  return addDoc(userCollection(uid, "credits"), {
    billId, amount: Number(values.amount), paidAt: values.paidAt,
    note: values.note?.trim() || "", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function updateEntry(uid, collectionName, id, previous, values, reason) {
  const ref = doc(db, "users", uid, collectionName, id);
  const auditRef = doc(userCollection(uid, "audits"));
  await runTransaction(db, async (tx) => {
    const payload = { ...values, amount: Number(values.amount), updatedAt: serverTimestamp() };
    if (collectionName === "bills") {
      payload.billId = values.billId.trim();
      payload.description = values.description.trim();
      payload.status = values.status || previous.status || "pending";
    }
    if (collectionName === "credits") {
      payload.note = values.note?.trim() || "";
    }
    tx.update(ref, payload);
    tx.set(auditRef, auditPayload(collectionName.slice(0, -1), id, "edited", reason, { before: previous, after: values }));
  });
}

export async function getLedger(uid) {
  const names = ["bills", "credits", "audits"];
  const [bills, credits, audits] = await Promise.all(names.map(async (name) => {
    const snapshot = await getDocs(userCollection(uid, name));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }));
  return { bills, credits, audits };
}
