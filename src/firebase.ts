import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
   storageBucket: "payroll-app-c9744.firebasestorage.app"
});

export default admin;
