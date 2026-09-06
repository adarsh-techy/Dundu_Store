import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, PackagePlus,
  ChevronDown, ChevronUp, X, Search, Tag, Check,
} from 'lucide-react';
import { comboApi, productApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

// Images are stored as full URLs or served from the backend
function imgUrl(src) {
  if (!src) return null;
  return src;
}

// ── Product Search Picker (inside slot) ────────────────────────────────────────
function ProductPicker({ selectedIds, onChange, allProducts }) {
  const [query, setQuery] = useState('');
  const filtered = allProducts.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (prod) => {
    const exists = selectedIds.some((x) => x.id === prod.id);
    if (exists) onChange(selectedIds.filter((x) => x.id !== prod.id));
    else onChange([...selectedIds, { id: prod.id, name: prod.name, image: prod.image }]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((p) => (
            <span key={p.id} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {p.name}
              <button onClick={() => toggle(p)} className="hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown list */}
      {query && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.slice(0, 20).map((prod) => {
            const isSelected = selectedIds.some((x) => x.id === prod.id);
            const uri = imgUrl(prod.image);
            return (
              <button
                key={prod.id}
                onClick={() => toggle(prod)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
              >
                {uri
                  ? <img src={uri} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  : <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">{prod.name[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{prod.name}</p>
                  <p className="text-[10px] text-gray-400">{prod.sku || ''}</p>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No products found</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Slot Editor ────────────────────────────────────────────────────────────────
function SlotEditor({ slots, setSlots, allProducts }) {
  const addSlot = () =>
    setSlots((prev) => [
      ...prev,
      { slot_label: '', requires_selection: true, products: [] },
    ]);

  const removeSlot = (i) => setSlots((prev) => prev.filter((_, j) => j !== i));

  const updateSlot = (i, key, val) =>
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, [key]: val } : s)));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-extrabold text-violet-700 uppercase tracking-wide">Slots</p>
        <button
          type="button"
          onClick={addSlot}
          className="flex items-center gap-1 text-xs text-violet-600 font-semibold px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Slot
        </button>
      </div>

      {slots.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4 rounded-xl border border-dashed border-gray-200">
          No slots yet — click "Add Slot" to start building the combo
        </p>
      )}

      <div className="space-y-3">
        {slots.map((slot, i) => (
          <div key={i} className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <input
                value={slot.slot_label}
                onChange={(e) => updateSlot(i, 'slot_label', e.target.value)}
                placeholder="Slot label, e.g. Churidhar, Earrings…"
                className="flex-1 border border-violet-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-violet-500 bg-white"
              />
              <button type="button" onClick={() => removeSlot(i)} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* requires_selection toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <div
                onClick={() => updateSlot(i, 'requires_selection', !slot.requires_selection)}
                className={`w-9 h-5 rounded-full relative transition-colors ${slot.requires_selection ? 'bg-violet-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${slot.requires_selection ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-xs font-medium text-gray-700">
                {slot.requires_selection
                  ? '📐 Requires size/color selection'
                  : '✨ No selection needed (auto-included)'}
              </span>
            </label>

            {/* Product picker */}
            <div className="pl-1">
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                {slot.products.length > 1 ? 'User picks one from:' : 'Product:'}
              </p>
              <ProductPicker
                selectedIds={slot.products}
                onChange={(prods) => updateSlot(i, 'products', prods)}
                allProducts={allProducts}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Combo Modal (Create / Edit) ────────────────────────────────────────────────
function ComboModal({ editing, allProducts, onClose, onSaved }) {
  const isEdit = !!editing;
  const [form, setForm] = useState({
    name: editing?.name || '',
    description: editing?.description || '',
    price: editing?.price || '',
    offer_price: editing?.offer_price || '',
    stock: editing?.stock ?? 100,
    sort_order: editing?.sort_order ?? 0,
  });
  const [slots, setSlots] = useState(
    editing?.slots?.map((s) => ({
      slot_label: s.slot_label,
      requires_selection: s.requires_selection,
      products: (s.products || []).map((p) => ({ id: p.id, name: p.name, image: p.image })),
    })) || []
  );
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(editing?.image_url ? imgUrl(editing.image_url) : '');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (slots.length === 0) { toast.error('Add at least one slot'); return; }
    if (slots.some((s) => !s.slot_label.trim())) { toast.error('All slots must have a label'); return; }
    if (slots.some((s) => s.products.length === 0)) { toast.error('Each slot must have at least one product'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', form.price);
      fd.append('offer_price', form.offer_price || '');
      fd.append('stock', form.stock);
      fd.append('sort_order', form.sort_order);
      fd.append('slots', JSON.stringify(slots));
      if (imageFile) fd.append('image', imageFile);

      if (isEdit) await comboApi.update(editing.id, fd);
      else await comboApi.create(fd);

      toast.success(isEdit ? 'Combo updated!' : 'Combo created!');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Combo' : 'Create Combo'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Combo Name" value={form.name} onChange={set('name')} required />
          </div>
          <Input label="Price (₹)" type="number" value={form.price} onChange={set('price')} required />
          <Input label="Offer Price (₹)" type="number" value={form.offer_price} onChange={set('offer_price')} placeholder="Optional" />
          <Input label="Stock" type="number" value={form.stock} onChange={set('stock')} />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={set('sort_order')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={2}
            placeholder="Short description of this combo…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Combo Image</label>
          <div className="flex items-center gap-3">
            {preview && (
              <img src={preview} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" />
            )}
            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-3 px-4 cursor-pointer hover:border-indigo-400 transition-colors">
              <span className="text-xs text-gray-500">{imageFile ? imageFile.name : 'Click to choose image'}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, WebP · max 5MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        </div>

        {/* Slot Builder */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <SlotEditor slots={slots} setSlots={setSlots} allProducts={allProducts} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Combo'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Combos() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);

  const { data: comboData, isLoading } = useQuery({
    queryKey: ['admin-combos'],
    queryFn: comboApi.list,
  });

  // Fetch flat product list for the picker
  const { data: productData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productApi.list({ limit: 500 }),
  });

  const combos = comboData?.data?.combos || [];
  const allProducts = productData?.data?.products || [];

  const refresh = () => {
    setModal(null);
    setSelected(null);
    qc.invalidateQueries({ queryKey: ['admin-combos'] });
  };

  const handleToggle = async (combo) => {
    try {
      await comboApi.toggle(combo.id);
      qc.invalidateQueries({ queryKey: ['admin-combos'] });
      toast.success(combo.is_active ? 'Combo deactivated' : 'Combo activated');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (combo) => {
    if (!confirm(`Delete combo "${combo.name}"?`)) return;
    try {
      await comboApi.remove(combo.id);
      toast.success('Combo deleted');
      qc.invalidateQueries({ queryKey: ['admin-combos'] });
    } catch (err) { toast.error(err.message || 'Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-violet-600" />
            Combo Products
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Bundle multiple products into a single purchasable combo
          </p>
        </div>
        <Button onClick={() => setModal('create')}>
          <Plus className="h-4 w-4" /> New Combo
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="font-semibold text-gray-800">{combos.length}</span> total ·
        <span className="font-semibold text-green-700">{combos.filter((c) => c.is_active).length}</span> active ·
        <span className="font-semibold text-gray-500">{combos.filter((c) => !c.is_active).length}</span> inactive
      </div>

      {/* List */}
      {isLoading ? (
        <Spinner />
      ) : combos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <PackagePlus className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No combos yet</p>
          <p className="text-sm">Create your first combo bundle!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {combos.map((combo) => {
            const uri = imgUrl(combo.image_url);
            const slotCount = combo.slots?.length || 0;
            return (
              <div
                key={combo.id}
                className={`rounded-2xl border p-4 transition-all ${combo.is_active ? 'border-violet-200 bg-white shadow-sm' : 'border-dashed border-gray-200 bg-gray-50 opacity-60'}`}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {uri
                    ? <img src={uri} alt={combo.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100" />
                    : (
                      <div className="w-16 h-16 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <PackagePlus className="h-7 w-7 text-violet-500" />
                      </div>
                    )
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{combo.name}</p>
                    {combo.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{combo.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {combo.offer_price && parseFloat(combo.offer_price) > 0 ? (
                        <>
                          <span className="text-sm font-bold text-violet-700">₹{combo.offer_price}</span>
                          <span className="text-xs text-gray-400 line-through">₹{combo.price}</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-gray-800">₹{combo.price}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slot summary */}
                <div className="mb-3 space-y-1">
                  {(combo.slots || []).map((slot, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Tag className="h-3 w-3 text-violet-400 shrink-0" />
                      <span className="font-medium truncate">{slot.slot_label}</span>
                      {slot.requires_selection
                        ? <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">Size/Color</span>
                        : <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full shrink-0">Auto</span>
                      }
                      <span className="text-gray-400 shrink-0">· {slot.product_count || 0} product{slot.product_count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleToggle(combo)}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${combo.is_active ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}
                  >
                    {combo.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {combo.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Stock: {combo.stock}</span>
                    <button
                      onClick={async () => {
                        const full = await comboApi.getOne(combo.id);
                        setSelected(full?.data?.combo || combo);
                        setModal('edit');
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(combo)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && (
        <ComboModal
          editing={null}
          allProducts={allProducts}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal === 'edit' && selected && (
        <ComboModal
          editing={selected}
          allProducts={allProducts}
          onClose={() => { setModal(null); setSelected(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
