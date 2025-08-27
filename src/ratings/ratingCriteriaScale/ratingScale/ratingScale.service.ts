import admin from "../../../firebase";
import { RatingScale } from "./ratingScale.model";

const db = admin.firestore();
const collection = db.collection("ratingScale");

export const fetchAllRatingScales = async (): Promise<RatingScale[]> => {
  const snapshot = await collection.orderBy("scaleId").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RatingScale[];
};

export const modifyRatingScale = async (
  scaleId: number,
  description: string
): Promise<boolean> => {
  const snapshot = await collection.where("scaleId", "==", scaleId).get();

  if (snapshot.empty) {
    await collection.add({
      scaleId,
      description,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return true;
  }

  const docRef = snapshot.docs[0].ref;
  await docRef.set(
    {
      description,
      updatedAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );

  return true;
};
