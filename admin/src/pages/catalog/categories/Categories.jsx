import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, Sparkles, Settings, X, Table, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import { categoryApi, brandApi } from '../../../api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PREDEFINED = [
  'Outfit Combo', 'Dresses', 'Tops', 'T-Shirts', 'Shirts', 'Jeans', 'Pants', 'Leggings',
  'Skirts', 'Sarees', 'Kurtis', 'Ethnic Wear', 'Co-Ord Sets', 'Hoodies',
  'Jackets', 'Blazers', 'Nightwear', 'Activewear', 'Loungewear', 'Innerwear',
  'Swimwear', 'Footwear', 'Heels', 'Sneakers', 'Sandals', 'Handbags',
  'Jewelry', 'Watches', 'Sunglasses', 'Beauty & Makeup', 'Perfumes',
  'Winter Wear', 'Plus Size', 'Maternity Wear', 'Accessories',
  'New Arrivals', 'Best Sellers', 'Sale Items', 'Luxury Collection',
  'Party Wear', 'Casual Wear', 'Office Wear', 'Bridal Collection',
].map((name, i) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  sort_order: i,
}));

// ── Size Chart Table Modal ────────────────────────────────────────────────────
const DEFAULT_HEADERS = ['Size', 'Chest (in)', 'Waist (in)', 'Hips (in)', 'Length (in)'];
const DEFAULT_ROWS    = [
  ['XS', '32', '26', '34', '38'],
  ['S',  '34', '28', '36', '39'],
  ['M',  '36', '30', '38', '40'],
  ['L',  '38', '32', '40', '41'],
  ['XL', '40', '34', '42', '42'],
  ['XXL','42', '36', '44', '43'],
];

function SizeChartModal({ cat, onClose, onSaved }) {
  const existing = (() => {
    try { return typeof cat.size_chart_data === 'string' ? JSON.parse(cat.size_chart_data) : cat.size_chart_data; }
    catch { return null; }
  })();

  const [headers, setHeaders] = useState(existing?.headers || DEFAULT_HEADERS);
  const [rows, setRows]       = useState(existing?.rows    || DEFAULT_ROWS);
  const [saving, setSaving]   = useState(false);

  // ── Header helpers ────────────────────────────────────────────────────────
  const updateHeader = (i, v) => setHeaders(h => h.map((c, j) => j === i ? v : c));
  const addCol = () => {
    setHeaders(h => [...h, 'New Column']);
    setRows(r => r.map(row => [...row, '']));
  };
  const removeCol = (ci) => {
    if (headers.length <= 1) return;
    setHeaders(h => h.filter((_, i) => i !== ci));
    setRows(r => r.map(row => row.filter((_, i) => i !== ci)));
  };

  // ── Row helpers ───────────────────────────────────────────────────────────
  const updateCell = (ri, ci, v) => setRows(r => r.map((row, i) => i === ri ? row.map((c, j) => j === ci ? v : c) : row));
  const addRow = () => setRows(r => [...r, headers.map(() => '')]);
  const removeRow = (ri) => setRows(r => r.filter((_, i) => i !== ri));

  const handleSave = async () => {
    setSaving(true);
    try {
      await categoryApi.saveSizeChartTable(cat.id, { headers, rows });
      toast.success('Size chart saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Size Chart — ${cat.name}`} onClose={onClose} size="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Edit the table below. Click any cell to edit.</p>
          <div className="flex gap-2">
            <button onClick={addCol} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <Plus className="h-3 w-3" /> Column
            </button>
            <button onClick={addRow} className="flex items-center gap-1 text-xs text-green-600 font-semibold px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
              <Plus className="h-3 w-3" /> Row
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                {headers.map((h, ci) => (
                  <th key={ci} className="border border-gray-200 p-0 min-w-[90px]">
                    <div className="flex items-center group">
                      <input
                        value={h}
                        onChange={e => updateHeader(ci, e.target.value)}
                        className="flex-1 px-2 py-2 text-xs font-semibold text-indigo-700 bg-transparent focus:outline-none focus:bg-indigo-100 rounded text-center"
                      />
                      {headers.length > 1 && (
                        <button
                          onClick={() => removeCol(ci)}
                          className="p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all shrink-0"
                          title="Remove column"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="border border-gray-200 w-8 bg-indigo-50" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50 group">
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-gray-200 p-0">
                      <input
                        value={cell}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                        className={`w-full px-2 py-2 text-center focus:outline-none focus:bg-blue-50 bg-transparent text-sm ${ci === 0 ? 'font-semibold text-gray-700' : 'text-gray-600'}`}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-200 text-center">
                    <button
                      onClick={() => removeRow(ri)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                      title="Remove row"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 1} className="text-center py-6 text-xs text-gray-400">
                    No rows yet — click "+ Row" to add one
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-gray-400">
          💡 Tip: First column is treated as the Size label. Click column headers to rename them.
        </p>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Size Chart</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Types list with nested Options ───────────────────────────────────────────
function OptionsMini({ options = [], onChange }) {
  const [input, setInput] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || options.find(o => o.name.toLowerCase() === v.toLowerCase())) return;
    onChange([...options, { name: v, is_active: true }]);
    setInput('');
  };
  const toggle = (i) => onChange(options.map((o, j) => j === i ? { ...o, is_active: !o.is_active } : o));
  const remove = (i) => onChange(options.filter((_, j) => j !== i));
  const startEdit = (i) => { setEditIdx(i); setEditVal(options[i].name); };
  const saveEdit = () => {
    const v = editVal.trim();
    if (!v) return;
    onChange(options.map((o, i) => i === editIdx ? { ...o, name: v } : o));
    setEditIdx(null);
  };

  return (
    <div className="pl-4 pt-2 pb-1 border-l-2 border-indigo-100 ml-2 space-y-1">
      <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">Options</p>
      {options.map((opt, i) => (
        <div key={i} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${!opt.is_active ? 'opacity-50' : ''}`}>
          {editIdx === i ? (
            <>
              <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                className="flex-1 border border-indigo-300 rounded px-2 py-0.5 text-xs focus:outline-none" />
              <button onClick={saveEdit} className="text-[10px] text-indigo-600 font-semibold px-1">Save</button>
              <button onClick={() => setEditIdx(null)} className="text-[10px] text-gray-400 px-1">✕</button>
            </>
          ) : (
            <>
              <span className={`flex-1 text-xs ${opt.is_active ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{opt.name}</span>
              <button onClick={() => toggle(i)}
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${opt.is_active ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-700'}`}>
                {opt.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => startEdit(i)} className="p-0.5 text-gray-300 hover:text-indigo-500 transition-colors"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => remove(i)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
            </>
          )}
        </div>
      ))}
      <div className="flex gap-1.5 mt-1">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="New option… Enter"
          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-400" />
        <button onClick={add} className="flex items-center gap-0.5 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded font-semibold hover:bg-indigo-100 transition-colors">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
    </div>
  );
}

function TypeListWithOptions({ types, setTypes }) {
  const [input, setInput] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);

  const add = () => {
    const v = input.trim();
    if (!v || types.find(t => t.name.toLowerCase() === v.toLowerCase())) return;
    setTypes(p => [...p, { name: v, is_active: true, options: [] }]);
    setInput('');
  };
  const startEdit = (i) => { setEditIdx(i); setEditVal(types[i].name); };
  const saveEdit = () => {
    const v = editVal.trim();
    if (!v) return;
    setTypes(p => p.map((t, i) => i === editIdx ? { ...t, name: v } : t));
    setEditIdx(null);
  };
  const toggle = (i) => setTypes(p => p.map((t, j) => j === i ? { ...t, is_active: !t.is_active } : t));
  const remove = (i) => { if (confirm(`Delete "${types[i].name}"?`)) setTypes(p => p.filter((_, j) => j !== i)); };
  const updateOptions = (i, opts) => setTypes(p => p.map((t, j) => j === i ? { ...t, options: opts } : t));

  return (
    <div>
      <p className="text-sm font-extrabold text-pink-600 uppercase tracking-wide mb-2">Types</p>
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
        {types.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No types yet</p>}
        {types.map((item, i) => (
          <div key={i} className={`border-b border-gray-100 last:border-0 ${!item.is_active ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
            {/* Type row */}
            <div className="flex items-center gap-2 px-3 py-2">
              {editIdx === i ? (
                <>
                  <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                    className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none" />
                  <button onClick={saveEdit} className="text-xs text-indigo-600 font-semibold px-1">Save</button>
                  <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400 px-1">Cancel</button>
                </>
              ) : (
                <>
                  {/* Expand toggle for options */}
                  <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                    className="flex items-center gap-1 flex-1 text-left">
                    <span className={`text-sm font-medium ${item.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{item.name}</span>
                    <span className="text-[10px] text-gray-400 ml-1">
                      {(item.options?.length || 0) > 0 ? `${item.options.length} opts` : ''}
                    </span>
                    <span className="ml-auto text-gray-300 text-xs">{expandedIdx === i ? '▲' : '▼'}</span>
                  </button>
                  <button onClick={() => toggle(i)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors shrink-0 ${item.is_active ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => startEdit(i)} className="p-1 rounded text-gray-300 hover:text-indigo-500 transition-colors shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(i)} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
            {/* Expanded options panel */}
            {expandedIdx === i && editIdx !== i && (
              <OptionsMini options={item.options || []} onChange={(opts) => updateOptions(i, opts)} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="New type name… Enter"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <Button type="button" size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /> Add</Button>
      </div>
    </div>
  );
}

// ── Simple list with add / edit / active-toggle / delete (used for Sub-Categories) ──
function ItemList({ label, list, setList }) {
  const [input, setInput] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || list.find(i => i.name.toLowerCase() === v.toLowerCase())) return;
    setList(p => [...p, { name: v, is_active: true }]);
    setInput('');
  };
  const startEdit = (idx) => { setEditIdx(idx); setEditVal(list[idx].name); };
  const saveEdit = () => {
    const v = editVal.trim();
    if (!v) return;
    setList(p => p.map((c, i) => i === editIdx ? { ...c, name: v } : c));
    setEditIdx(null);
  };
  const toggle = (idx) => setList(p => p.map((c, i) => i === idx ? { ...c, is_active: !c.is_active } : c));
  const remove = (idx) => { if (confirm(`Delete "${list[idx].name}"?`)) setList(p => p.filter((_, i) => i !== idx)); };

  return (
    <div>
      <p className="text-sm font-extrabold text-pink-600 uppercase tracking-wide mb-2">{label}</p>
      <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
        {list.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No {label.toLowerCase()} yet</p>}
        {list.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 ${!item.is_active ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
            {editIdx === i ? (
              <>
                <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                  className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none" />
                <button onClick={saveEdit} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 px-1">Save</button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-sm ${item.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{item.name}</span>
                <button onClick={() => toggle(i)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${item.is_active ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => startEdit(i)} className="p-1 rounded text-gray-300 hover:text-indigo-500 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(i)} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={`New ${label.slice(0, -1).toLowerCase()} name… Enter`}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <Button type="button" size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /> Add</Button>
      </div>
    </div>
  );
}

function CategoryMetaModal({ cat, onClose, onSaved }) {
  const parse = (v) => (Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v || '[]') : []));
  const [subCats,   setSubCats]   = useState(() => parse(cat.sub_categories));
  const [types,     setTypes]     = useState(() => parse(cat.types));
  const [materials, setMaterials] = useState(() => parse(cat.materials));
  const [patterns,  setPatterns]  = useState(() => parse(cat.patterns));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await categoryApi.saveMeta(cat.id, { sub_categories: subCats, types, materials, patterns });
      toast.success('Saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Manage — ${cat.name}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-pink-200 bg-pink-50 shadow-sm shadow-pink-100 p-4">
          <ItemList label="Sub-Categories" list={subCats} setList={setSubCats} />
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 shadow-sm shadow-violet-100 p-4">
          <TypeListWithOptions types={types} setTypes={setTypes} />
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm shadow-emerald-100 p-4">
          <ItemList label="Materials" list={materials} setList={setMaterials} />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm shadow-amber-100 p-4">
          <ItemList label="Patterns" list={patterns} setList={setPatterns} />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

function CategoryModal({ editing, onClose, onSaved }) {
  const isEdit = !!editing;
  const [form, setForm] = useState({
    name: editing?.name || '',
    slug: editing?.slug || '',
    sort_order: editing?.sort_order ?? 0,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(editing?.image_url || '');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const autoSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((p) => ({ ...p, name, ...(isEdit ? {} : { slug: autoSlug(name) }) }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('slug', form.slug);
      fd.append('sort_order', form.sort_order);
      if (imageFile) fd.append('image', imageFile);
      isEdit ? await categoryApi.update(editing.id, fd) : await categoryApi.create(fd);
      toast.success(isEdit ? 'Category updated' : 'Category created');
      onSaved();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={isEdit ? 'Edit Category' : 'Add Category'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={form.name} onChange={handleNameChange} required />
        <Input label="Slug" value={form.slug} onChange={set('slug')} placeholder="auto-generated" required />

        {/* Image picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
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

        <Input label="Sort Order" type="number" value={form.sort_order} onChange={set('sort_order')} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Quick-Add Modal ───────────────────────────────────────────────────────────
function QuickAddModal({ existingSlugs, onClose, onSaved }) {
  const available = PREDEFINED.filter((c) => !existingSlugs.has(c.slug));
  const [selected, setSelected] = useState(new Set(available.map((c) => c.slug)));
  const [loading, setLoading] = useState(false);

  const toggle = (slug) => setSelected((s) => {
    const next = new Set(s);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    return next;
  });

  const toggleAll = () =>
    setSelected(selected.size === available.length ? new Set() : new Set(available.map((c) => c.slug)));

  const handleAdd = async () => {
    const toAdd = PREDEFINED.filter((c) => selected.has(c.slug));
    if (!toAdd.length) { toast.error('Select at least one category'); return; }
    setLoading(true);
    try {
      const { data } = await categoryApi.bulk(toAdd);
      toast.success(`${data.data?.added ?? toAdd.length} categories added`);
      onSaved();
    } catch { toast.error('Failed to add categories'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Quick Add Predefined Categories" onClose={onClose} size="lg">
      <div className="space-y-4">
        {available.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">All predefined categories are already added.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{selected.size} of {available.length} selected</p>
              <button onClick={toggleAll} className="text-xs text-indigo-600 font-medium hover:underline">
                {selected.size === available.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
              {available.map((c) => (
                <label key={c.slug}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm
                    ${selected.has(c.slug)
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <input type="checkbox" checked={selected.has(c.slug)} onChange={() => toggle(c.slug)} className="accent-indigo-600" />
                  {c.name}
                </label>
              ))}
            </div>
          </>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {available.length > 0 && (
            <Button onClick={handleAdd} loading={loading}>Add {selected.size > 0 ? selected.size : ''} Categories</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Brand Modal ───────────────────────────────────────────────────────────────
function BrandModal({ editing, onClose, onSaved }) {
  const isEdit = !!editing;
  const [name, setName] = useState(editing?.name || '');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      isEdit ? await brandApi.update(editing.id, { name }) : await brandApi.create({ name });
      toast.success(isEdit ? 'Brand updated' : 'Brand created');
      onSaved();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <Modal title={isEdit ? 'Edit Brand' : 'Add Brand'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Brand Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reassign & Delete Modal ───────────────────────────────────────────────────
function ReassignModal({ cat, categories, onClose, onDeleted }) {
  const [reassignTo, setReassignTo] = useState('');
  const [loading, setLoading] = useState(false);
  const others = categories.filter((c) => c.id !== cat.id);

  const handleDelete = async () => {
    if (!reassignTo) { toast.error('Select a category to reassign products to'); return; }
    setLoading(true);
    try {
      await categoryApi.remove(cat.id, reassignTo);
      toast.success('Products reassigned and category deleted');
      onDeleted();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Reassign Products & Delete" onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">"{cat.name}"</span> has products assigned to it.
          Choose a category to move them to before deleting.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Move products to</label>
          <select
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="">Select category…</option>
            {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDelete} loading={loading} className="bg-red-600 hover:bg-red-700">
            Reassign & Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Categories() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sizeChartCat, setSizeChartCat] = useState(null);
  const [metaCat, setMetaCat] = useState(null);
  const [catFilter, setCatFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [reassignTarget, setReassignTarget] = useState(null);
  const { data: catData, isLoading: catLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: categoryApi.list });
  const { data: brandData, isLoading: brandLoading } = useQuery({ queryKey: ['admin-brands'], queryFn: brandApi.list });
  const categories = catData?.data?.categories || [];
  const brands = brandData?.data?.brands || [];

  const existingSlugs = new Set(categories.map((c) => c.slug));
  const filteredCats = catFilter === 'all' ? categories : categories.filter((c) => catFilter === 'active' ? c.is_active : !c.is_active);
  const filteredBrands = brandFilter === 'all' ? brands : brands.filter((b) => brandFilter === 'active' ? b.is_active : !b.is_active);

  const refresh = (key) => () => { setModal(null); setSelected(null); qc.invalidateQueries({ queryKey: [key] }); };

  const handleToggleCat = async (cat) => {
    try {
      await categoryApi.toggle(cat.id);
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success(cat.is_active ? 'Category deactivated' : 'Category activated');
    } catch { toast.error('Failed'); }
  };

  const handleDeleteCat = async (cat) => {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await categoryApi.remove(cat.id);
      toast.success('Category deleted');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
    } catch (err) {
      if (err.count > 0) {
        setReassignTarget(cat);
      } else {
        toast.error(err.message || 'Failed to delete');
      }
    }
  };

  const handleReorderCat = async (cat, direction) => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const other = categories[swapIdx];
    try {
      const fdA = new FormData(); fdA.append('name', cat.name); fdA.append('slug', cat.slug); fdA.append('sort_order', other.sort_order);
      const fdB = new FormData(); fdB.append('name', other.name); fdB.append('slug', other.slug); fdB.append('sort_order', cat.sort_order);
      await Promise.all([categoryApi.update(cat.id, fdA), categoryApi.update(other.id, fdB)]);
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
    } catch { toast.error('Failed to reorder'); }
  };

  const handleToggleBrand = async (brand) => {
    try {
      await brandApi.toggle(brand.id);
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
      toast.success(brand.is_active ? 'Brand deactivated' : 'Brand activated');
    } catch { toast.error('Failed'); }
  };

  const handleDeleteBrand = async (brand) => {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    try {
      await brandApi.remove(brand.id);
      toast.success('Brand deleted');
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
    } catch { toast.error('Failed to delete'); }
  };

  const activeCats = categories.filter((c) => c.is_active).length;
  const activeBrands = brands.filter((b) => b.is_active).length;

  const FilterTabs = ({ value, onChange }) => (
    <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-semibold">
      {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${value === v ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Tag className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Categories & Brand Taxonomy
                </h1>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                  {categories.length} Categories · {brands.length} Brands
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize storefront navigation, size charts, sub-category tags, and designer brands
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Categories</p>
            <p className="text-xl font-bold text-slate-900">{categories.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Categories</p>
            <p className="text-xl font-bold text-slate-900">{activeCats}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Brands</p>
            <p className="text-xl font-bold text-slate-900">{brands.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Brands</p>
            <p className="text-xl font-bold text-slate-900">{activeBrands}</p>
          </div>
        </div>
      </div>

      {/* ── Categories ── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Product Categories</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {categories.length} total · {activeCats} active · {categories.length - activeCats} inactive
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterTabs value={catFilter} onChange={setCatFilter} />
            <Button size="sm" variant="outline" onClick={() => setModal('quick-add')} className="rounded-xl">
              <Sparkles className="h-4 w-4 mr-1 text-indigo-600" /> Quick Add
            </Button>
            <Button size="sm" onClick={() => { setSelected(null); setModal('new-cat'); }} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </div>
        </div>

        {catLoading ? <Spinner /> : filteredCats.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No categories{catFilter !== 'all' ? ` (${catFilter})` : ''} found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCats.map((c) => (
              <div key={c.id}
                className={`rounded-2xl border p-4 transition-all ${c.is_active ? 'border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm' : 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {c.image_url
                    ? <img src={c.image_url} alt={c.name} className="w-11 h-11 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200/60" />
                    : <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-slate-700 font-bold text-base">{c.name[0]}</div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate font-mono mt-0.5">/{c.slug}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleCat(c)}
                    title={c.is_active ? 'Deactivate category' : 'Activate category'}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer
                      ${c.is_active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60 hover:bg-slate-200'}`}
                  >
                    {c.is_active ? <Eye className="h-3 w-3 text-emerald-600" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                    {c.is_active ? 'Active' : 'Inactive'}
                  </button>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleReorderCat(c, 'up')}
                      disabled={categories.indexOf(c) === 0}
                      title="Move up"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleReorderCat(c, 'down')}
                      disabled={categories.indexOf(c) === categories.length - 1}
                      title="Move down"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setMetaCat(c)}
                      title="Manage Sub-Categories & Types"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSizeChartCat(c)}
                      title="Manage Size Chart"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Table className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setSelected(c); setModal('edit-cat'); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCat(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Size Chart Modal */}
      {sizeChartCat && (
        <SizeChartModal
          cat={sizeChartCat}
          onClose={() => setSizeChartCat(null)}
          onSaved={() => { setSizeChartCat(null); qc.invalidateQueries({ queryKey: ['admin-categories'] }); }}
        />
      )}

      {/* Category Meta Modal */}
      {metaCat && (
        <CategoryMetaModal
          cat={metaCat}
          onClose={() => setMetaCat(null)}
          onSaved={() => { setMetaCat(null); qc.invalidateQueries({ queryKey: ['admin-categories'] }); }}
        />
      )}

      {/* ── Brands ── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">Partner Brands & Designers</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {brands.length} total · {activeBrands} active · {brands.length - activeBrands} inactive
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FilterTabs value={brandFilter} onChange={setBrandFilter} />
            <Button size="sm" onClick={() => { setSelected(null); setModal('new-brand'); }} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-1" /> Add Brand
            </Button>
          </div>
        </div>

        {brandLoading ? <Spinner /> : filteredBrands.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No brands{brandFilter !== 'all' ? ` (${brandFilter})` : ''} found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBrands.map((b) => (
              <div key={b.id} className={`flex items-center justify-between py-3.5 ${!b.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0 border border-slate-200/60">
                    {b.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm text-slate-900">{b.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBrand(b)}
                    title={b.is_active ? 'Deactivate brand' : 'Activate brand'}
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer
                      ${b.is_active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60 hover:bg-slate-200'}`}
                  >
                    {b.is_active ? <Eye className="h-3 w-3 text-emerald-600" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                    {b.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => { setSelected(b); setModal('edit-brand'); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteBrand(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {modal === 'new-cat'    && <CategoryModal editing={null}     onClose={() => setModal(null)} onSaved={refresh('admin-categories')} />}
      {modal === 'edit-cat'   && <CategoryModal editing={selected} onClose={() => setModal(null)} onSaved={refresh('admin-categories')} />}
      {modal === 'new-brand'  && <BrandModal    editing={null}     onClose={() => setModal(null)} onSaved={refresh('admin-brands')} />}
      {modal === 'edit-brand' && <BrandModal    editing={selected} onClose={() => setModal(null)} onSaved={refresh('admin-brands')} />}
      {modal === 'quick-add'  && <QuickAddModal existingSlugs={existingSlugs} onClose={() => setModal(null)} onSaved={refresh('admin-categories')} />}
      {reassignTarget && (
        <ReassignModal
          cat={reassignTarget}
          categories={categories}
          onClose={() => setReassignTarget(null)}
          onDeleted={() => { setReassignTarget(null); qc.invalidateQueries({ queryKey: ['admin-categories'] }); }}
        />
      )}
    </div>
  );
}
