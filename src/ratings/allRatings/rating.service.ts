import { firestore } from "firebase-admin";
import { RatingInput } from "./rating.model";

const db = firestore();
const employeeCollection = db.collection("empRating");
const monthlyRatingCollection = db.collection("employeeMonthlyRating");

export const addBulkRatings = async (data: RatingInput) => {
  const empRef = employeeCollection.doc(data.code);
  const empDoc = await empRef.get();

  let overallAverage = 0;

  // ✅ monthly rating calculation
  const yearlyRatings: any = {};
  for (const month in data.ratings) {
    const projects = data.ratings[month];

    const processedProjects = projects.map((p: any) => {
      const overallProjectRating =
        (p.scores.clearGoals +
          p.scores.accountability +
          p.scores.teamwork +
          p.scores.technicalSkills +
          p.scores.communicationLevels +
          p.scores.conflictsWellManaged) / 6;
      return {
        ...p,
        overallProjectRating,
      };
    });

    const monthlyAverage =
      processedProjects.reduce((sum: number, p: any) => sum + p.overallProjectRating, 0) /
      processedProjects.length;

    yearlyRatings[month] = {
      projects: processedProjects,
      monthlyAverage,
    };

    // ✅ store monthly data separately
    await monthlyRatingCollection.doc(`${data.code}_${month}_${data.year}`).set({
      employeeId: data.code,
      month,
      year: data.year,
      projects: processedProjects,
      monthlyAverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ✅ yearly overall average
  const allMonths = Object.values(yearlyRatings).map((m: any) => m.monthlyAverage);
  overallAverage = allMonths.reduce((sum, r) => sum + r, 0) / (allMonths.length || 1);

  // ✅ store / update employee document
  if (!empDoc.exists) {
    await empRef.set({
      empName: data.empName,
      code: data.code,
      department: data.department,
      designation: data.designation,
      yearOfExperience: data.yearOfExperience,
      createdAt: new Date(),
    });
  }

  // ✅ update employee summary
  await empRef.set(
    {
      overallAverage,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  return { employeeId: data.code, overallAverage };
};

export const getEmployeeWithRatings = async (
  employeeId?: string,
  year?: string,
  department?: string
) => {
  let query: FirebaseFirestore.Query = employeeCollection;

  // filter by department (if provided)
  if (department) {
    query = query.where("department", "==", department);
  }

  // filter by employeeId (if provided)
  if (employeeId) {
    query = query.where("code", "==", employeeId);
  }

  const empSnapshot = await query.get();

  if (empSnapshot.empty) {
    return [];
  }

  const employees: any[] = [];

  for (const empDoc of empSnapshot.docs) {
    const empData = empDoc.data();

    let ratings: any = {};
    if (year) {
      // fetch ratings for that year
      const ratingSnap = await monthlyRatingCollection
        .where("employeeId", "==", empDoc.id)
        .where("year", "==", year)
        .get();

      ratingSnap.forEach((doc) => {
        const data = doc.data();
        ratings[data.month] = {
          projects: data.projects,
          monthlyAverage: data.monthlyAverage,
        };
      });
    }

    employees.push({
      ...empData,
      id: empDoc.id,
      year: year || null,
      ratings,
    });
  }

  return employees;
};

export const updateEmployeeProjectScores = async (
  employeeId: string,
  year: string,
  month: string,
  projectName: string,
  scores: any,
  areaOfDevelopment?: string
) => {
  // find doc
  const snapshot = await monthlyRatingCollection
    .where("employeeId", "==", employeeId)
    .where("year", "==", year)
    .where("month", "==", month)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("Employee monthly rating not found");
  }

  const docRef = snapshot.docs[0].ref;
  const data = snapshot.docs[0].data();

  let projects = data.projects || [];

  // update the project scores
  projects = projects.map((project: any) => {
    if (project.projectName === projectName) {
      return {
        ...project,
        scores: { ...scores },
        overallProjectRating:
          Object.values(scores).reduce((a: number, b: any) => a + Number(b), 0) /
          Object.values(scores).length,
        ...(areaOfDevelopment ? { areaOfDevelopment } : {}), // add new attribute if passed
      };
    }
    return project;
  });

  // update in DB
  await docRef.update({ projects });

  return { employeeId, year, month, projectName, projects };
};

