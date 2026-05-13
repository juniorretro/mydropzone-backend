import express from 'express'
import http from 'http'
import { Server as SocketServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import 'dotenv/config'

import authRoutes from './routes/auth'
import orderRoutes from './routes/orders'
import courierRoutes from './routes/couriers'
import trackingRoutes from './routes/tracking'
import { errorHandler } from './middleware/errorHandler'
import prisma from './lib/prisma'

const app = express()
const server = http.createServer(app)

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mydropzone.pages.dev'

const io = new SocketServer(server, {
  cors: { origin: [FRONTEND_URL, 'http://localhost:3000'], methods: ['GET', 'POST'] }
})

// ── Middleware ──
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'], credentials: true }))
app.use(express.json())

// ── Routes ──
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }))
app.use('/v1/auth', authRoutes)
app.use('/v1/orders', orderRoutes)
app.use('/v1/couriers', courierRoutes)
app.use('/v1/tracking', trackingRoutes)
app.use(errorHandler)

// ── Socket.io — tracking temps réel ──
io.on('connection', (socket) => {
  // Livreur rejoint sa room
  socket.on('courier:join', (courierId: string) => {
    socket.join(`courier:${courierId}`)
  })

  // Client suit une commande
  socket.on('tracking:subscribe', (orderId: string) => {
    socket.join(`order:${orderId}`)
  })

  // Livreur envoie sa position → on broadcast aux clients qui suivent sa commande
  socket.on('courier:position', async (data: { courierId: string; orderId: string; lat: number; lng: number }) => {
    try {
      await prisma.courier.update({
        where: { id: data.courierId },
        data: { currentLat: data.lat, currentLng: data.lng }
      })
      io.to(`order:${data.orderId}`).emit('tracking:update', { lat: data.lat, lng: data.lng })
    } catch {}
  })

  // Livreur confirme livraison
  socket.on('order:delivered', (orderId: string) => {
    io.to(`order:${orderId}`).emit('tracking:delivered', { orderId })
  })
})

// Exporter io pour les controllers si besoin
export { io }

const PORT = parseInt(process.env.PORT || '4000')
server.listen(PORT, () => {
  console.log(`🚀 My DropZone API — http://localhost:${PORT}`)
})
