import { NextRequest } from 'next/server'
import { authenticateRequest, apiError } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req)
    const { id } = await params

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.organizationId, auth.organizationId)))
      .limit(1)

    if (!order) return apiError(404, 'Pedido não encontrado.')

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))

    return Response.json({ data: {
      id: order.id,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      delivery_status: order.deliveryStatus,
      total_value: order.totalValue,
      notes: order.notes,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      items: items.map(i => ({
        id: i.id,
        product_name: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
    }})
  } catch (err: any) {
    return apiError(err.status || 500, err.message || 'Erro interno.')
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req)
    const { id } = await params
    const body = await req.json()

    const updates: Record<string, any> = { updatedAt: new Date() }
    if (body.payment_status !== undefined) updates.paymentStatus = body.payment_status
    if (body.delivery_status !== undefined) updates.deliveryStatus = body.delivery_status
    if (body.payment_method !== undefined) updates.paymentMethod = body.payment_method
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.total_value !== undefined) updates.totalValue = body.total_value

    const [order] = await db
      .update(orders)
      .set(updates)
      .where(and(eq(orders.id, id), eq(orders.organizationId, auth.organizationId)))
      .returning()

    if (!order) return apiError(404, 'Pedido não encontrado.')
    return Response.json({ data: {
      id: order.id,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      delivery_status: order.deliveryStatus,
      total_value: order.totalValue,
      notes: order.notes,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    }})
  } catch (err: any) {
    return apiError(err.status || 500, err.message || 'Erro interno.')
  }
}
