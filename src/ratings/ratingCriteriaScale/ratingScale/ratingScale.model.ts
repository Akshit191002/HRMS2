export interface RatingScale {
  id?: string;
  scaleId: number;
  description: string;
  updatedAt: FirebaseFirestore.Timestamp;
}
