import admin from "../../../firebase";
import { Criteria } from "./criteria.model";

const db = admin.firestore();
const criteriaCollection = db.collection("criteria");

export const addCriteria = async (data: Criteria): Promise<string> => {
  const docRef = await criteriaCollection.add({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
};

export const fetchAllCriteria = async (): Promise<Criteria[]> => {
  const snapshot = await criteriaCollection.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Criteria[];
};

export const modifyCriteria = async (
  id: string,
  data: Partial<Criteria>
): Promise<boolean> => {
  const docRef = criteriaCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.update({
    ...data,
    updatedAt: new Date(),
  });
  return true;
};

export const removeCriteria = async (id: string): Promise<boolean> => {
  const docRef = criteriaCollection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.delete();
  return true;
};
