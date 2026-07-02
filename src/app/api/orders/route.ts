import { NextRequest } from 'next/server'
import { authenticateRequest, apiError } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const params = req.nextUrl.searchParams
    const paymentStatus = params.get('payment_status')
    const deliveryStatus = params.get('delivery_status')
    const from = params.get('from')
    const to = params.get('to')
    const limit = Math.min(Number(params.get('limit') || 100), 500)
    const offset = Number(params.get('offset') || 0)

    const conditions: any[] = [eq(orders.organizationId, auth.organizationId)]
    if (paymentStatus) conditions.push(eq(orders.paymentStatus, paymentStatus))
    if (deliveryStatus) conditions.push(eq(orders.deliveryStatus, deliveryStatus))
    if (from) conditions.push(gte(orders.createdAt, new Date(from)))
    if (to) conditions.push(lte(orders.createdAt, new Date(to)))

    const rows = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset)

    // Fetch items for each order
    const orderIds = rows.map(o => o.id)
    let items: any[] = []
    if (orderIds.length > 0) {
      items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.organizationId, auth.organizationId))
    }

    const itemsByOrder = items.reduce((acc: Record<string, any[]>, item) => {
      if (!acc[item.orderId]) acc[item.orderId] = []
      acc[item.orderId].push(item)
      return acc
    }, {})

    const data = rows.map(o => ({ ...o, items: itemsByOrder[o.id] || [] }))

    return Response.json({ data })
  } catch (err: any) {
    return apiError(err.status || 500, err.message || 'Erro interno.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    const body = await req.json()

    if (!body.items || body.items.length === 0) {
      return apiError(400, 'Pedido deve ter pelo menos 1 item.')
    }

    const totalValue = body.items.reduce(
      (sum: number, item: any) => sum + (Number(item.unit_price) * Number(item.quantity || 1)),
      0
    )

    const [order] = await db
      .insert(orders)
      .values({
        organizationId: auth.organizationId,
        leadId: body.lead_id || null,
        paymentMethod: body.payment_method || 'pix',
        paymentStatus: body.payment_status || 'pending',
        deliveryStatus: body.delivery_status || 'pending',
        totalValue: body.total_value ?? totalValue,
        notes: body.notes || null,
        customerName: body.customer_name || null,
        customerPhone: body.customer_phone || null,
        customerEmail: body.customer_email || null,
        customerCpf: body.customer_cpf || null,
        customerCep: body.customer_cep || null,
        customerAddress: body.customer_address || null,
        customerAddressNumber: body.customer_address_number || null,
        customerAddressComplement: body.customer_address_complement || null,
        customerNeighborhood: body.customer_neighborhood || null,
        customerCity: body.customer_city || null,
        customerState: body.customer_state || null,
      })
      .returning()

    const itemValues = body.items.map((item: any) => ({
      orderId: order.id,
      organizationId: auth.organizationId,
      productId: item.product_id || null,
      productName: item.product_name,
      quantity: item.quantity || 1,
      unitPrice: item.unit_price,
    }))

    const insertedItems = await db.insert(orderItems).values(itemValues).returning()

    return Response.json({ data: { ...order, items: insertedItems } }, { status: 201 })
  } catch (err: any) {
    return apiError(err.status || 500, err.message || 'Erro interno.')
  }
}
