'use client'

import { useState, useEffect } from 'react'
import { CurrencyDollar, TrendUp, TrendDown, Wallet, ArrowUp, ArrowDown, Package } from '@phosphor-icons/react'

interface Order {
  id: string
  customer_name: string | null
  payment_method: string
  payment_status: string
  delivery_status: string
  total_value: string
  created_at: string
  items: { product_name: string; quantity: number; unit_price: string }[]
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  boleto: 'Boleto Bancário',
  dinheiro: 'Dinheiro',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  refunded: 'Reembolsado',
}

export default function FinanceiroPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders?limit=200')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(({ data }) => setOrders(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const paidOrders = orders.filter(o => o.payment_status === 'paid')
  const pendingOrders = orders.filter(o => o.payment_status === 'pending')
  const refundedOrders = orders.filter(o => o.payment_status === 'refunded')

  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total_value), 0)
  const totalPending = pendingOrders.reduce((s, o) => s + Number(o.total_value), 0)
  const totalRefunded = refundedOrders.reduce((s, o) => s + Number(o.total_value), 0)
  const saldo = totalRevenue - totalRefunded

  // Payment method breakdown
  const byMethod = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((acc, o) => {
      acc[o.payment_method] = (acc[o.payment_method] || 0) + Number(o.total_value)
      return acc
    }, {} as Record<string, number>)

  const methodTotals = Object.entries(byMethod)
    .map(([method, total]) => ({ method, total }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <CurrencyDollar size={28} className="text-green-600" weight="fill" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-sm text-gray-500">Visão geral das receitas e movimentações</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Faturamento</span>
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendUp size={18} className="text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{paidOrders.length} pedidos pagos</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Pendente</span>
              <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center">
                <ArrowUp size={18} className="text-yellow-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-gray-400 mt-1">{pendingOrders.length} pedidos pendentes</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Reembolsos</span>
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <TrendDown size={18} className="text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRefunded)}</p>
            <p className="text-xs text-gray-400 mt-1">{refundedOrders.length} pedidos reembolsados</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Saldo Líquido</span>
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Wallet size={18} className="text-blue-500" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatCurrency(saldo)}</p>
            <p className="text-xs text-gray-400 mt-1">faturado − reembolsos</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Movimentações */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Movimentações</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400">Carregando...</div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <Package size={32} className="text-gray-300" />
                <p className="text-gray-400 text-sm">Nenhuma movimentação ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {orders.slice(0, 50).map(order => {
                  const isPaid = order.payment_status === 'paid'
                  const isRefunded = order.payment_status === 'refunded'
                  const mainProduct = order.items[0]?.product_name || 'Pedido'
                  const extraCount = order.items.length - 1
                  return (
                    <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-green-50' : isRefunded ? 'bg-red-50' : 'bg-yellow-50'}`}>
                          {isPaid ? <ArrowUp size={14} className="text-green-500" /> : isRefunded ? <ArrowDown size={14} className="text-red-500" /> : <ArrowUp size={14} className="text-yellow-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {mainProduct}{extraCount > 0 ? ` +${extraCount}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">{order.customer_name || 'Cliente'} · {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isPaid ? 'text-green-600' : isRefunded ? 'text-red-500' : 'text-yellow-600'}`}>
                          {isRefunded ? '−' : '+'}{formatCurrency(Number(order.total_value))}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Payment Methods Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Por forma de pagamento</h2>
              {methodTotals.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-3">
                  {methodTotals.map(({ method, total }) => {
                    const pct = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{PAYMENT_METHOD_LABELS[method] || method}</span>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}% do faturamento</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Status summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Resumo por status</h2>
              <div className="space-y-2">
                {Object.entries(PAYMENT_STATUS_LABELS).map(([status, label]) => {
                  const count = orders.filter(o => o.payment_status === status).length
                  const total = orders.filter(o => o.payment_status === status).reduce((s, o) => s + Number(o.total_value), 0)
                  return (
                    <div key={status} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{label}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</p>
                        <p className="text-xs text-gray-400">{count} pedido{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
