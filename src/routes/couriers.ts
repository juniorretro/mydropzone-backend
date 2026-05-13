import { Router } from 'express'
import { getCouriers, getCourier, createCourier, updateCourierLocation, updateCourierStatus } from '../controllers/courierController'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
router.get('/', requireAuth, getCouriers)
router.post('/', requireAuth, requireAdmin, createCourier)
router.get('/:id', requireAuth, getCourier)
router.patch('/:id/location', requireAuth, updateCourierLocation)
router.patch('/:id/status', requireAuth, updateCourierStatus)
export default router
