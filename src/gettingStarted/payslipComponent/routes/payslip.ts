import express from "express";
import * as payslipController from '../controller/payslip'
import { authenticateFirebaseUser } from "../../../auth/middlewares/authenticateFirebaseUser";


const route = express.Router()

route.post('/addDefault', authenticateFirebaseUser, async (req, res) => {
    try {
        const component = await payslipController.addDefaultComponent(req.body)
        res.json(component);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

route.post('/structure', authenticateFirebaseUser, async (req, res) => {
    try {
        const component = await payslipController.addStructure(req.body)
        res.json(component);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

route.post('/addComponent/:id', authenticateFirebaseUser, async (req, res) => {
    try {
        const component = await payslipController.addComponent(req.body, req.params.id)
        res.json(component);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

route.get('/structure', authenticateFirebaseUser, async (req, res) => {
    try {
        const structures = await payslipController.getAllStructure()
        res.json(structures);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });

    }
})

route.patch('/structure/:id', authenticateFirebaseUser, async (req, res) => {
    try {
        const structures = await payslipController.editStructure(req.params.id, req.body)
        res.json(structures);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})

route.get('/component/:id', authenticateFirebaseUser, async (req, res) => {
    try {
        const component = await payslipController.getComponent(req.params.id)
        res.json(component);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})

route.patch('/component/:id', authenticateFirebaseUser, async (req, res) => {
    try {
        const structures = await payslipController.editComponent(req.params.id, req.body)
        res.json(structures);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})

route.delete('/component/:id', authenticateFirebaseUser, async (req, res) => {
    try {
        const structures = await payslipController.deleteComponent(req.params.id)
        res.json(structures);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})

route.delete('/structure/:id', authenticateFirebaseUser, async (req, res) => {
    try {
        const structures = await payslipController.deleteStructure(req.params.id)
        res.json(structures);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})

route.get('/structureName', authenticateFirebaseUser, async (req, res) => {
    try {
        const structures = await payslipController.getStructureName()
        res.json(structures);
    }
    catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
})

export default route;