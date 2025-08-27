import admin from "../../firebase";
import { Record } from "./records.model";

const db = admin.firestore();
const recordsCollection = db.collection("records");

export const addRecord = async (data: Record): Promise<string> => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const docRef = await recordsCollection.add({
    ...data,
    requestedDate: formattedDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const fetchAllRecords = async (year?: number): Promise<Record[]> => {
  const snapshot = await recordsCollection.get();

  let records = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Record[];

  if (year) {
    records = records.filter((rec) => {
      if (!rec.requestedDate) return false;
      const recordYear = new Date(rec.requestedDate).getFullYear();
      return recordYear === year;
    });
  }

  return records;
};
