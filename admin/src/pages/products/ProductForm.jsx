import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, ImagePlus, Camera, Star, Pencil } from 'lucide-react';
import { productApi, categoryApi, brandApi, reviewApi } from '../../api';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input, { Select, Textarea } from '../../components/ui/Input';
import toast from 'react-hot-toast';

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const full = display >= s;
        const half = !full && display >= s - 0.5;
        return (
          <div key={s} className="relative w-7 h-7" onMouseLeave={() => setHover(0)}>
            <div className="absolute inset-0 w-1/2 z-10 cursor-pointer"
              onMouseEnter={() => setHover(s - 0.5)}
              onClick={() => onChange(s - 0.5)} />
            <div className="absolute inset-0 left-1/2 z-10 cursor-pointer"
              onMouseEnter={() => setHover(s)}
              onClick={() => onChange(s)} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {half ? (
                <div className="relative w-6 h-6">
                  <Star className="absolute h-6 w-6" style={{ color: '#d1d5db', fill: 'transparent' }} />
                  <div className="absolute overflow-hidden" style={{ width: '50%', height: '100%' }}>
                    <Star className="h-6 w-6" style={{ color: '#facc15', fill: '#facc15' }} />
                  </div>
                </div>
              ) : (
                <Star className="h-6 w-6" style={{
                  fill: full ? '#facc15' : 'transparent',
                  color: full ? '#facc15' : '#d1d5db',
                }} />
              )}
            </div>
          </div>
        );
      })}
      <span className="ml-2 text-xs font-semibold text-amber-500">{display || ''}</span>
    </div>
  );
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '0-3m', '3-6m', '6-12m', '1-2y', '2-3y', '3-4y', '4-5y', '5-6y', '6-7y', '7-8y'];
const WOMEN_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const COLORS = [
  { name: 'White',       hex: '#ffffff' },
  { name: 'Black',       hex: '#111111' },
  { name: 'Red',         hex: '#ef4444' },
  { name: 'Pink',        hex: '#ec4899' },
  { name: 'Rose',        hex: '#fb7185' },
  { name: 'Orange',      hex: '#f97316' },
  { name: 'Yellow',      hex: '#eab308' },
  { name: 'Green',       hex: '#22c55e' },
  { name: 'Mint',        hex: '#6ee7b7' },
  { name: 'Teal',        hex: '#14b8a6' },
  { name: 'Blue',        hex: '#3b82f6' },
  { name: 'Sky Blue',    hex: '#38bdf8' },
  { name: 'Navy',        hex: '#1e3a5f' },
  { name: 'Purple',      hex: '#a855f7' },
  { name: 'Lavender',    hex: '#c4b5fd' },
  { name: 'Maroon',      hex: '#7f1d1d' },
  { name: 'Brown',       hex: '#92400e' },
  { name: 'Beige',       hex: '#d4b896' },
  { name: 'Cream',       hex: '#fef9ef' },
  { name: 'Grey',        hex: '#9ca3af' },
  { name: 'Charcoal',    hex: '#374151' },
  { name: 'Gold',        hex: '#d97706' },
  { name: 'Silver',      hex: '#cbd5e1' },
  { name: 'Mustard',     hex: '#ca8a04' },
  { name: 'Coral',       hex: '#fb6f6f' },
  { name: 'Peach',       hex: '#ffcba4' },
  { name: 'Indigo',      hex: '#4f46e5' },
  { name: 'Olive',       hex: '#65a30d' },
  { name: 'Rust',        hex: '#c2410c' },
  { name: 'Ivory',       hex: '#fffff0' },
];

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const selected = COLORS.find((c) => c.name === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = search.trim()
    ? COLORS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : COLORS;

  const close = () => { setOpen(false); setSearch(''); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(''); }}
        className="flex items-center gap-2 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm hover:border-indigo-400 transition-colors bg-white"
      >
        {selected
          ? <>
              <span className="w-5 h-5 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: selected.hex }} />
              <span className="text-gray-700">{selected.name}</span>
            </>
          : <span className="text-gray-400">Select colour</span>
        }
        <span className="ml-auto text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <>
          {/* Backdrop — tap outside to close */}
          <div className="fixed inset-0 z-40 bg-black/50" onClick={close} />

          {/* Popup — near-fullscreen on mobile, dropdown on desktop */}
          <div className="fixed inset-3 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden md:absolute md:inset-auto md:top-full md:left-0 md:mt-1 md:w-80 md:translate-x-0 md:translate-y-0">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-sm font-semibold text-gray-700">Select Colour</p>
              <button type="button" onClick={close} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400"
                placeholder="Search colour…"
              />
            </div>

            {/* Colour grid — fills remaining space */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-6 gap-3 content-start">
              {filtered.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => { onChange(c.name); close(); }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 active:bg-indigo-50 transition-colors"
                >
                  <span
                    className="w-12 h-12 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: value === c.name ? '#6366f1' : '#e5e7eb',
                      boxShadow: value === c.name ? '0 0 0 3px #a5b4fc' : 'none',
                    }}
                  />
                  <span className="text-[11px] text-gray-500 leading-tight text-center truncate w-full">{c.name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-6 text-center py-10 text-sm text-gray-400">No colours match</p>
              )}
            </div>

            {/* Custom colour */}
            <div className="px-4 py-3 border-t border-gray-100 shrink-0">
              <input
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400"
                placeholder="Custom colour name… (press Enter)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    onChange(e.target.value.trim());
                    close();
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const PATTERNS = [
  'Solid', 'Printed', 'Checked', 'Striped', 'Floral', 'Abstract',
  'Geometric', 'Paisley', 'Animal Print', 'Polka Dots', 'Tie-Dye',
  'Camouflage', 'Embroidered', 'Self Design', 'Colourblock', 'Ombre',
  'Graphic', 'Text / Slogan', 'Lace', 'Jacquard',
];

const TYPES = [
  'Daily Wear', 'Office Wear', 'Kalayan Sari', 'Set Sari',
  'Kurta', 'Kurti', 'Top', 'T-Shirt', 'Shirt', 'Blouse', 'Tunic',
  'Dress', 'Gown', 'Lehenga', 'Saree', 'Salwar Suit',
  'Pant', 'Leggings', 'Jeans', 'Skirt', 'Shorts', 'Palazzos',
  'Jacket', 'Cardigan', 'Sweater', 'Hoodie', 'Shrug',
  'Romper', 'Jumpsuit', 'Co-ord Set', 'Night Suit', 'Innerwear',
  'Dupatta', 'Stole', 'Maternity Wear', 'Nursing Wear',
];


const CODE39_MAP = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
  'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
  'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
  'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '101100101011',
  'W': '110110010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '101100110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
  '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
};

function Barcode({ value }) {
  const uppercaseVal = (value || '').toUpperCase();
  const safeVal = uppercaseVal.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
  const fullVal = `*${safeVal}*`;

  let currentX = 0;
  const barWidth = 1.25;
  const height = 18;
  const rects = [];

  for (let i = 0; i < fullVal.length; i++) {
    const char = fullVal[i];
    const pattern = CODE39_MAP[char];
    if (!pattern) continue;

    for (let j = 0; j < pattern.length; j++) {
      if (pattern[j] === '1') {
        rects.push(
          <rect
            key={`${i}-${j}`}
            x={currentX}
            y={0}
            width={barWidth}
            height={height}
            fill="currentColor"
          />
        );
      }
      currentX += barWidth;
    }
    currentX += barWidth;
  }

  return (
    <div className="flex flex-col items-center w-full">
      <svg viewBox={`0 0 ${currentX} ${height}`} width="100%" height={height} className="text-current">
        {rects}
      </svg>
      <span className="text-[9px] font-mono tracking-[3px] mt-0.5 text-center uppercase">{safeVal}</span>
    </div>
  );
}

const TAG_THEMES = {
  'classic-gold': {
    name: 'Classic Gold & Black Ink',
    bgClass: 'bg-gradient-to-b from-[#faf6eb] to-[#f5eedc] text-neutral-900 border-[#d4af37]/65',
    primaryColor: '#111111',
    accentColor: '#d4af37',
    textColor: '#111111',
    metaColor: '#7a6437',
    priceBg: 'bg-transparent text-neutral-900',
    badgeClass: 'bg-transparent text-[#5c4a24]',
    lineClass: 'border-[#d4af37]/45',
    holeClass: 'bg-[#f5eedc] border-[#d4af37]/50',
    discountBadgeClass: 'text-gray-500 bg-transparent'
  },
  'vibrant-rose': {
    name: 'Vibrant Rose & Pink',
    bgClass: 'bg-gradient-to-b from-pink-500 via-pink-600 to-rose-700 text-white border-pink-400/30',
    primaryColor: '#ffffff',
    accentColor: '#fbcfe8',
    textColor: '#ffffff',
    metaColor: '#fecdd3',
    priceBg: 'bg-transparent text-white',
    badgeClass: 'bg-transparent text-white',
    lineClass: 'border-white/20',
    holeClass: 'bg-rose-700 border-white/35',
    discountBadgeClass: 'text-gray-500 bg-transparent'
  },
  'modern-teal': {
    name: 'Modern Teal & Mint',
    bgClass: 'bg-gradient-to-b from-teal-500 to-emerald-950 text-white border-teal-400/30',
    primaryColor: '#ffffff',
    accentColor: '#ccfbf1',
    textColor: '#ffffff',
    metaColor: '#99f6e4',
    priceBg: 'bg-transparent text-white',
    badgeClass: 'bg-transparent text-white',
    lineClass: 'border-white/20',
    holeClass: 'bg-emerald-950 border-white/35',
    discountBadgeClass: 'text-gray-500 bg-transparent'
  },
  'black-pink': {
    name: 'Chic Black & Hot Pink',
    bgClass: 'bg-gradient-to-b from-neutral-900 to-neutral-950 text-white border-pink-500/40',
    primaryColor: '#ec4899',
    accentColor: '#f472b6',
    textColor: '#ffffff',
    metaColor: '#f472b6',
    priceBg: 'bg-transparent text-pink-300',
    badgeClass: 'bg-transparent text-white',
    lineClass: 'border-pink-500/30',
    holeClass: 'bg-neutral-950 border-pink-500/50',
    discountBadgeClass: 'text-gray-500 bg-transparent'
  },
  'vintage-kraft': {
    name: 'Vintage Kraft Paper',
    bgClass: 'bg-gradient-to-b from-[#e7cba8] to-[#d4b896] text-[#3e2723] border-[#a1887f]',
    primaryColor: '#3e2723',
    accentColor: '#5d4037',
    textColor: '#3e2723',
    metaColor: '#5d4037',
    priceBg: 'bg-transparent text-[#3e2723]',
    badgeClass: 'bg-transparent text-[#3e2723]',
    lineClass: 'border-[#3e2723]/25',
    holeClass: 'bg-[#d4b896] border-[#3e2723]/30',
    discountBadgeClass: 'text-gray-500 bg-transparent'
  }
};

const getColorValue = (colorStr) => {
  if (!colorStr) return '#4b5563';
  const c = colorStr.toLowerCase().trim();
  
  const colorMap = {
    'red': '#ef4444',
    'blue': '#3b82f6',
    'green': '#22c55e',
    'pink': '#ec4899',
    'yellow': '#eab308',
    'orange': '#f97316',
    'purple': '#a855f7',
    'teal': '#14b8a6',
    'black': '#000000',
    'white': '#6b7280',
    'brown': '#78350f',
    'gray': '#4b5563',
    'grey': '#4b5563',
    'gold': '#d4af37',
    'indigo': '#6366f1',
    'violet': '#8b5cf6',
    'rose': '#f43f5e',
    'amber': '#f59e0b',
    'emerald': '#10b981',
    'cyan': '#06b6d4',
    'lime': '#84cc16'
  };
  
  for (const [key, val] of Object.entries(colorMap)) {
    if (c.includes(key)) return val;
  }
  
  if (c.startsWith('#') || c.startsWith('rgb')) return colorStr;
  return '#4b5563';
};

function ProductTagPreview({ productData, variant, themeKey, includeBarcode, brandName, imageUrl }) {
  const theme = TAG_THEMES[themeKey] || TAG_THEMES['classic-gold'];
  const name = productData.name || 'Product Name';
  const price = Number(productData.price) || 0;
  const offerPrice = Number(productData.offer_price) || 0;
  
  const discountPercent = price > 0 && offerPrice > 0 && offerPrice < price
    ? Math.round(((price - offerPrice) / price) * 100)
    : 0;

  const code = variant?.sku || productData.product_code || 'CODE-PENDING';
  const size = variant?.size || 'ALL';
  const color = variant?.color || '';

  return (
    <div className={`w-[195px] h-[325px] rounded-[18px] border-2 shadow-lg relative flex flex-col justify-between p-4 select-none shrink-0 ${theme.bgClass}`} style={{ boxSizing: 'border-box' }}>
      
      {/* Kraft Paper texture overlay */}
      {themeKey === 'vintage-kraft' && (
        <div className="absolute inset-0 rounded-[16px] pointer-events-none mix-blend-multiply opacity-25" 
          style={{ backgroundImage: 'radial-gradient(#ecd5b9 20%, transparent 20%), radial-gradient(#dcbfa0 20%, transparent 20%)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px' }} />
      )}

      {/* Top hanger visual */}
      <div className="flex flex-col items-center w-full relative">
        <div className="w-8 h-8 rounded-full border border-dashed flex items-center justify-center relative z-10" style={{ borderColor: theme.textColor + '35' }}>
          <div className={`w-3.5 h-3.5 rounded-full border-2 shadow-inner z-10 ${theme.holeClass}`} />
          <div className="absolute top-[-30px] w-0.5 h-9 bg-gray-400/40 z-0" />
        </div>

        <h2 className="text-center font-bold tracking-[4px] text-[15px] uppercase truncate w-full" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
          {brandName || 'VELORA'}
        </h2>
        <div className={`w-12 border-t mt-1.5 ${theme.lineClass}`} />
      </div>

      <div className="flex flex-col items-center flex-grow justify-center py-1 text-center">
        <span className="text-[9px] uppercase tracking-[2px] opacity-75 mb-0.5" style={{ color: theme.metaColor }}>
          {productData.categoryName || 'Apparel'}
        </span>

        {imageUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden border my-1 shadow-sm shrink-0 flex items-center justify-center" style={{ borderColor: theme.accentColor + '30' }}>
            <img src={imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg border-2 border-dashed my-1 flex flex-col items-center justify-center opacity-30 shrink-0" style={{ borderColor: theme.textColor }}>
            <span className="text-[8px] font-bold">TAG</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 w-full mt-1.5">
          <h3 className="font-bold text-[12px] tracking-wide leading-tight line-clamp-2 w-full px-1 max-h-[30px] overflow-hidden">
            {name}
          </h3>
          
          {color && (
            <span className="text-[9px] font-bold uppercase text-gray-600" style={{ color: '#4b5563' }}>
              Colour: <span style={{ color: getColorValue(color) }}>{color}</span>
            </span>
          )}

          <div className="text-[9px] font-bold uppercase text-gray-600" style={{ color: '#4b5563' }}>
            Code: <span style={{ color: '#ffffff' }}>{code}</span>
          </div>

          <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase text-gray-600 ${theme.badgeClass}`} style={{ color: '#4b5563' }}>
            SIZE: <span style={{ color: '#ffffff' }}>{size}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className={`rounded-xl p-2.5 flex flex-col items-center justify-center ${theme.priceBg}`}>
          {discountPercent > 0 ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] line-through text-white" style={{ textDecorationColor: '#ef4444', color: '#ffffff' }}>₹{price}</span>
                <span className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${theme.discountBadgeClass}`}>
                  {discountPercent}% OFF
                </span>
              </div>
              <span className="text-[15px] font-extrabold tracking-wide mt-0.5 text-green-500" style={{ color: '#22c55e' }}>₹{offerPrice}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[8px] opacity-70 uppercase tracking-widest">MRP</span>
              <span className="text-[15px] font-extrabold tracking-wide text-green-500" style={{ color: '#22c55e' }}>₹{price || '---'}</span>
            </div>
          )}
        </div>

        {includeBarcode && (
          <div className="w-[72%] mx-auto text-current mt-1.5 mb-3 opacity-90">
            <Barcode value={code} />
          </div>
        )}
      </div>
    </div>
  );
}


export default function ProductForm({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  // ── Reviews (edit mode only) ───────────────────────────────────────────────
  const [reviewForm, setReviewForm] = useState({ reviewer_name: '', rating: 4.5, review: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const { data: reviewData, refetch: refetchReviews } = useQuery({
    queryKey: ['product-reviews-admin', product?.id],
    queryFn: () => reviewApi.list({ product_id: product.id }),
    enabled: isEdit,
  });
  const productReviews = reviewData?.data?.reviews || [];

  const handleAddReview = async () => {
    if (!reviewForm.reviewer_name.trim()) return toast.error('Enter reviewer name');
    setReviewLoading(true);
    try {
      if (editingReview) {
        await reviewApi.update(editingReview.id, reviewForm);
        toast.success('Review updated');
        setEditingReview(null);
      } else {
        await reviewApi.create({ product_id: product.id, ...reviewForm });
        toast.success('Review added');
      }
      setReviewForm({ reviewer_name: '', rating: 4.5, review: '' });
      refetchReviews();
      qc.invalidateQueries(['admin-reviews']);
    } catch { toast.error('Failed'); }
    finally { setReviewLoading(false); }
  };

  const startEditReview = (r) => {
    setEditingReview(r);
    setReviewForm({ reviewer_name: r.user_name, rating: r.rating, review: r.review || '' });
  };

  const cancelEditReview = () => {
    setEditingReview(null);
    setReviewForm({ reviewer_name: '', rating: 4.5, review: '' });
  };

  const handleDeleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    await reviewApi.remove(id);
    if (editingReview?.id === id) cancelEditReview();
    refetchReviews();
    qc.invalidateQueries(['admin-reviews']);
  };

  // existingImages: images already saved in DB (edit mode)
  const [existingImages, setExistingImages] = useState(product?.images || []);
  // images: new images to upload { file, preview, color }
  const [images, setImages] = useState([]);
  // index of the new upload that will be the primary/home image
  const [primaryNewIndex, setPrimaryNewIndex] = useState(0);
  const [colorVariants, setColorVariants] = useState(() => {
    if (!product?.variants?.length) return [{ color: '', sizes: [{ size: '', stock: 0, sku: '' }] }];
    const map = {};
    product.variants.forEach((v) => {
      const key = v.color || '__none__';
      if (!map[key]) map[key] = { color: v.color || '', sizes: [] };
      map[key].sizes.push({ size: v.size || '', stock: v.stock || 0, sku: v.sku || '' });
    });
    return Object.values(map);
  });
  const [form, setForm] = useState({
    name: product?.name || '',
    category_id: product?.category_id || '',
    brand_id: product?.brand_id || '',
    description: product?.description || '',
type: product?.type || '',
    gender: product?.gender || '',
    age_group: product?.age_group || '',
    price: product?.price || '',
    offer_price: product?.offer_price || '',
    stock: product?.stock || '',
    sku: product?.sku || '',
    product_code: product?.product_code || '',
    sub_category: product?.sub_category || '',
    pattern: product?.pattern || '',
    default_rating: product?.default_rating ?? 4.5,
  });

  const [flags, setFlags] = useState({
    is_new_arrival:   product?.is_new_arrival   ?? false,
    is_featured:      product?.is_featured      ?? false,
    is_offer_product: product?.is_offer_product ?? false,
  });
  const toggleFlag = (key) => setFlags((f) => ({ ...f, [key]: !f[key] }));

  // ── Tag Generator States ──
  const [tagStyle, setTagStyle] = useState('black-pink');
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1);

  const { data: catData } = useQuery({ queryKey: ['categories-admin'], queryFn: categoryApi.list });
  const { data: brandData } = useQuery({ queryKey: ['brands-admin'], queryFn: brandApi.list });
  const categories = catData?.data?.categories || [];
  const brands = brandData?.data?.brands || [];

  // Derive selected category metadata
  const parseJson = (v) => {
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v || '[]'); } catch { return []; }
  };
  const selectedCat    = categories.find(c => String(c.id) === String(form.category_id));
  const isWomensCategory = selectedCat?.name?.toLowerCase().includes('women') ?? false;
  const catSubCats     = parseJson(selectedCat?.sub_categories).filter(s => s.is_active);
  const catTypes       = parseJson(selectedCat?.types).filter(t => t.is_active);
const catPatterns    = parseJson(selectedCat?.patterns).filter(p => p.is_active);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const buildSku = (code, color, idx) => {
    if (!code || !color) return '';
    return `${code}-${color[0].toUpperCase()}-S${idx + 1}`;
  };

  const handleCategoryChange = async (e) => {
    const category_id = e.target.value;
    setForm((p) => ({ ...p, category_id, sub_category: '', type: '' }));
    // Auto-fill women's sizes on the initial blank color variant when Women's is selected
    if (!isEdit) {
      const newCat = categories.find(c => String(c.id) === String(category_id));
      if (newCat?.name?.toLowerCase().includes('women')) {
        setColorVariants((cv) => {
          if (cv.length === 1 && !cv[0].color && cv[0].sizes.length === 1 && !cv[0].sizes[0].size) {
            return [{ color: '', sizes: WOMEN_SIZES.map((sz) => ({ size: sz, stock: 0, sku: '' })) }];
          }
          return cv;
        });
      }
    }
    if (!category_id || isEdit) return;
    try {
      const res = await productApi.nextCode(category_id);
      const newCode = res.data?.code || form.product_code;
      setForm((p) => ({ ...p, product_code: newCode }));
      setColorVariants((cv) => cv.map((c) => ({
        ...c,
        sizes: c.sizes.map((s, si) => ({ ...s, sku: buildSku(newCode, c.color, si) })),
      })));
    } catch { /* leave as-is */ }
  };

  // ── Color Variants ────────────────────────────────────────────────────────
  const addColorVariant = () => {
    const defaultSizes = isWomensCategory
      ? WOMEN_SIZES.map((sz, si) => ({ size: sz, stock: 0, sku: buildSku(form.product_code, '', si) }))
      : [{ size: '', stock: 0, sku: '' }];
    setColorVariants((cv) => [...cv, { color: '', sizes: defaultSizes }]);
  };
  const removeColorVariant = (ci) => setColorVariants((cv) => cv.filter((_, i) => i !== ci));
  const updateColorVariantColor = (ci, val) => setColorVariants((cv) => cv.map((c, i) =>
    i === ci ? { ...c, color: val, sizes: c.sizes.map((s, si) => ({ ...s, sku: buildSku(form.product_code, val, si) })) } : c
  ));
  const addSize = (ci) => setColorVariants((cv) => cv.map((c, i) => {
    if (i !== ci) return c;
    const newSi = c.sizes.length;
    return { ...c, sizes: [...c.sizes, { size: '', stock: 0, sku: buildSku(form.product_code, c.color, newSi) }] };
  }));
  const removeSize = (ci, si) => setColorVariants((cv) => cv.map((c, i) => {
    if (i !== ci) return c;
    const newSizes = c.sizes.filter((_, j) => j !== si)
      .map((s, j) => ({ ...s, sku: buildSku(form.product_code, c.color, j) }));
    return { ...c, sizes: newSizes };
  }));
  const updateSize = (ci, si, key, val) => setColorVariants((cv) => cv.map((c, i) => i === ci ? { ...c, sizes: c.sizes.map((s, j) => j === si ? { ...s, [key]: val } : s) } : c));

  const variantColors = [...new Set(colorVariants.map((cv) => cv.color).filter(Boolean))];

  // ── Images ────────────────────────────────────────────────────────────────
  const [activeColorTab, setActiveColorTab] = useState(null); // null = All

  const addImages = (files, color = null) => {
    const newImgs = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      color,
    }));
    setImages((prev) => [...prev, ...newImgs]);
    if (color) setActiveColorTab(color);
  };

  const removeImage = (realIdx) => {
    setImages((prev) => prev.filter((_, i) => i !== realIdx));
    setPrimaryNewIndex((p) => {
      if (realIdx === p) return 0;
      if (realIdx < p) return p - 1;
      return p;
    });
  };

  const deleteExistingImage = async (imageId) => {
    try {
      await productApi.deleteImage(product.id, imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image deleted');
    } catch { toast.error('Failed to delete image'); }
  };

  const setPrimaryImage = async (imageId) => {
    try {
      await productApi.setPrimaryImage(product.id, imageId);
      setExistingImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId })));
      toast.success('Primary image set');
    } catch { toast.error('Failed'); }
  };

  const uploadedColorTabs = [...new Set(images.map((i) => i.color).filter(Boolean))];
  const visibleImages = activeColorTab
    ? images.map((img, idx) => ({ ...img, idx })).filter((img) => img.color === activeColorTab)
    : images.map((img, idx) => ({ ...img, idx }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const hasVariants = colorVariants.some(cv => cv.color || cv.sizes.some(s => s.size));
  const variantTotalStock = colorVariants.reduce((sum, cv) =>
    sum + cv.sizes.reduce((s2, s) => s2 + (Number(s.stock) || 0), 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.offer_price && Number(form.offer_price) >= Number(form.price)) {
      toast.error('Offer price must be less than the regular price');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'stock') return; // always auto-calculated from variant stocks on backend
        if (v !== '') fd.append(k, v);
      });
      // Append boolean flags
      Object.entries(flags).forEach(([k, v]) => fd.append(k, v));
      const flatVariants = colorVariants.flatMap((cv) =>
        cv.sizes.map((s) => ({ color: cv.color, size: s.size, stock: Number(s.stock) || 0, sku: s.sku }))
      ).filter((v) => v.color || v.size);
      if (flatVariants.length) fd.append('variants', JSON.stringify(flatVariants));

      const imageColors = images.map((img) => img.color || null);
      fd.append('image_colors', JSON.stringify(imageColors));
      if (images.length) fd.append('primary_index', primaryNewIndex);
      images.forEach(({ file }) => fd.append('images', file));

      if (isEdit) {
        await productApi.update(product.id, fd);
        toast.success('Product updated');
      } else {
        await productApi.create(fd);
        toast.success('Product created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTags = (mode) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('Please allow popups to print/download tags');
      return;
    }

    let variantsToPrint = [];
    if (mode === 'single') {
      if (selectedVariantIndex === -1) {
        variantsToPrint = colorVariants.flatMap((cv) =>
          cv.sizes.map((s) => ({ color: cv.color, size: s.size, sku: s.sku }))
        ).filter(v => v.size || v.color);
      } else {
        const flat = colorVariants.flatMap((cv) =>
          cv.sizes.map((s) => ({ color: cv.color, size: s.size, sku: s.sku }))
        ).filter(v => v.size || v.color);
        if (flat[selectedVariantIndex]) {
          variantsToPrint = [flat[selectedVariantIndex]];
        }
      }
    } else {
      variantsToPrint = colorVariants.flatMap((cv) =>
        cv.sizes.map((s) => ({ color: cv.color, size: s.size, sku: s.sku }))
      ).filter(v => v.size || v.color);
    }

    if (variantsToPrint.length === 0) {
      variantsToPrint = [{ color: '', size: 'Free Size', sku: form.product_code || 'VL-PENDING' }];
    }

    let tagHtml = '';
    const selectedBrandObj = brands.find(b => String(b.id) === String(form.brand_id));
    const brandName = selectedBrandObj?.name || 'VELORA';

    const selectedCatObj = categories.find(c => String(c.id) === String(form.category_id));
    const categoryName = selectedCatObj?.name || 'Apparel';
    const name = form.name || 'Product Name';
    const price = Number(form.price) || 0;
    const offerPrice = Number(form.offer_price) || 0;
    const discountPercent = price > 0 && offerPrice > 0 && offerPrice < price
      ? Math.round(((price - offerPrice) / price) * 100)
      : 0;

    const getThemeCss = (themeKey) => {
      switch(themeKey) {
        case 'vibrant-rose':
          return 'background: linear-gradient(180deg, #ec4899 0%, #be185d 100%); color: #ffffff; border-color: rgba(255,255,255,0.3);';
        case 'modern-teal':
          return 'background: linear-gradient(180deg, #14b8a6 0%, #064e3b 100%); color: #ffffff; border-color: rgba(255,255,255,0.3);';
        case 'black-pink':
          return 'background: linear-gradient(180deg, #171717 0%, #0a0a0a 100%); color: #ffffff; border-color: rgba(236, 72, 153, 0.4);';
        case 'vintage-kraft':
          return 'background: linear-gradient(180deg, #e7cba8 0%, #d4b896 100%); color: #3e2723; border-color: #a1887f;';
        case 'classic-gold':
        default:
          return 'background: linear-gradient(180deg, #faf6eb 0%, #f5eedc 100%); color: #111111; border-color: rgba(212, 175, 55, 0.65);';
      }
    };

    const getHoleCss = (themeKey) => {
      switch(themeKey) {
        case 'vibrant-rose': return 'background: #be185d; border-color: rgba(255,255,255,0.4);';
        case 'modern-teal': return 'background: #064e3b; border-color: rgba(255,255,255,0.4);';
        case 'black-pink': return 'background: #0a0a0a; border-color: rgba(236, 72, 153, 0.5);';
        case 'vintage-kraft': return 'background: #d4b896; border-color: rgba(62, 39, 35, 0.3);';
        case 'classic-gold':
        default:
          return 'background: #f5eedc; border-color: rgba(212, 175, 55, 0.5);';
      }
    };

    const getLineCss = (themeKey) => {
      switch(themeKey) {
        case 'vibrant-rose': return 'border-top: 1px solid rgba(255,255,255,0.3);';
        case 'modern-teal': return 'border-top: 1px solid rgba(255,255,255,0.3);';
        case 'black-pink': return 'border-top: 1px solid rgba(236, 72, 153, 0.3);';
        case 'vintage-kraft': return 'border-top: 1px solid rgba(62, 39, 35, 0.25);';
        case 'classic-gold':
        default:
          return 'border-top: 1px solid rgba(212, 175, 55, 0.45);';
      }
    };

    const getBadgeCss = (themeKey) => {
      switch(themeKey) {
        case 'vibrant-rose': return 'background: transparent; color: #ffffff;';
        case 'modern-teal': return 'background: transparent; color: #ffffff;';
        case 'black-pink': return 'background: transparent; color: #ffffff;';
        case 'vintage-kraft': return 'background: transparent; color: #3e2723;';
        case 'classic-gold':
        default:
          return 'background: transparent; color: #5c4a24;';
      }
    };

    const getPriceBgCss = (themeKey) => {
      switch(themeKey) {
        case 'vibrant-rose': return 'background: transparent; color: #ffffff;';
        case 'modern-teal': return 'background: transparent; color: #ffffff;';
        case 'black-pink': return 'background: transparent; color: #f472b6;';
        case 'vintage-kraft': return 'background: transparent; color: #3e2723;';
        case 'classic-gold':
        default:
          return 'background: transparent; color: #111111;';
      }
    };

    const getMetaColor = (themeKey) => {
      switch(themeKey) {
        case 'vibrant-rose': return '#fecdd3';
        case 'modern-teal': return '#99f6e4';
        case 'black-pink': return '#f472b6';
        case 'vintage-kraft': return '#5d4037';
        case 'classic-gold':
        default:
          return '#7a6437';
      }
    };

    const getDiscountBadgeCss = (themeKey) => {
      return 'background: transparent; color: #6b7280;';
    };

    const getBarcodeHtml = (code) => {
      const uppercaseVal = (code || '').toUpperCase();
      const safeVal = uppercaseVal.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
      const fullVal = `*${safeVal}*`;

      let currentX = 0;
      const barWidth = 1.25;
      const height = 18;
      let rectsHtml = '';

      for (let i = 0; i < fullVal.length; i++) {
        const char = fullVal[i];
        const pattern = CODE39_MAP[char];
        if (!pattern) continue;

        for (let j = 0; j < pattern.length; j++) {
          if (pattern[j] === '1') {
            rectsHtml += `<rect x="${currentX}" y="0" width="${barWidth}" height="${height}" fill="currentColor" />`;
          }
          currentX += barWidth;
        }
        currentX += barWidth;
      }

      return `
        <div style="background: transparent; color: inherit; box-sizing: border-box; width: 72%; margin: 8px auto 8px auto; display: flex; flex-direction: column; align-items: center; opacity: 0.9;">
          <svg viewBox="0 0 ${currentX} ${height}" style="width: 100%; height: ${height}px; color: inherit; fill: currentColor;">
            ${rectsHtml}
          </svg>
          <span style="font-size: 8px; font-family: monospace; letter-spacing: 2px; margin-top: 2px; font-weight: bold; text-transform: uppercase;">${safeVal}</span>
        </div>
      `;
    };

    variantsToPrint.forEach((v) => {
      const code = v.sku || form.product_code || 'CODE-PENDING';
      const size = v.size || 'ALL';
      const colorText = v.color ? `<span style="font-size: 9px; font-weight: bold; margin-top: 4px; text-transform: uppercase; color: #4b5563;">Colour: <span style="color: ${getColorValue(v.color)};">${v.color}</span></span>` : '';
      const codeText = `<span style="font-size: 9px; font-weight: bold; margin-top: 4px; text-transform: uppercase; color: #4b5563;">Code: <span style="color: #ffffff;">${code}</span></span>`;

      // Resolve dynamic image URL for this variant
      const getVariantImageUrl = (varItem) => {
        if (varItem?.color) {
          const matchExisting = existingImages.find(img => img.color === varItem.color);
          if (matchExisting) return matchExisting.url;
          const matchNew = images.find(img => img.color === varItem.color);
          if (matchNew) return matchNew.preview;
        }
        const primaryImgObj = existingImages.find(img => img.is_primary);
        if (primaryImgObj) return primaryImgObj.url;
        return images[primaryNewIndex]?.preview || images[0]?.preview || '';
      };

      const vImgUrl = getVariantImageUrl(v);

      const getImgBorderCss = (themeKey) => {
        switch(themeKey) {
          case 'vintage-kraft': return 'border: 1px solid rgba(62, 39, 35, 0.25);';
          default: return 'border: 1px solid rgba(255, 255, 255, 0.25);';
        }
      };

      const imgHtml = vImgUrl 
        ? `<div style="width: 48px; height: 48px; border-radius: 8px; ${getImgBorderCss(tagStyle)} margin: 6px 0; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-shrink: 0;">
            <img src="${vImgUrl}" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;" />
           </div>`
        : `<div style="width: 48px; height: 48px; border-radius: 8px; border: 1.5px dashed ${tagStyle === 'vintage-kraft' ? 'rgba(62, 39, 35, 0.3)' : 'rgba(255,255,255,0.3)'}; margin: 6px 0; display: flex; align-items: center; justify-content: center; opacity: 0.4; flex-shrink: 0;">
            <span style="font-size: 8px; font-weight: bold;">TAG</span>
           </div>`;

      const priceHtml = discountPercent > 0 
        ? `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 9px; text-decoration: line-through; text-decoration-color: #ef4444; color: #ffffff;">₹${price}</span>
              <span style="font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 3px; ${getDiscountBadgeCss(tagStyle)}">
                ${discountPercent}% OFF
              </span>
            </div>
            <span style="font-size: 14px; font-weight: 900; letter-spacing: 0.5px; margin-top: 2px; color: #22c55e;">₹${offerPrice}</span>
          </div>
        `
        : `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 8px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">MRP</span>
            <span style="font-size: 14px; font-weight: 900; letter-spacing: 0.5px; color: #22c55e;">₹${price || '---'}</span>
          </div>
        `;

      const barcodeHtml = includeBarcode ? getBarcodeHtml(code) : '';

      tagHtml += `
        <div class="tag-card" style="${getThemeCss(tagStyle)}">
          ${tagStyle === 'vintage-kraft' ? '<div class="kraft-texture"></div>' : ''}
          
          <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
            <div style="position: relative; width: 100%; display: flex; justify-content: center; padding-top: 4px; margin-bottom: 10px;">
              <div class="hole" style="${getHoleCss(tagStyle)}"></div>
              <div class="string"></div>
            </div>
            <h2 class="brand-title">${brandName.toUpperCase()}</h2>
            <div class="divider" style="${getLineCss(tagStyle)}"></div>
          </div>

          <div class="tag-details">
            <span style="font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: ${getMetaColor(tagStyle)}; margin-bottom: 2px;">
              ${categoryName}
            </span>
            ${imgHtml}
            <h3 class="product-name">${name}</h3>
            ${colorText}
            ${codeText}
            <div class="badge" style="color: #4b5563; ${getBadgeCss(tagStyle)}">
              SIZE: <span style="color: #ffffff;">${size}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
            <div class="price-box" style="${getPriceBgCss(tagStyle)}">
              ${priceHtml}
            </div>
            ${barcodeHtml}
          </div>
        </div>
      `;
    });

    const isSheet = mode === 'sheet';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${name.replace(/\s+/g, '_')}_Tags</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Inter', sans-serif;
            background: #f3f4f6;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .tag-card {
            position: relative;
            width: 2.25in;
            height: 3.75in;
            border-radius: 14px;
            border: 1px solid;
            padding: 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            page-break-inside: avoid;
          }

          .kraft-texture {
            position: absolute;
            inset: 0;
            opacity: 0.08;
            pointer-events: none;
            mix-blend-mode: multiply;
            background-image: radial-gradient(#000 1px, transparent 1px);
            background-size: 12px 12px;
          }

          .hole {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
            z-index: 10;
          }

          .string {
            position: absolute;
            top: -24px;
            width: 1px;
            height: 28px;
            background: rgba(156, 163, 175, 0.4);
            z-index: 0;
          }

          .brand-title {
            font-family: 'Cinzel', serif;
            font-weight: 800;
            letter-spacing: 3px;
            font-size: 13px;
            text-align: center;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .divider {
            width: 40px;
            margin: 6px auto 0 auto;
          }

          .tag-details {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-grow: 1;
            justify-content: center;
            padding: 4px 0;
            text-align: center;
          }

          .product-name {
            font-size: 11px;
            font-weight: 800;
            line-height: 1.25;
            margin-top: 2px;
            letter-spacing: 0.2px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            max-height: 28px;
          }

          .badge {
            margin-top: 4px;
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          .price-box {
            border-radius: 9px;
            padding: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          ${isSheet ? `
            .print-container {
              display: grid;
              grid-template-columns: repeat(3, 2.25in);
              gap: 0.25in;
              padding: 0.5in;
              justify-content: center;
              align-content: start;
              min-height: 100vh;
            }
            @page {
              size: A4;
              margin: 0;
            }
            @media print {
              body {
                background: white;
              }
              .print-container {
                padding: 0.5in;
              }
              .tag-card {
                box-shadow: none !important;
                border: 1px dashed rgba(0,0,0,0.15) !important;
              }
            }
          ` : `
            .print-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            @page {
              size: 2.25in 3.75in;
              margin: 0;
            }
            @media print {
              body {
                background: white;
              }
              .print-container {
                padding: 0;
              }
              .tag-card {
                border-radius: 0;
                border: none !important;
                box-shadow: none !important;
                width: 2.25in;
                height: 3.75in;
              }
            }
          `}
        </style>
      </head>
      <body>
        <div class="print-container">
          ${tagHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal title={isEdit ? 'Edit Product' : 'Add Product'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── 1. Basic Info ── */}
        <div className="rounded-xl border border-pink-200 bg-green-50 p-4">
          <p className="text-[15px] font-bold text-pink-600 uppercase tracking-widest mb-3">Basic Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Product Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))} required placeholder="e.g. Floral Kurti Set" />
            </div>
            <Select label="Category" value={form.category_id} onChange={handleCategoryChange} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Brand" value={form.brand_id} onChange={set('brand_id')}>
              <option value="">No brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            {/* Sub-Category — cascades from selected category */}
            {catSubCats.length > 0 && (
              <Select label="Sub-Category" value={form.sub_category} onChange={set('sub_category')}>
                <option value="">— None —</option>
                {catSubCats.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </Select>
            )}
            {/* Type — cascades from selected category */}
            {catTypes.length > 0 && (
              <Select label="Type" value={form.type} onChange={set('type')}>
                <option value="">Select type</option>
                {catTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </Select>
            )}
            {/* Fallback type when no category-specific types */}
            {catTypes.length === 0 && form.category_id && (
              <Select label="Type" value={form.type} onChange={set('type')}>
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            )}
            <div className="col-span-2">
              <Textarea label="Description" value={form.description} onChange={set('description')} rows={2} />
            </div>
          </div>
        </div>

        {/* ── 2. Pricing & Stock ── */}
        <div className="rounded-xl border border-pink-300 bg-green-50 p-4">
          <p className="text-[15px] font-bold text-pink-600 uppercase tracking-widest mb-3">Pricing &amp; Stock</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (₹)" type="number" value={form.price} onChange={set('price')} required placeholder="0" />
            <Input label="Offer Price (₹)" type="number" value={form.offer_price} onChange={set('offer_price')} labelClassName="text-green-600" placeholder="0" />
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">Default Rating (shown before reviews)</label>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} type="button"
                    onClick={() => setForm((p) => ({ ...p, default_rating: p.default_rating == s ? '' : s }))}
                    className="text-2xl leading-none transition-transform hover:scale-110"
                    title={`${s} star${s > 1 ? 's' : ''}`}
                  >
                    <span style={{ color: s <= (form.default_rating || 0) ? '#facc15' : '#d1d5db' }}>★</span>
                  </button>
                ))}
                <input type="number" min="0" max="5" step="0.1"
                  value={form.default_rating}
                  onChange={set('default_rating')}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-yellow-400 text-center"
                  placeholder="0.0"
                />
                {form.default_rating > 0 && (
                  <button type="button" onClick={() => setForm((p) => ({ ...p, default_rating: '' }))}
                    className="text-xs text-gray-400 hover:text-red-500">✕ Clear</button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Optional · overridden by actual reviews once submitted</p>
            </div>
            <div className="col-span-2">
              <Input label="Product Code (shared across all variants)" value={form.product_code} onChange={set('product_code')}
                placeholder={form.category_id ? 'Auto-generated' : 'Select category first'} readOnly className="bg-gray-50 cursor-not-allowed" />
              {!isEdit && form.category_id && (
                <p className="text-[10px] text-indigo-500 mt-0.5">Auto-generated · editable · same for all variants of this product</p>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Product Details ── */}
        <div className="rounded-xl border border-pink-300 bg-green-50 p-4">
          <p className="text-[15px] font-bold text-pink-600 uppercase tracking-widest mb-3">Product Details</p>
          <div className="grid grid-cols-2 gap-3">
<Select label="Gender" value={form.gender} onChange={set('gender')}>
              <option value="">Any</option>
              {['Female', 'Male', 'Unisex'].map(g => <option key={g}>{g}</option>)}
            </Select>
            <Input label="Age Group" value={form.age_group} onChange={set('age_group')} placeholder="e.g. 0-3 months" />
            {/* Pattern — category-specific list when available, else global list */}
            <Select label="Pattern" value={form.pattern} onChange={set('pattern')}>
              <option value="">Select pattern</option>
              {catPatterns.length > 0
                ? catPatterns.map(p => <option key={p.name} value={p.name}>{p.name}</option>)
                : PATTERNS.map(p => <option key={p} value={p}>{p}</option>)
              }
            </Select>
          </div>
        </div>

        {/* ── 4. Variants & Images (merged) ── */}
        <div className="rounded-xl border border-blue-200 bg-blue-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-[15px] font-bold text-blue-600 uppercase tracking-widest">Variants &amp; Images</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Each colour gets multiple sizes &amp; its own images</p>
            </div>
            <button type="button" onClick={addColorVariant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-pink-600 text-md font-semibold hover:bg-indigo-100 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Colour
            </button>
          </div>

          {/* Colour variant cards */}
          <div className="divide-y divide-gray-50">
            {colorVariants.map((cv, ci) => {
              const colorHex = COLORS.find((c) => c.name === cv.color)?.hex;
              const variantImgs = images.map((img, idx) => ({ ...img, idx })).filter((img) => img.color === cv.color);
              return (
                <div key={ci} className="p-4 space-y-3">
                  {/* Colour picker row */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] text-pink-800 mb-1 font-semibold uppercase tracking-wide">Colour</p>
                      <ColorPicker value={cv.color} onChange={(val) => updateColorVariantColor(ci, val)} />
                    </div>
                    {colorHex && (
                      <span className="w-6 h-6 rounded-full border border-gray-200 shrink-0 mb-2" style={{ backgroundColor: colorHex }} />
                    )}
                    <button type="button" onClick={() => removeColorVariant(ci)}
                      className="mb-1.5 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sizes sub-table */}
                  <div className="pl-3 border-l-2 border-gray-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold text-pink-500 uppercase tracking-wide">Sizes, Stock &amp; Code</p>
                      <span className="text-[10px] text-gray-400">— each size gets a unique code &amp; stock</span>
                    </div>
                    {cv.sizes.map((s, si) => (
                      <div key={si} className="space-y-1">
                        <div className="grid gap-2 items-center" style={{ gridTemplateColumns: '1.2fr 70px 1.2fr 28px' }}>
                          <Select value={s.size} onChange={(e) => updateSize(ci, si, 'size', e.target.value)}>
                            <option value="">Size</option>
                            {SIZES.map((sz) => <option key={sz}>{sz}</option>)}
                          </Select>
                          <Input type="number" min={0} placeholder="Stock" value={s.stock}
                            onChange={(e) => updateSize(ci, si, 'stock', Math.max(0, Number(e.target.value)))} />
                          <Input placeholder="Auto SKU" value={s.sku}
                            onChange={(e) => updateSize(ci, si, 'sku', e.target.value)}
                            readOnly className="bg-gray-50 cursor-not-allowed text-gray-500 text-[11px]" />
                          <button type="button" onClick={() => removeSize(ci, si)}
                            className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors self-center">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {s.sku && Number(s.stock) > 0 && (
                          <div className="flex flex-wrap gap-1 pl-0.5">
                            {Array.from({ length: Number(s.stock) }, (_, ui) => (
                              <span key={ui} className="text-[10px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-1.5 py-0.5">
                                {s.sku}-{ui + 1}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addSize(ci)}
                      className="flex items-center gap-1 text-[15px] text-pink-500 hover:text-indigo-700 font-semibold transition-colors mt-1">
                      <Plus className="h-3 w-3" /> Add Size
                    </button>
                  </div>

                  {/* Images for this colour */}
                  {cv.color ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                          Images for {cv.color}
                        </span>
                        {variantImgs.length > 0 && (
                          <span className="text-[10px] bg-green-50 text-green-600 font-semibold px-1.5 py-0.5 rounded-full">
                            {variantImgs.length} uploaded
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {variantImgs.map(({ idx, preview }) => (
                          <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border shrink-0"
                            style={{ borderColor: idx === primaryNewIndex ? '#6366f1' : '#e5e7eb', borderWidth: idx === primaryNewIndex ? 2 : 1 }}>
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            {idx === primaryNewIndex && (
                              <span className="absolute top-0.5 left-0.5 z-10 text-[8px] bg-indigo-500 text-white px-1 rounded font-bold">★</span>
                            )}
                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                              {idx !== primaryNewIndex && (
                                <button type="button" onClick={() => setPrimaryNewIndex(idx)}
                                  className="text-[9px] text-yellow-300 font-bold leading-tight text-center px-1">★ Primary</button>
                              )}
                              <button type="button" onClick={() => removeImage(idx)}
                                className="text-[9px] text-red-400 font-bold">Delete</button>
                            </div>
                          </div>
                        ))}
                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors shrink-0 gap-0.5">
                          <ImagePlus className="h-4 w-4 text-gray-400" />
                          <span className="text-[9px] text-gray-400 font-medium">Add</span>
                          <input type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => addImages(e.target.files, cv.color)} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-500 bg-amber-50 rounded-lg px-3 py-2">
                      ⚠ Select a colour to upload images for this variant
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {isEdit && existingImages.length > 0 && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-semibold text-pink-800 uppercase tracking-widest mb-2">Saved Images</p>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border shrink-0"
                    style={{ borderColor: img.is_primary ? '#6366f1' : '#e5e7eb' }}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      {!img.is_primary && (
                        <button type="button" onClick={() => setPrimaryImage(img.id)}
                          className="text-[9px] text-yellow-300 font-bold leading-tight text-center px-1">★ Primary</button>
                      )}
                      <button type="button" onClick={() => deleteExistingImage(img.id)}
                        className="text-[9px] text-red-400 font-bold">Delete</button>
                    </div>
                    {img.is_primary && (
                      <span className="absolute top-0.5 left-0.5 text-[8px] bg-indigo-500 text-white px-1 rounded font-bold">★</span>
                    )}
                    {img.color && (
                      <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] bg-black/60 text-white text-center truncate rounded">{img.color}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Hover to delete or set primary. New uploads below will be added.</p>
            </div>
          )}
        </div>

        {/* Total Stock — shown below Variants so it updates live as stocks are entered */}
        <div className="flex items-center gap-3 bg-green-50 border border-pink-300 rounded-xl px-4 py-2.5">
          <span className="text-md text-gary-100 font-semibold uppercase tracking-wide">Total Stock - </span>
          <span className="text-lg font-bold text-pink-700">{variantTotalStock}</span>
          <span className="text-xs text-indigo-400 ml-auto">Auto-calculated from variant stocks above</span>
        </div>

        {/* ── 5. Visibility & Labels ── */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-[11px] font-bold text-violet-700 uppercase tracking-widest mb-3">Visibility &amp; Labels</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'is_new_arrival',   label: 'New Arrival', desc: 'Show in New Arrivals',     icon: '🆕', color: '#3b82f6' },
              { key: 'is_featured',      label: 'Trending',    desc: 'Show in Trending section', icon: '🔥', color: '#f97316' },
              { key: 'is_offer_product', label: 'Offer',       desc: 'Show in Offers section',   icon: '⚡', color: '#22c55e' },
            ].map(({ key, label, desc, icon, color }) => {
              const isHiddenActive = key === 'is_hidden' && flags[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFlag(key)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-all text-left"
                  style={{
                    borderColor: flags[key] ? (isHiddenActive ? '#ef4444' : '#8b5cf6') : 'transparent',
                    backgroundColor: isHiddenActive ? '#ef4444' : flags[key] ? '#fff' : 'rgba(255,255,255,0.6)',
                    opacity: flags[key] ? 1 : 0.6,
                    boxShadow: flags[key] ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {/* Toggle pill */}
                  <span
                    className="w-10 h-6 rounded-full relative transition-colors flex-shrink-0"
                    style={{ backgroundColor: flags[key] ? (isHiddenActive ? '#fff' : color) : '#d1d5db' }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 rounded-full shadow transition-all"
                      style={{
                        backgroundColor: isHiddenActive ? '#ef4444' : '#fff',
                        left: flags[key] ? '1.25rem' : '0.25rem',
                      }}
                    />
                  </span>
                  <span className="text-lg leading-none">{icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold" style={{ color: isHiddenActive ? '#fff' : '#1f2937' }}>{label}</span>
                    <span className="block text-[11px]" style={{ color: isHiddenActive ? 'rgba(255,255,255,0.8)' : '#9ca3af' }}>{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 6. Product Tag Generator ── */}
        {(() => {
          const activeVariants = colorVariants.flatMap((cv) =>
            cv.sizes.map((s) => ({ color: cv.color, size: s.size, sku: s.sku }))
          ).filter(v => v.size || v.color);

          const previewVariant = selectedVariantIndex === -1
            ? activeVariants[0] || { color: '', size: 'Free Size', sku: form.product_code || 'VL-DEMO' }
            : activeVariants[selectedVariantIndex] || { color: '', size: 'Free Size', sku: form.product_code || 'VL-DEMO' };

          const selectedBrandObj = brands.find(b => String(b.id) === String(form.brand_id));
          const brandName = selectedBrandObj?.name || 'VELORA';

          const selectedCatObj = categories.find(c => String(c.id) === String(form.category_id));
          const categoryName = selectedCatObj?.name || 'Apparel';

          const getPreviewImageUrl = (v) => {
            if (v?.color) {
              const matchExisting = existingImages.find(img => img.color === v.color);
              if (matchExisting) return matchExisting.url;
              const matchNew = images.find(img => img.color === v.color);
              if (matchNew) return matchNew.preview;
            }
            const primaryImgObj = existingImages.find(img => img.is_primary);
            if (primaryImgObj) return primaryImgObj.url;
            return images[primaryNewIndex]?.preview || images[0]?.preview || '';
          };
          const previewImageUrl = getPreviewImageUrl(previewVariant);

          return (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div>
                  <p className="text-[15px] font-bold text-indigo-700 uppercase tracking-widest">🏷 Product Tag Generator</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Auto-create classic & colorful professional tags for your garments</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">Preview Mode</span>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left Column: Controls */}
                <div className="flex-grow w-full space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Select Variant</label>
                      <select 
                        value={selectedVariantIndex}
                        onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 bg-white"
                      >
                        <option value={-1}>All Variants (Bulk PDF Sheet)</option>
                        {activeVariants.map((v, idx) => (
                          <option key={idx} value={idx}>
                            {v.color ? `${v.color} - ` : ''}{v.size || 'Free Size'} {v.sku ? `(${v.sku})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Tag Style</label>
                      <select 
                        value={tagStyle}
                        onChange={(e) => setTagStyle(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 bg-white"
                      >
                        {Object.entries(TAG_THEMES).map(([k, t]) => (
                          <option key={k} value={k}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Barcode Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                    <div>
                      <p className="text-sm font-bold text-gray-700">Include Barcode</p>
                      <p className="text-[10px] text-gray-400">Generate a scannable Code 39 barcode representing the SKU/Code</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeBarcode(!includeBarcode)}
                      className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                      style={{ backgroundColor: includeBarcode ? '#4f46e5' : '#d1d5db' }}
                    >
                      <span
                        className="absolute top-1 w-4 h-4 rounded-full shadow transition-all bg-white"
                        style={{ left: includeBarcode ? '1.5rem' : '0.25rem' }}
                      />
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePrintTags('single')}
                      className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      📥 Download PDF (Single Tag)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintTags('sheet')}
                      className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
                    >
                      🖨 Print Bulk Sheet (A4 PDF)
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Tag Preview */}
                <div className="w-full lg:w-auto flex justify-center shrink-0 p-4 border border-dashed border-indigo-150 rounded-2xl bg-white/50">
                  <ProductTagPreview 
                    productData={{
                      name: form.name,
                      price: form.price,
                      offer_price: form.offer_price,
                      product_code: form.product_code,
                      categoryName: categoryName
                    }}
                    variant={previewVariant}
                    themeKey={tagStyle}
                    includeBarcode={includeBarcode}
                    brandName={brandName}
                    imageUrl={previewImageUrl}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Reviews (edit mode only) ── */}
        {isEdit && (
          <div className="border-t border-green-600 pt-5">
            <label className="text-xs font-medium text-yellow-600 uppercase tracking-wide block mb-3">
              Customer Reviews &amp; Ratings
            </label>

            {/* Add / Edit review form */}
            <div className={`rounded-xl p-4 mb-4 space-y-3 ${editingReview ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'}`}>
              {editingReview && (
                <p className="text-xs font-semibold text-indigo-600">Editing review by {editingReview.user_name}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reviewer Name</p>
                  <input
                    value={reviewForm.reviewer_name}
                    onChange={(e) => setReviewForm((p) => ({ ...p, reviewer_name: e.target.value }))}
                    placeholder="e.g. Priya from Mumbai"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rating</p>
                  <StarPicker value={reviewForm.rating} onChange={(v) => setReviewForm((p) => ({ ...p, rating: v }))} />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Review Text (optional)</p>
                <textarea
                  value={reviewForm.review}
                  onChange={(e) => setReviewForm((p) => ({ ...p, review: e.target.value }))}
                  placeholder="Write the review..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingReview && (
                  <Button type="button" size="sm" variant="outline" onClick={cancelEditReview}>Cancel</Button>
                )}
                <Button type="button" size="sm" loading={reviewLoading} onClick={handleAddReview}>
                  {editingReview ? 'Save Changes' : <><Plus className="h-3.5 w-3.5" /> Add Review</>}
                </Button>
              </div>
            </div>

            {/* Existing reviews */}
            {productReviews.length > 0 && (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {productReviews.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600 font-bold text-xs">
                      {r.user_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{r.user_name}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className="h-3 w-3"
                              style={{ fill: s <= r.rating ? '#facc15' : 'transparent', color: s <= r.rating ? '#facc15' : '#d1d5db' }} />
                          ))}
                        </div>
                        {r.is_admin_created && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-medium">Admin</span>
                        )}
                      </div>
                      {r.review && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.review}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => startEditReview(r)}
                        className="p-1 rounded text-gray-300 hover:text-indigo-500 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteReview(r.id)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Update' : 'Create'} Product</Button>
        </div>
      </form>
    </Modal>
  );
}
