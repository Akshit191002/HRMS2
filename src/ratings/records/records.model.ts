export interface Record {
  id?: string;
  month: string;
  requestedDate?: Date | null;
  employeeOpenFrom?: Date | null;
  employeeOpenTo?: Date | null;
  managerOpenFrom?: Date | null;
  managerOpenTo?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
