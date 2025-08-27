export interface RatingScores {
  clearGoals: number;
  accountability: number;
  teamwork: number;
  technicalSkills: number;
  communicationLevels: number;
  conflictsWellManaged: number;
}

export interface ProjectRating {
  projectName: string;
  managerId: string;
  reviewerName: string;
  scores: RatingScores;
  overallProjectRating?: number;
}

export interface MonthlyRatings {
  [month: string]: ProjectRating[];
}

export interface RatingInput {
  empName: string;
  code: string; // unique employee id
  department: string;
  designation: string;
  yearOfExperience: number;
  year: string;
  ratings: MonthlyRatings;
}
