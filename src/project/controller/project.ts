import * as admin from 'firebase-admin';
import { Project } from '../models/project';
import { Resources } from '../models/resouces';
import logger from '../../utils/logger';

const db = admin.firestore();
const projectCollection = db.collection('projects');

export const createProject = async (data: Project) => {
  try {
    logger.info('Creating new project');
    const docRef = projectCollection.doc();
    const project = { id: docRef.id, ...data, isDeleted: false, teamMember: 0 };

    await docRef.set(project);
    logger.info('Project created successfully', { projectId: docRef.id });

    return {
      message: 'Project created successfully',
      project: project,
    };
  } catch (error) {
    logger.error('Error creating project', { error });
    throw error;
  }
};

export const getProject = async (id: string) => {
  try {
    logger.info(`Fetching project with ID: ${id}`);
    const projectRef = db.collection('projects').doc(id);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      throw new Error('Project not found');
    }

    const projectData = projectSnap.data() as Project;

    if (projectData.isDeleted) {
      throw new Error('Project has been deleted');
    }

    logger.info(`Fetching resources for project: ${id}`);
    const resourceIds: string[] = projectData.resources || [];

    const resourcePromises = resourceIds.map(async (id) => {
      const snap = await db
        .collection('resources')
        .where('isDeleted', '==', false)
        .where('id', '==', id)
        .limit(1)
        .get();

      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      return null;
    });

    const resourceDetails = (await Promise.all(resourcePromises)).filter(Boolean);
    return {
      id: projectSnap.id,
      ...projectData,
      resources: resourceDetails,
    };
  } catch (error) {
    logger.error(`Error fetching project with ID ${id}`, { error });
    throw error;
  }
};

export const allocateEmployeeToProject = async (projectId: string, allocation: Resources) => {
  try {
    logger.info(`Allocating employee to project`);

    const allocationRef = db.collection('resources').doc();
    const projectRef = db.collection('projects').doc(projectId);

    const generalSnap = await db
      .collection('general')
      .where('empCode', '==', allocation.empCode)
      .limit(1)
      .get();

    if (generalSnap.empty) {
      throw new Error(`No Employee Found with empCode: ${allocation.empCode}`);
    }

    const generalDoc = generalSnap.docs[0];
    const generalData = generalDoc.data();
    const generalId = generalDoc.id;

    const employeeSnap = await db
      .collection('employees')
      .where('generalId', '==', generalId)
      .limit(1)
      .get();

    const employeeDoc = employeeSnap.docs[0];
    const employeeId = employeeDoc.id;

    const employeeData = employeeDoc.data();
    const professionalSnap = db.collection('professional').doc(employeeData.professionalId);
    const pro = await professionalSnap.get();
    const professionalData = pro.data();

    if (!professionalData) {
      throw new Error('Professional data not found');
    }

    const nameMatches =
      generalData.name.first.trim().toLowerCase() === allocation.name.trim().toLowerCase();
    const departmentMatches =
      professionalData.department?.trim().toLowerCase() === allocation.department.trim().toLowerCase();
    const designationMatches =
      professionalData.designation?.trim().toLowerCase() === allocation.designation.trim().toLowerCase();

    if (!nameMatches) {
      throw new Error(`Name mismatch: expected "${generalData.name.first}", got "${allocation.name}"`);
    }

    if (!departmentMatches) {
      throw new Error(
        `Department mismatch: expected "${professionalData.department}", got "${allocation.department}"`
      );
    }

    if (!designationMatches) {
      throw new Error(
        `Designation mismatch: expected "${professionalData.designation}", got "${allocation.designation}"`
      );
    }

    const employeeRef = db.collection('employees').doc(employeeId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      throw new Error(`Project with ID ${projectId} does not exist`);
    }

    const projectData = projectSnap.data();
    const currentTeamCount = projectData?.teamMember || 0;

    const batch = db.batch();
    batch.set(allocationRef, {
      id: allocationRef.id,
      ...allocation,
    });

    batch.update(projectRef, {
      resources: admin.firestore.FieldValue.arrayUnion(allocationRef.id),
      teamMember: currentTeamCount + 1,
    });

    batch.update(employeeRef, {
      projectId: admin.firestore.FieldValue.arrayUnion(allocationRef.id),
    });

    await batch.commit();
    return {
      message: 'Employee allocated successfully',
      allocationId: allocationRef.id,
    };
  } catch (error) {
    logger.error(`Error allocating employee to project ${projectId}`, { error });
    throw error;
  }
};

export const editProject = async (id: string, data: Partial<Project>) => {
  try {
    logger.info(`Editing project with ID: ${id}`);
    const projectRef = db.collection('projects').doc(id);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      throw new Error(`Project with id ${id} does not exist`);
    }

    await projectRef.update({ ...data, updatedAt: Date.now() });

    return {
      message: 'Project updated successfully',
      projectId: id,
    };
  } catch (error) {
    logger.error(`Error editing project with ID ${id}`, { error });
    throw error;
  }
};

export const deleteProject = async (id: string) => {
  try {
    logger.info(`Deleting project with ID: ${id}`);
    const projectRef = db.collection('projects').doc(id);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      throw new Error(`Project with id ${id} does not exist`);
    }

    const projectData = projectSnap.data();
    const resourceEmpCodes: string[] = projectData?.resources || [];

    const batch = db.batch();
    batch.update(projectRef, { isDeleted: true });

    for (const empCode of resourceEmpCodes) {
      const resSnap = await db
        .collection('resources')
        .where('empCode', '==', empCode)
        .limit(1)
        .get();

      if (!resSnap.empty) {
        const resDoc = resSnap.docs[0];
        batch.update(resDoc.ref, { isDeleted: true });
      }
    }

    await batch.commit();
    return {
      message: 'Project and associated resources deleted successfully',
      projectId: id,
    };
  } catch (error) {
    logger.error(`Error deleting project with ID ${id}`, { error });
    throw error;
  }
};

export const getAllProjects = async () => {
  try {
    logger.info(`Fetching all projects`);
    const snapshot = await db.collection('projects').where('isDeleted', '!=', true).get();
    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return projects;
  } catch (error) {
    logger.error(`Error fetching all projects`, { error });
    throw error;
  }
};

export const editResources = async (id: string, updatedData: Partial<Resources>) => {
  try {
    logger.info(`Editing resource with ID: ${id}`);
    const resourceRef = db.collection('resources').doc(id);
    const resourceSnap = await resourceRef.get();

    if (!resourceSnap.exists) {
      throw new Error(`Resource with ID ${id} not found`);
    }

    await resourceRef.update({ ...updatedData, updatedAt: Date.now() });

    return {
      message: 'Resource allocation updated successfully',
      resourceId: id,
      updatedFields: updatedData,
    };
  } catch (error) {
    logger.error(`Error editing resource with ID ${id}`, { error });
    throw error;
  }
};

export const deleteResources = async (id: string) => {
  try {
    logger.info(`Deleting resource with ID: ${id}`);
    const resourceRef = db.collection("resources").doc(id);
    const resourceSnap = await resourceRef.get();

    if (!resourceSnap.exists) {
      throw new Error(`Resource with ID ${id} not found`);
    }

    await resourceRef.update({ isDeleted: true });

    const projectSnap = await db
      .collection("projects")
      .where("resources", "array-contains", id)
      .get();

    const batch = db.batch();

    projectSnap.forEach((doc) => {
      const projectRef = doc.ref;
      const projectData = doc.data();

      const updatedResources = (projectData.resources || []).filter(
        (resId: string) => resId !== id
      );
      
      const updatedTeamMember =
        (projectData.teamMember || 0) > 0
          ? projectData.teamMember - 1
          : 0;

      batch.update(projectRef, {
        resources: updatedResources,
        teamMember: updatedTeamMember,
      });
    });

    await batch.commit();

    return {
      message: "Resource deleted successfully and removed from projects",
      resourceId: id,
    };
  } catch (error) {
    logger.error(`Error deleting resource with ID ${id}`, { error });
    throw error;
  }
};
