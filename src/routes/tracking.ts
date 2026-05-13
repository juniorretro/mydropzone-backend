import { Router } from 'express'
import { getTracking } from '../controllers/trackingController'

const router = Router()
router.get('/:orderId', getTracking)
export default router
