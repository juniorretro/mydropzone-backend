import { Request, Response } from 'express'
import prisma from '../lib/prisma'

function estimateArrival(courierLat: number, courierLng: number, destLat: number, destLng: number): string {
  const R = 6371
  const dLat = (destLat - courierLat) * Math.PI / 180
  const dLon = (destLng - courierLng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(courierLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const minutes = Math.round(dist / 0.5)
  if (minutes < 2) return 'Moins de 2 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.round(minutes / 60)}h${minutes % 60 > 0 ? minutes % 60 + 'min' : ''}`
}

export async function getTracking(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.orderId },
    include: { events: { orderBy: { createdAt: 'asc' } }, courier: true }
  })

  if (!order) return res.status(404).json({ message: 'Commande introuvable' })

  const origin: [number, number] = [order.pickupLat || 4.048, order.pickupLng || 9.692]
  const destination: [number, number] = [order.deliveryLat || 4.061, order.deliveryLng || 9.715]

  const courierPosition = (order.courier?.currentLat && order.courier?.currentLng)
    ? [order.courier.currentLat, order.courier.currentLng] as [number, number]
    : undefined

  const eta = (order.status === 'in_progress' && courierPosition && order.deliveryLat && order.deliveryLng)
    ? estimateArrival(courierPosition[0], courierPosition[1], order.deliveryLat, order.deliveryLng)
    : undefined

  return res.json({
    orderId: order.id,
    status: order.status,
    origin,
    destination,
    courierPosition,
    courier: order.courier ? {
      id: order.courier.id,
      name: order.courier.name,
      phone: order.courier.phone,
      vehicle: order.courier.vehicle,
      rating: order.courier.rating,
      totalOrders: order.courier.totalOrders,
      status: order.courier.status,
    } : undefined,
    estimatedArrival: eta,
    events: order.events.map(e => ({
      id: e.id,
      status: e.status,
      message: e.message,
      timestamp: e.createdAt.toISOString(),
      location: e.location,
    })),
  })
}
