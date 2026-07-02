'use client'

import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X, Plus, Minus, MagnifyingGlass, Package, MapPin } from '@phosphor-icons/react'
import { LeadWithOwner } from '@/lib/types'

interface Product {
  id: string
  name: string
  price: string
  description?: string
}

interface OrderItem {
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
}

interface OrderModalProps {
  lead: LeadWithOwner
  organizationId: string
  onClose: () => void
  onSuccess?: (order: any) => void
}

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
]

const PAYMENT_STATUS_OPTS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
]

function maskCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

export default function OrderModal({ lead, organizationId, onClose, onSuccess }: OrderModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<OrderItem[]>([{ product_id: null, product_name: '', quantity: 1, unit_price: 0 }])
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [customerName, setCustomerName] = useState(lead.title || '')
  const [customerPhone, setCustomerPhone] = useState(lead.phone || '')
  const [customerEmail, setCustomerEmail] = useState(lead.email || '')
  const [cpf, setCpf] = useState('')
  const [cep, setCep] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressComplement, setAddressComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [showProductDropdown, setShowProductDropdown] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch('/api/products?include_inactive=false')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(({ data }) => setProducts(data || []))
      .catch(() => {})
  }, [])

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setAddress(data.logradouro || '')
        setNeighborhood(data.bairro || '')
        setCity(data.localidade || '')
        setState(data.uf || '')
      }
    } catch {}
    setCepLoading(false)
  }

  const totalValue = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  const handleItemProductSelect = (idx: number, product: Product) => {
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      product_id: product.id,
      product_name: product.name,
      unit_price: Number(product.price),
    } : item))
    setProductSearch(prev => ({ ...prev, [idx]: product.name }))
    setShowProductDropdown(prev => ({ ...prev, [idx]: false }))
  }

  const handleAddItem = () => {
    setItems(prev => [...prev, { product_id: null, product_name: '', quantity: 1, unit_price: 0 }])
  }

  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (items.some(item => !item.product_name.trim())) {
      setError('Preencha o nome do produto em todos os itens.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          delivery_status: 'pending',
          total_value: totalValue,
          notes: notes || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_cpf: cpf.replace(/\D/g, '') || null,
          customer_cep: cep.replace(/\D/g, '') || null,
          customer_address: address || null,
          customer_address_number: addressNumber || null,
          customer_address_complement: addressComplement || null,
          customer_neighborhood: neighborhood || null,
          customer_city: city || null,
          customer_state: state || null,
          items: items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar pedido')
      }
      const { data } = await res.json()
      if (onSuccess) onSuccess(data)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-[#1a2730] border border-[#2f3b44] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2f3b44]">
          <h2 className="text-lg font-bold text-[#e9edef]">Registrar Venda</h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 chat-dark-scroll">
          {/* Itens */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-3">Produtos</p>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const filteredProducts = products.filter(p =>
                  p.name.toLowerCase().includes((productSearch[idx] || '').toLowerCase())
                )
                return (
                  <div key={idx} className="flex items-start gap-2">
                    {/* Product selector */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Nome do produto..."
                        value={productSearch[idx] !== undefined ? productSearch[idx] : item.product_name}
                        onChange={e => {
                          setProductSearch(prev => ({ ...prev, [idx]: e.target.value }))
                          setItems(prev => prev.map((it, i) => i === idx ? { ...it, product_name: e.target.value, product_id: null } : it))
                          setShowProductDropdown(prev => ({ ...prev, [idx]: true }))
                        }}
                        onFocus={() => setShowProductDropdown(prev => ({ ...prev, [idx]: true }))}
                        onBlur={() => setTimeout(() => setShowProductDropdown(prev => ({ ...prev, [idx]: false })), 150)}
                        className="w-full px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] placeholder-[#667781] focus:outline-none focus:border-[#53bdeb]"
                      />
                      {showProductDropdown[idx] && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#233138] border border-[#2f3b44] rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              onMouseDown={() => handleItemProductSelect(idx, p)}
                              className="w-full text-left px-3 py-2 text-sm text-[#d1d7db] hover:bg-[#2a3942] flex items-center justify-between"
                            >
                              <span>{p.name}</span>
                              <span className="text-[#53bdeb] text-xs">R$ {Number(p.price).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Quantity */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))} className="w-7 h-7 rounded bg-[#202c33] border border-[#2f3b44] flex items-center justify-center text-[#8696a0] hover:text-[#e9edef]">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm text-[#e9edef]">{item.quantity}</span>
                      <button onClick={() => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))} className="w-7 h-7 rounded bg-[#202c33] border border-[#2f3b44] flex items-center justify-center text-[#8696a0] hover:text-[#e9edef]">
                        <Plus size={12} />
                      </button>
                    </div>
                    {/* Price */}
                    <div className="w-28 flex-shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price || ''}
                        onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: Number(e.target.value) } : it))}
                        placeholder="R$ 0,00"
                        className="w-full px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] placeholder-[#667781] focus:outline-none focus:border-[#53bdeb]"
                      />
                    </div>
                    {/* Remove */}
                    {items.length > 1 && (
                      <button onClick={() => handleRemoveItem(idx)} className="w-8 h-8 flex items-center justify-center text-[#667781] hover:text-red-400 flex-shrink-0 mt-0.5">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={handleAddItem} className="mt-2 flex items-center gap-1.5 text-sm text-[#53bdeb] hover:text-[#aedff7]">
              <Plus size={14} /> Adicionar produto
            </button>
          </div>

          {/* Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-2">Forma de Pagamento</p>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${paymentMethod === m.value ? 'bg-[#53bdeb] text-[#0b141a]' : 'bg-[#202c33] border border-[#2f3b44] text-[#8696a0] hover:border-[#53bdeb]'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-2">Status do Pagamento</p>
              <div className="flex gap-1.5">
                {PAYMENT_STATUS_OPTS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setPaymentStatus(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${paymentStatus === s.value ? (s.value === 'paid' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30') : 'bg-[#202c33] border border-[#2f3b44] text-[#8696a0] hover:border-[#53bdeb]'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dados do cliente */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-3">Dados do Cliente</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">Nome</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">Telefone</label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">E-mail</label>
                <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">CPF</label>
                <input value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb] placeholder-[#667781]" />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-3 flex items-center gap-1.5">
              <MapPin size={12} /> Endereço de Entrega
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">CEP</label>
                <input
                  value={cep}
                  onChange={e => setCep(maskCep(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb] placeholder-[#667781]"
                />
                {cepLoading && <span className="text-[10px] text-[#53bdeb]">Buscando...</span>}
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-[#8696a0] font-medium">Endereço</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Av..." className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb] placeholder-[#667781]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">Número</label>
                <input value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb]" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-[#8696a0] font-medium">Complemento</label>
                <input value={addressComplement} onChange={e => setAddressComplement(e.target.value)} placeholder="Apto, Bloco..." className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb] placeholder-[#667781]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">Bairro</label>
                <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">Cidade</label>
                <input value={city} onChange={e => setCity(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb]" />
              </div>
              <div>
                <label className="text-[10px] text-[#8696a0] font-medium">Estado</label>
                <input value={state} onChange={e => setState(e.target.value)} maxLength={2} placeholder="SP" className="w-full mt-1 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb] placeholder-[#667781]" />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0]">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas internas sobre o pedido..." className="w-full mt-2 px-3 py-2 text-sm bg-[#202c33] border border-[#2f3b44] rounded-lg text-[#e9edef] focus:outline-none focus:border-[#53bdeb] placeholder-[#667781] resize-none" />
          </div>

          {error && (
            <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#2f3b44] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#8696a0] font-bold uppercase tracking-wider">Total</span>
            <p className="text-xl font-bold text-[#53bdeb]">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-[#8696a0] hover:text-[#e9edef] transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 rounded-lg text-sm font-bold bg-[#53bdeb] text-[#0b141a] hover:bg-[#aedff7] disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {saving ? 'Salvando...' : 'Confirmar Venda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof window !== 'undefined' ? ReactDOM.createPortal(modal, document.body) : null
}
