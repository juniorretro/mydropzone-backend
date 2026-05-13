import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'

const CITY_PRICING: Record<string, { normal: number; express: number }> = {
  'Douala':    { normal: 2000, express: 4000 },
  'Yaoundé':   { normal: 1500, express: 3000 },
  'Bafoussam': { normal: 1500, express: 3000 },
  'Buea':      { normal: 1500, express: 3000 },
  'Limbe':     { normal: 1500, express: 3000 },
  'Bamenda':   { normal: 1500, express: 3000 },
  'default':   { normal: 2000, express: 4000 },
}

function calculateAmount(orderType: string, serviceSpeed: string, pickupCity?: string, weight?: number): number {
  if (orderType === 'intercity') {
    const base = serviceSpeed === 'express' ? 8000 : 5000
    const weightFee = weight && weight > 5 ? Math.ceil(weight - 5) * 200 : 0
    return base + weightFee
  }
  const pricing = CITY_PRICING[pickupCity || 'default'] || CITY_PRICING['default']
  const base = pricing[serviceSpeed as 'normal' | 'express']
  const weightFee = weight && weight > 10 ? Math.ceil(weight - 10) * 150 : 0
  return base + weightFee
}

function generateOrderId(): string {
  return 'MDZ-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-4).padStart(4, '0')
}

function buildWhatsAppMessage(data: any, orderId: string, amount: number): string {
  const type = data.orderType === 'intercity' ? 'Inter-ville' : 'Locale'
  const speed = data.serviceSpeed === 'express' ? '⚡ Express' : '🐢 Normal'
  const from = data.pickupCity ? `${data.pickupAddress} (${data.pickupCity})` : data.pickupAddress
  const to = data.deliveryCity ? `${data.deliveryAddress} (${data.deliveryCity})` : data.deliveryAddress
  return (
    `🚀 *Nouvelle commande My DropZone*\n\n` +
    `📦 *Référence:* ${orderId}\n` +
    `📋 *Type:* ${type} · ${speed}\n` +
    `📦 *Colis:* ${data.packageType}${data.weight ? ` (${data.weight}kg)` : ''}\n` +
    `\n📤 *Expéditeur*\nNom: ${data.clientName}\nTél: ${data.clientPhone}\nAdresse: ${from}\n` +
    `\n📥 *Destinataire*\nNom: ${data.receiverName}\nTél: ${data.receiverPhone}\nAdresse: ${to}\n` +
    (data.instructions ? `\n⚠️ *Instructions:* ${data.instructions}\n` : '') +
    `\n💰 *Montant estimé:* ${amount.toLocaleString()} FCFA\n\nMerci de confirmer. My DropZone 🇨🇲`
  )
}

export async function getOrders(req: Request, res: Response) {
  const { status, page = '1', limit = '10', search } = req.query
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  const where: Prisma.OrderWhereInput = {}
  if (status) where.status = status as any
  if (search) {
    where.OR = [
      { id: { contains: search as string, mode: 'insensitive' } },
      { clientName: { contains: search as string, mode: 'insensitive' } },
      { receiverName: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
    prisma.order.count({ where }),
  ])

  return res.json({ data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) })
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { events: true } })
  if (!order) return res.status(404).json({ message: 'Commande introuvable' })
  return res.json(order)
}

export async function createOrder(req: Request, res: Response) {
  const data = req.body
  const orderId = generateOrderId()
  const amount = calculateAmount(data.orderType, data.serviceSpeed || 'normal', data.pickupCity, data.weight)
  const waNumber = process.env.WHATSAPP_NUMBER || '237600000000'
  const msg = buildWhatsAppMessage(data, orderId, amount)

  const order = await prisma.order.create({
    data: {
      id: orderId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      pickupCity: data.pickupCity,
      deliveryCity: data.deliveryCity,
      packageType: data.packageType,
      weight: data.weight,
      description: data.description,
      instructions: data.instructions,
      orderType: data.orderType,
      serviceSpeed: data.serviceSpeed || 'normal',
      amount,
      events: {
        create: { status: 'pending', message: 'Commande reçue et confirmée', location: data.pickupCity || 'Cameroun' }
      }
    }
  })

  return res.status(201).json({
    orderId: order.id,
    whatsappLink: `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`,
    amount,
  })
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body
  if (!status) return res.status(400).json({ message: 'Statut requis' })

  const order = await prisma.order.update({
    where: { id },
    data: {
      status,
      events: {
        create: {
          status,
          message: {
            pending: 'Commande en attente',
            accepted: 'Commande acceptée par un livreur',
            in_progress: 'Livreur en route',
            delivered: 'Colis livré avec succès ✅',
            cancelled: 'Commande annulée',
          }[status as string] || 'Statut mis à jour',
        }
      }
    }
  })
  return res.json(order)
}

export async function assignCourier(req: Request, res: Response) {
  const { id } = req.params
  const { courierId } = req.body
  const courier = await prisma.courier.findUnique({ where: { id: courierId } })
  if (!courier) return res.status(404).json({ message: 'Livreur introuvable' })

  const order = await prisma.order.update({
    where: { id },
    data: {
      courierId,
      courierName: courier.name,
      status: 'accepted',
      events: {
        create: { status: 'accepted', message: `Commande assignée à ${courier.name}`, location: courier.zone }
      }
    }
  })
  return res.json(order)
}

export async function acceptOrder(req: Request, res: Response) {
  const { id } = req.params
  const { courierId } = req.body
  const courier = await prisma.courier.findUnique({ where: { id: courierId } })
  if (!courier) return res.status(404).json({ message: 'Livreur introuvable' })

  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: {
        courierId,
        courierName: courier.name,
        status: 'accepted',
        events: {
          create: { status: 'accepted', message: `Colis accepté par ${courier.name}`, location: courier.zone }
        }
      }
    }),
    prisma.courier.update({ where: { id: courierId }, data: { status: 'active' } }),
  ])
  return res.json(order)
}

export async function startDelivery(req: Request, res: Response) {
  const { id } = req.params
  const { courierId } = req.body
  const courier = await prisma.courier.findUnique({ where: { id: courierId } })
  if (!courier) return res.status(404).json({ message: 'Livreur introuvable' })

  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: {
        status: 'in_progress',
        events: {
          create: { status: 'in_progress', message: `Livreur en route vers la destination`, location: 'En transit' }
        }
      }
    }),
    prisma.courier.update({ where: { id: courierId }, data: { activeOrderId: id } }),
  ])
  return res.json(order)
}
