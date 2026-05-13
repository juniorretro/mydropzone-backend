import { Router } from 'express'
import { getOrders, getOrder, createOrder, updateStatus, assignCourier, acceptOrder, startDelivery } from '../controllers/orderController'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
router.get('/', requireAuth, requireAdmin, getOrders)
router.post('/', createOrder)
router.get('/:id', getOrder)
router.patch('/:id/status', requireAuth, requireAdmin, updateStatus)
router.patch('/:id/assign', requireAuth, requireAdmin, assignCourier)
router.patch('/:id/accept', requireAuth, acceptOrder)
router.patch('/:id/start', requireAuth, startDelivery)
export default router
