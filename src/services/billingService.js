import { addDoc, collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const userCollection = (uid, name) => collection(db, "users", uid, name);
const auditPayload = (entityType, entityId, action, reason, changes) => ({
  entityType, entityId, action, reason, changes, createdAt: serverTimestamp(),
});

export async function ensureUserProfile(uid, email) {
  await setDoc(doc(db, "users", uid), { email, updatedAt: serverTimestamp() }, { merge: true });
}

export async function listUserProfiles() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((item) => ({ uid: item.id, ...item.data() })).filter((item) => item.email);
}

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
  if (duplicate.docs.some((item) => !item.data().deleted)) throw new Error("This bill ID is already in use.");
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

export async function deleteEntry(uid, collectionName, id, previous, reason) {
  const ref = doc(db, "users", uid, collectionName, id);
  const auditRef = doc(userCollection(uid, "audits"));
  await runTransaction(db, async (tx) => {
    tx.update(ref, { deleted: true, deletedAt: serverTimestamp(), deleteReason: reason || "" });
    tx.set(auditRef, auditPayload(collectionName.slice(0, -1), id, "deleted", reason, { before: previous, after: null }));
  });
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function commitBatched(deletions = [], writes = []) {
  const ops = [...deletions.map((op) => ({ type: "delete", ...op })), ...writes.map((op) => ({ type: "set", ...op }))];
  for (const group of chunkArray(ops, 450)) {
    const batch = writeBatch(db);
    group.forEach((op) => { op.type === "delete" ? batch.delete(op.ref) : batch.set(op.ref, op.data); });
    await batch.commit();
  }
}

export async function deleteCustomersCascade(uid, customers, reason) {
  const customerIds = customers.map((c) => c.id);
  const billDocs = [];
  for (const chunk of chunkArray(customerIds, 10)) {
    const snapshot = await getDocs(query(userCollection(uid, "bills"), where("customerId", "in", chunk)));
    billDocs.push(...snapshot.docs);
  }
  const creditDocs = [];
  for (const chunk of chunkArray(billDocs.map((item) => item.id), 10)) {
    const snapshot = await getDocs(query(userCollection(uid, "credits"), where("billId", "in", chunk)));
    creditDocs.push(...snapshot.docs);
  }
  const deletions = [
    ...creditDocs.map((item) => ({ ref: item.ref })),
    ...billDocs.map((item) => ({ ref: item.ref })),
    ...customerIds.map((id) => ({ ref: doc(db, "users", uid, "customers", id) })),
  ];
  const writes = customers.map((customer) => ({
    ref: doc(userCollection(uid, "audits")),
    data: auditPayload("customer", customer.id, "purged", reason, { before: customer, after: null }),
  }));
  await commitBatched(deletions, writes);
  return { customerCount: customers.length, billCount: billDocs.length, creditCount: creditDocs.length };
}

export async function deleteUsersCascade(uids) {
  const deletions = [];
  for (const uid of uids) {
    for (const name of ["customers", "bills", "credits", "audits"]) {
      const snapshot = await getDocs(userCollection(uid, name));
      snapshot.docs.forEach((item) => deletions.push({ ref: item.ref }));
    }
    deletions.push({ ref: doc(db, "users", uid) });
  }
  await commitBatched(deletions);
  return { userCount: uids.length, docCount: deletions.length };
}

const SEED_DESCRIPTIONS = ["Website revamp", "Consulting retainer", "Server hosting", "Logo design", "Monthly maintenance", "API integration", "Mobile app build", "SEO audit", "Content writing", "Ad campaign setup"];
const SEED_STATUSES = ["pending", "paid", "cancelled"];

function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }
function randomDateWithinDays(days) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  return date.toISOString().slice(0, 10);
}

export async function seedTestData(uid, { customerCount = 2, billCount = 200 } = {}) {
  const customerRefs = [];
  for (let i = 0; i < customerCount; i++) {
    const ref = await addDoc(userCollection(uid, "customers"), {
      name: `Test Customer ${String.fromCharCode(65 + i)}`,
      primaryContact: `9000000${String(10 + i).padStart(3, "0")}`,
      secondaryContact: "", seedTag: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    customerRefs.push(ref);
  }

  const billBatch = writeBatch(db);
  const seededBills = [];
  for (let i = 0; i < billCount; i++) {
    const customerRef = customerRefs[i % customerRefs.length];
    const billRef = doc(userCollection(uid, "bills"));
    const amount = Math.round((100 + Math.random() * 9900) * 100) / 100;
    billBatch.set(billRef, {
      customerId: customerRef.id,
      billId: `TEST-${String(i + 1).padStart(4, "0")}`,
      description: randomFrom(SEED_DESCRIPTIONS),
      amount, status: randomFrom(SEED_STATUSES),
      billDate: randomDateWithinDays(180), seedTag: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    seededBills.push({ id: billRef.id, amount });
  }
  await billBatch.commit();

  const creditBatch = writeBatch(db);
  seededBills.forEach(({ id, amount }) => {
    if (Math.random() < 0.5) {
      const paidAmount = Math.round(amount * (0.3 + Math.random() * 0.7) * 100) / 100;
      creditBatch.set(doc(userCollection(uid, "credits")), {
        billId: id, amount: paidAmount, paidAt: randomDateWithinDays(90),
        note: "Test payment", seedTag: true,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
  });
  await creditBatch.commit();

  return { customerCount: customerRefs.length, billCount: seededBills.length };
}

export async function clearTestData(uid) {
  const [customers, bills, credits] = await Promise.all(["customers", "bills", "credits"].map(async (name) => {
    const snapshot = await getDocs(query(userCollection(uid, name), where("seedTag", "==", true)));
    return snapshot.docs;
  }));
  const batch = writeBatch(db);
  customers.forEach((item) => batch.delete(item.ref));
  bills.forEach((item) => batch.delete(item.ref));
  credits.forEach((item) => batch.delete(item.ref));
  await batch.commit();
  return { customerCount: customers.length, billCount: bills.length, creditCount: credits.length };
}

export async function getLedger(uid) {
  const names = ["bills", "credits", "audits"];
  const [bills, credits, audits] = await Promise.all(names.map(async (name) => {
    const snapshot = await getDocs(userCollection(uid, name));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }));
  return { bills: bills.filter((item) => !item.deleted), credits: credits.filter((item) => !item.deleted), audits };
}
