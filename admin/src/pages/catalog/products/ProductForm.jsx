import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Plus, Trash2, ImagePlus, Camera, Star, Pencil, Crop,
  Sparkles, TrendingUp, Tag, Printer, Download, CheckCircle2,
  HelpCircle, Layers, Boxes, Coins, Package,
} from 'lucide-react';
import { productApi, categoryApi, brandApi, reviewApi } from '../../../api';
import Button from '../../../components/ui/Button';
import ImageCropperModal from '../../../components/ui/ImageCropperModal';
import Input, { Select, Textarea } from '../../../components/ui/Input';
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

function Barcode({ value, barWidth = 2.5, height = 70 }) {
  const uppercaseVal = (value || '').toUpperCase();
  const safeVal = uppercaseVal.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
  const fullVal = `*${safeVal}*`;

  let currentX = 0;
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
      <span className="text-xs font-mono font-bold tracking-[3px] mt-2 text-center uppercase text-gray-800">{safeVal}</span>
    </div>
  );
}

// Product Tag Generator has been simplified to a plain Barcode Generator —
// the decorative hanging-tag themes, colour swatches, and card layout that
// used to live here (TAG_THEMES, getColorValue, ProductTagPreview) were removed.


export default function ProductForm({ product, onCancel, onSaved }) {
  const isEdit = !!product;
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  // ── Reviews — available in both add & edit mode. In edit mode each action
  // hits the API immediately; in add mode (no product id yet) reviews are
  // held locally in `pendingReviews` and sent along with the create request,
  // then inserted server-side once the new product's id exists. ──────────────
  const EMPTY_REVIEW_FORM = { reviewer_name: '', rating: 4.5, review: '', imageFile: null, imagePreview: null, existingImageUrl: null };
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW_FORM);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(null); // API review object, or { isLocal: true, index }
  const [pendingReviews, setPendingReviews] = useState([]); // add-mode only

  const { data: reviewData, refetch: refetchReviews } = useQuery({
    queryKey: ['product-reviews-admin', product?.id],
    queryFn: () => reviewApi.list({ product_id: product.id }),
    enabled: isEdit,
  });
  const productReviews = reviewData?.data?.reviews || [];

  const handleReviewImagePick = (file) => {
    if (!file) return;
    setReviewForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file), existingImageUrl: null }));
  };

  const removeReviewImage = () => {
    setReviewForm((p) => ({ ...p, imageFile: null, imagePreview: null, existingImageUrl: null }));
  };

  const handleAddReview = async () => {
    if (!reviewForm.reviewer_name.trim()) return toast.error('Enter reviewer name');

    if (!isEdit) {
      const entry = {
        reviewer_name: reviewForm.reviewer_name,
        rating: reviewForm.rating,
        review: reviewForm.review,
        imageFile: reviewForm.imageFile,
        imagePreview: reviewForm.imagePreview,
      };
      if (editingReview?.isLocal) {
        setPendingReviews((prev) => prev.map((r, i) => (i === editingReview.index ? entry : r)));
        toast.success('Review updated');
      } else {
        setPendingReviews((prev) => [...prev, entry]);
        toast.success('Review will be added once the product is saved');
      }
      setReviewForm(EMPTY_REVIEW_FORM);
      setEditingReview(null);
      return;
    }

    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('reviewer_name', reviewForm.reviewer_name);
      fd.append('rating', reviewForm.rating);
      fd.append('review', reviewForm.review || '');
      if (reviewForm.imageFile) fd.append('images', reviewForm.imageFile);

      if (editingReview) {
        await reviewApi.update(editingReview.id, fd);
        toast.success('Review updated');
        setEditingReview(null);
      } else {
        fd.append('product_id', product.id);
        await reviewApi.create(fd);
        toast.success('Review added');
      }
      setReviewForm(EMPTY_REVIEW_FORM);
      refetchReviews();
      qc.invalidateQueries(['admin-reviews']);
    } catch { toast.error('Failed'); }
    finally { setReviewLoading(false); }
  };

  const startEditReview = (r, localIndex) => {
    if (localIndex !== undefined) {
      setEditingReview({ isLocal: true, index: localIndex });
      setReviewForm({
        reviewer_name: r.reviewer_name, rating: r.rating, review: r.review || '',
        imageFile: r.imageFile || null, imagePreview: r.imagePreview || null, existingImageUrl: null,
      });
    } else {
      setEditingReview(r);
      setReviewForm({
        reviewer_name: r.user_name, rating: r.rating, review: r.review || '',
        imageFile: null, imagePreview: null, existingImageUrl: r.image_url || null,
      });
    }
  };

  const cancelEditReview = () => {
    setEditingReview(null);
    setReviewForm(EMPTY_REVIEW_FORM);
  };

  const removePendingReview = (index) => {
    setPendingReviews((prev) => prev.filter((_, i) => i !== index));
    if (editingReview?.isLocal && editingReview.index === index) cancelEditReview();
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
    cost_price: product?.cost_price || '',
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

  // ── Barcode Generator State ──
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1);
  // How many labels to print per variant, keyed by SKU. Defaults to that
  // variant's stock count (one barcode per physical unit) until overridden.
  const [printQty, setPrintQty] = useState({});
  const getPrintQty = (v) => {
    const q = printQty[v.sku];
    return q !== undefined ? q : Number(v.stock) || 0;
  };

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

  // ── Images & Cropper ──────────────────────────────────────────────────────
  const [activeColorTab, setActiveColorTab] = useState(null); // null = All
  const [cropperModal, setCropperModal] = useState({
    isOpen: false,
    imageSrc: null,
    imageIndex: null,
  });

  const openCropper = (imageSrc, imageIndex) => {
    setCropperModal({
      isOpen: true,
      imageSrc,
      imageIndex,
    });
  };

  const handleCroppedImageSave = (croppedFile, croppedPreview) => {
    const { imageIndex } = cropperModal;
    if (imageIndex !== null && imageIndex !== undefined) {
      setImages((prev) =>
        prev.map((img, i) =>
          i === imageIndex ? { ...img, file: croppedFile, preview: croppedPreview } : img
        )
      );
      toast.success('Image cropped & updated');
    }
  };

  const addImages = (files, color = null) => {
    const fileList = Array.from(files);
    if (!fileList.length) return;
    const newImgs = fileList.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      color,
    }));
    setImages((prev) => {
      const nextIdx = prev.length;
      setTimeout(() => {
        openCropper(newImgs[0].preview, nextIdx);
      }, 150);
      return [...prev, ...newImgs];
    });
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
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.category_id) {
      toast.error('Please select a category');
      return;
    }
    if (!form.price) {
      toast.error('Price is required');
      return;
    }
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

      // New-product reviews were only kept locally until now — send them
      // along so the backend can attach them to the product it's about to create.
      // Review photos go in a separate `review_images` field; `has_image` tells
      // the backend which reviews (in order) to pull the next file for.
      if (!isEdit && pendingReviews.length) {
        const reviewsPayload = pendingReviews.map((r) => ({
          reviewer_name: r.reviewer_name,
          rating: r.rating,
          review: r.review,
          has_image: !!r.imageFile,
        }));
        fd.append('reviews', JSON.stringify(reviewsPayload));
        pendingReviews.forEach((r) => { if (r.imageFile) fd.append('review_images', r.imageFile); });
      }

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
      toast.error('Please allow popups to print/download barcodes');
      return;
    }

    const allVariants = colorVariants.flatMap((cv) =>
      cv.sizes.map((s) => ({ color: cv.color, size: s.size, sku: s.sku, stock: s.stock }))
    ).filter(v => v.size || v.color);

    let variantsToPrint = [];
    if (mode === 'single') {
      // Single mode prints one test label of just the selected variant, regardless of quantity.
      if (selectedVariantIndex === -1) {
        variantsToPrint = allVariants.slice(0, 1);
      } else if (allVariants[selectedVariantIndex]) {
        variantsToPrint = [allVariants[selectedVariantIndex]];
      }
    } else {
      // Bulk sheet: repeat each variant's barcode by its print quantity
      // (defaults to that variant's stock — one label per physical unit).
      variantsToPrint = allVariants.flatMap((v) => Array(getPrintQty(v)).fill(v));
    }

    if (variantsToPrint.length === 0) {
      variantsToPrint = [{ color: '', size: 'Free Size', sku: form.product_code || 'VL-PENDING' }];
    }

    // Just the barcode + its code text — no product name/price/theme card
    const getBarcodeHtml = (code) => {
      const uppercaseVal = (code || '').toUpperCase();
      const safeVal = uppercaseVal.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
      const fullVal = `*${safeVal}*`;

      let currentX = 0;
      const barWidth = 2;
      const height = 50;
      let rectsHtml = '';

      for (let i = 0; i < fullVal.length; i++) {
        const char = fullVal[i];
        const pattern = CODE39_MAP[char];
        if (!pattern) continue;

        for (let j = 0; j < pattern.length; j++) {
          if (pattern[j] === '1') {
            rectsHtml += `<rect x="${currentX}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`;
          }
          currentX += barWidth;
        }
        currentX += barWidth;
      }

      return `
        <svg viewBox="0 0 ${currentX} ${height}" style="width: 100%; height: ${height}px;">
          ${rectsHtml}
        </svg>
      `;
    };

    let tagHtml = '';
    variantsToPrint.forEach((v) => {
      const code = v.sku || form.product_code || 'CODE-PENDING';
      tagHtml += `<div class="barcode-label">${getBarcodeHtml(code)}</div>`;
    });

    const isSheet = mode === 'sheet';
    const title = (form.name || form.product_code || 'Barcode').replace(/\s+/g, '_');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}_Barcodes</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
            background: #f3f4f6;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .barcode-label {
            width: 2in;
            height: 1in;
            border: 1px dashed #9ca3af;
            border-radius: 4px;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 6px;
            page-break-inside: avoid;
          }

          ${isSheet ? `
            .print-container {
              display: grid;
              grid-template-columns: repeat(4, 2in);
              gap: 0.15in;
              padding: 0.4in;
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
                padding: 0.4in;
              }
              .barcode-label {
                border: 1px dashed rgba(0,0,0,0.2);
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
              size: 2.25in 1.25in;
              margin: 0;
            }
            @media print {
              body {
                background: white;
              }
              .print-container {
                padding: 0;
              }
              .barcode-label {
                border: none !important;
                width: 2.25in;
                height: 1.25in;
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
    <div className="w-full space-y-6 pb-20">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Sticky Action Header ────────────────────────────────────────── */}
        <div className="sticky top-3 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {form.name || (isEdit ? 'Edit Product' : 'New Product Listing')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isEdit ? 'Active Revision' : 'Draft'}
                </span>
                {form.product_code && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    {form.product_code}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="px-5 shadow-sm">
              {isEdit ? 'Update Product' : 'Publish Product'}
            </Button>
          </div>
        </div>

        {/* ── 1. Basic Info ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">General Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">Product title, category classification, and brand</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Product Name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                required
                placeholder="e.g. Kanchipuram Pure Silk Zari Saree"
              />
            </div>

            <Select label="Primary Category" value={form.category_id} onChange={handleCategoryChange} required>
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
              <Select label="Garment Type" value={form.type} onChange={set('type')}>
                <option value="">Select type</option>
                {catTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </Select>
            )}

            {/* Fallback type when no category-specific types */}
            {catTypes.length === 0 && form.category_id && (
              <Select label="Garment Type" value={form.type} onChange={set('type')}>
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            )}

            <div className="md:col-span-2">
              <Textarea
                label="Product Description"
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Add fabric composition, styling notes, wash care..."
              />
            </div>
          </div>
        </div>

        {/* ── 2. Pricing & Profit Simulator ───────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Pricing &amp; Profit Margin Simulator</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define your Buy Price (COGS), Price, and Offer Price to preview profit</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Buy Price / Procurement Cost (₹)"
                type="number"
                value={form.cost_price}
                onChange={set('cost_price')}
                placeholder="0"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your purchase or manufacturing cost. Used to calculate real-time profit and margin percentage below.
              </p>
            </div>

            <Input
              label="Standard Retail Price (MRP ₹)"
              type="number"
              value={form.price}
              onChange={set('price')}
              required
              placeholder="0"
            />

            <Input
              label="Discounted Offer Price (₹)"
              type="number"
              value={form.offer_price}
              onChange={set('offer_price')}
              placeholder="0"
            />

            {/* ── Profit Preview Simulator ── */}
            {(() => {
              const buyPrice = Number(form.cost_price) || 0;
              const sellPrice = Number(form.price) || 0;
              const offerPrice = Number(form.offer_price) || 0;

              if (!buyPrice) {
                return (
                  <div className="md:col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Enter a <strong>Buy Price</strong> above to calculate profit in INR and gross profit margin percentage.</span>
                  </div>
                );
              }

              const priceProfit = sellPrice > 0 ? sellPrice - buyPrice : 0;
              const priceProfitPct = sellPrice > 0 ? (priceProfit / sellPrice) * 100 : 0;
              const offerProfit = offerPrice > 0 ? offerPrice - buyPrice : 0;
              const offerProfitPct = offerPrice > 0 ? (offerProfit / offerPrice) * 100 : 0;

              const ProfitCard = ({ label, active, profit, pct }) => (
                <div className={`rounded-xl border p-4 transition-all ${
                  !active
                    ? 'border-slate-200 bg-slate-50/50'
                    : profit >= 0
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {label}
                  </p>
                  {active ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Profit</p>
                        <p className={`text-xl font-extrabold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ₹{profit.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit Margin</p>
                        <p className={`text-xl font-extrabold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Not configured</p>
                  )}
                </div>
              );

              return (
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfitCard label="Standard Price Profitability" active={sellPrice > 0} profit={priceProfit} pct={priceProfitPct} />
                  <ProfitCard label="Offer Price Profitability" active={offerPrice > 0} profit={offerProfit} pct={offerProfitPct} />
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Default Star Rating (Shown before verified reviews)
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, default_rating: p.default_rating == s ? '' : s }))}
                    className="text-2xl leading-none transition-transform hover:scale-110 cursor-pointer"
                    title={`${s} star${s > 1 ? 's' : ''}`}
                  >
                    <span style={{ color: s <= (form.default_rating || 0) ? '#f59e0b' : '#cbd5e1' }}>★</span>
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.default_rating}
                  onChange={set('default_rating')}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-slate-400 text-center font-bold"
                  placeholder="0.0"
                />
                {form.default_rating > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, default_rating: '' }))}
                    className="text-xs text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <Input
                label="Product Code (Shared identifier across all variants)"
                value={form.product_code}
                onChange={set('product_code')}
                placeholder={form.category_id ? 'Auto-generated' : 'Select category first'}
                readOnly
                className="bg-slate-50 cursor-not-allowed font-mono text-xs"
              />
              {!isEdit && form.category_id && (
                <p className="text-[10px] text-slate-400 mt-1">Auto-generated base SKU prefix for this product</p>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Classification & Attributes ──────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Product Attributes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Demographics, age target, and visual patterns</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Target Gender" value={form.gender} onChange={set('gender')}>
              <option value="">Any / Unisex</option>
              {['Female', 'Male', 'Unisex'].map(g => <option key={g}>{g}</option>)}
            </Select>

            <Input
              label="Age Group"
              value={form.age_group}
              onChange={set('age_group')}
              placeholder="e.g. Adults, 2-5 Years"
            />

            <Select label="Fabric Pattern" value={form.pattern} onChange={set('pattern')}>
              <option value="">Select pattern</option>
              {catPatterns.length > 0
                ? catPatterns.map(p => <option key={p.name} value={p.name}>{p.name}</option>)
                : PATTERNS.map(p => <option key={p} value={p}>{p}</option>)
              }
            </Select>
          </div>
        </div>

        {/* ── 4. Variants, Colorways & Image Gallery ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Variants, Colorways &amp; Gallery</h2>
                <p className="text-xs text-slate-500 mt-0.5">Each color variant gets independent sizes, stocks, and photo galleries</p>
              </div>
            </div>

            <button
              type="button"
              onClick={addColorVariant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Color
            </button>
          </div>

          {/* Color variant cards */}
          <div className="divide-y divide-slate-100">
            {colorVariants.map((cv, ci) => {
              const colorHex = COLORS.find((c) => c.name === cv.color)?.hex;
              const variantImgs = images.map((img, idx) => ({ ...img, idx })).filter((img) => img.color === cv.color);

              return (
                <div key={ci} className="p-5 sm:p-6 space-y-4 bg-slate-50/30">
                  {/* Colour picker row */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Color Variant</p>
                      <ColorPicker value={cv.color} onChange={(val) => updateColorVariantColor(ci, val)} />
                    </div>
                    {colorHex && (
                      <span className="w-7 h-7 rounded-full border border-slate-300 shrink-0 mb-1.5 shadow-sm" style={{ backgroundColor: colorHex }} />
                    )}
                    <button
                      type="button"
                      onClick={() => removeColorVariant(ci)}
                      className="mb-1 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      title="Delete Color Variant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sizes sub-table */}
                  <div className="pl-4 border-l-2 border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sizes, Stock &amp; Barcode SKU</p>
                      <button
                        type="button"
                        onClick={() => addSize(ci)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Size
                      </button>
                    </div>

                    {cv.sizes.map((s, si) => (
                      <div key={si} className="space-y-1.5">
                        <div className="grid gap-2.5 items-center" style={{ gridTemplateColumns: '1fr 90px 1.4fr 32px' }}>
                          <Select value={s.size} onChange={(e) => updateSize(ci, si, 'size', e.target.value)}>
                            <option value="">Select Size</option>
                            {SIZES.map((sz) => <option key={sz}>{sz}</option>)}
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Stock"
                            value={s.stock}
                            onChange={(e) => updateSize(ci, si, 'stock', Math.max(0, Number(e.target.value)))}
                          />
                          <Input
                            placeholder="Auto SKU"
                            value={s.sku}
                            onChange={(e) => updateSize(ci, si, 'sku', e.target.value)}
                            readOnly
                            className="bg-slate-50 cursor-not-allowed text-slate-600 font-mono text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => removeSize(ci, si)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors self-center"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {s.sku && Number(s.stock) > 0 && (
                          <div className="flex flex-wrap gap-1 pl-1">
                            {Array.from({ length: Math.min(Number(s.stock), 10) }, (_, ui) => (
                              <span key={ui} className="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5">
                                {s.sku}-{ui + 1}
                              </span>
                            ))}
                            {Number(s.stock) > 10 && (
                              <span className="text-[10px] text-slate-400 font-medium px-1">
                                +{Number(s.stock) - 10} more labels
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Images for this colour */}
                  {cv.color ? (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Photos for {cv.color}
                        </span>
                        {variantImgs.length > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            {variantImgs.length} uploaded
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2.5 flex-wrap">
                        {variantImgs.map(({ idx, preview }) => (
                          <div
                            key={idx}
                            className={`relative group w-20 h-20 rounded-xl overflow-hidden border shrink-0 transition-all ${
                              idx === primaryNewIndex ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200'
                            }`}
                          >
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            {idx === primaryNewIndex && (
                              <span className="absolute top-1 left-1 z-10 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">Primary</span>
                            )}
                            <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                              <button
                                type="button"
                                onClick={() => openCropper(preview, idx)}
                                className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 hover:underline"
                              >
                                <Crop className="h-3 w-3" /> Crop
                              </button>
                              {idx !== primaryNewIndex && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryNewIndex(idx)}
                                  className="text-[10px] text-amber-300 font-bold leading-tight"
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="text-[10px] text-rose-400 font-bold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors shrink-0 gap-1">
                          <ImagePlus className="h-5 w-5 text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-bold">Add Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => addImages(e.target.files, cv.color)}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      Select a color above to upload variant-specific photos
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Saved Images for edit mode */}
          {isEdit && existingImages.length > 0 && (
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Saved Product Photos</p>
              <div className="flex gap-2.5 flex-wrap">
                {existingImages.map((img) => (
                  <div
                    key={img.id}
                    className={`relative group w-20 h-20 rounded-xl overflow-hidden border shrink-0 transition-all ${
                      img.is_primary ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(img.id)}
                          className="text-[10px] text-amber-300 font-bold"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteExistingImage(img.id)}
                        className="text-[10px] text-rose-400 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">Primary</span>
                    )}
                    {img.color && (
                      <span className="absolute bottom-1 left-1 right-1 text-[8px] bg-black/70 text-white text-center truncate rounded px-1">{img.color}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">Hover photo to change primary status or delete from catalog.</p>
            </div>
          )}

          {/* Total Stock Indicator Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Boxes className="h-4 w-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Warehouse Inventory:</span>
              <span className="text-lg font-extrabold text-slate-900">{variantTotalStock} units</span>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Automatically calculated from all variant sizes
            </span>
          </div>
        </div>

        {/* ── 5. Visibility & Merchandising Badges (Zero Emojis) ───────────── */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center font-bold text-xs shrink-0">
              5
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Merchandising &amp; Storefront Badges</h2>
              <p className="text-xs text-slate-500 mt-0.5">Toggle visibility across featured collections and promotions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'is_new_arrival',   label: 'New Arrival', desc: 'Display in New Arrivals collection', icon: Sparkles, activeColor: 'border-sky-500 bg-sky-50/50' },
              { key: 'is_featured',      label: 'Trending',    desc: 'Feature on homepage spotlight',      icon: TrendingUp, activeColor: 'border-amber-500 bg-amber-50/50' },
              { key: 'is_offer_product', label: 'Special Offer', desc: 'Promote in Deals & Discounts',    icon: Tag, activeColor: 'border-rose-500 bg-rose-50/50' },
            ].map(({ key, label, desc, icon: Icon, activeColor }) => {
              const isActive = flags[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFlag(key)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                    isActive ? activeColor : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">{label}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{desc}</span>
                    <span className={`inline-block text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full border ${
                      isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {isActive ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 6. Barcode Generator & Printing (Zero Emojis) ────────────────── */}
        {(() => {
          const activeVariants = colorVariants.flatMap((cv) =>
            cv.sizes.map((s) => ({ color: cv.color, size: s.size, sku: s.sku, stock: Number(s.stock) || 0 }))
          ).filter(v => v.size || v.color);

          const previewVariant = selectedVariantIndex === -1
            ? activeVariants[0] || { color: '', size: 'Free Size', sku: form.product_code || 'VL-DEMO' }
            : activeVariants[selectedVariantIndex] || { color: '', size: 'Free Size', sku: form.product_code || 'VL-DEMO' };

          const previewCode = previewVariant?.sku || form.product_code || 'CODE-PENDING';
          const totalLabels = activeVariants.reduce((sum, v) => sum + getPrintQty(v), 0);

          return (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    6
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Barcode &amp; Label Production</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Generate Code-39 barcodes and download thermal bulk print sheets</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {totalLabels} Labels Configured
                </span>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left: Variant quantity list */}
                <div className="flex-1 w-full space-y-3">
                  {activeVariants.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200 p-4">
                      Add color and size variants above to configure barcode printing.
                    </p>
                  ) : (
                    <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-[1fr_100px] gap-2 px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Variant SKU</span>
                        <span className="text-right">Print Qty</span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        {activeVariants.map((v, idx) => (
                          <div
                            key={v.sku || idx}
                            onClick={() => setSelectedVariantIndex(idx)}
                            className={`grid grid-cols-[1fr_100px] gap-2 px-4 py-2.5 items-center cursor-pointer transition-colors ${
                              selectedVariantIndex === idx ? 'bg-indigo-50/60' : 'hover:bg-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {v.color ? `${v.color} · ` : ''}{v.size || 'Standard'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{v.sku || '—'} · Stock: {v.stock}</p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={getPrintQty(v)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setPrintQty((p) => ({ ...p, [v.sku]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              className="w-full text-xs text-right border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400 bg-white font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePrintTags('single')}
                      className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4" /> Download 1 Sample Label
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintTags('sheet')}
                      disabled={totalLabels === 0}
                      className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Printer className="h-4 w-4" /> Print All ({totalLabels}) Bulk Sheet
                    </button>
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div className="w-full lg:w-auto flex justify-center shrink-0 p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-56">
                    <Barcode value={previewCode} />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 7. Customer Reviews & Ratings ───────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
                7
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Customer Reviews &amp; Testimonials</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage customer feedback or pre-seed social proof ratings</p>
              </div>
            </div>
            {!isEdit && (
              <span className="text-[10px] text-slate-400 font-semibold">Saved upon product creation</span>
            )}
          </div>

          {/* Add / Edit review form */}
          <div className={`rounded-xl p-4 space-y-3 border ${editingReview ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
            {editingReview && (
              <p className="text-xs font-bold text-indigo-700">
                Editing review by {editingReview.isLocal ? pendingReviews[editingReview.index]?.reviewer_name : editingReview.user_name}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">Customer / Reviewer Name</p>
                <input
                  value={reviewForm.reviewer_name}
                  onChange={(e) => setReviewForm((p) => ({ ...p, reviewer_name: e.target.value }))}
                  placeholder="e.g. Priya Sharma"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-400 bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">Star Rating</p>
                <StarPicker value={reviewForm.rating} onChange={(v) => setReviewForm((p) => ({ ...p, rating: v }))} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1">Review Commentary</p>
              <textarea
                value={reviewForm.review}
                onChange={(e) => setReviewForm((p) => ({ ...p, review: e.target.value }))}
                placeholder="Share customer thoughts on fabric quality, fit, and delivery..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-slate-400 bg-white"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1">Customer Photo (Optional)</p>
              <div className="flex items-center gap-3">
                {(reviewForm.imagePreview || reviewForm.existingImageUrl) ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={reviewForm.imagePreview || reviewForm.existingImageUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removeReviewImage}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-white transition-colors shrink-0 gap-0.5">
                    <ImagePlus className="h-4 w-4 text-slate-400" />
                    <span className="text-[9px] text-slate-400 font-bold">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleReviewImagePick(e.target.files?.[0])}
                    />
                  </label>
                )}
                <p className="text-[11px] text-slate-400">Optional photo displayed next to review</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {editingReview && (
                <Button type="button" size="sm" variant="outline" onClick={cancelEditReview}>
                  Cancel
                </Button>
              )}
              <Button type="button" size="sm" loading={reviewLoading} onClick={handleAddReview}>
                {editingReview ? 'Save Changes' : <><Plus className="h-3.5 w-3.5" /> Add Review</>}
              </Button>
            </div>
          </div>

          {/* Reviews list */}
          {isEdit ? (
            productReviews.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {productReviews.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-700 font-bold text-xs">
                        {r.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{r.user_name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className="h-3 w-3"
                              style={{ fill: s <= r.rating ? '#f59e0b' : 'transparent', color: s <= r.rating ? '#f59e0b' : '#cbd5e1' }}
                            />
                          ))}
                        </div>
                      </div>
                      {r.review && <p className="text-xs text-slate-600 mt-0.5 truncate">{r.review}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditReview(r)}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(r.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            pendingReviews.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pendingReviews.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    {r.imagePreview ? (
                      <img src={r.imagePreview} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-700 font-bold text-xs">
                        {r.reviewer_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{r.reviewer_name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className="h-3 w-3"
                              style={{ fill: s <= r.rating ? '#f59e0b' : 'transparent', color: s <= r.rating ? '#f59e0b' : '#cbd5e1' }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">Pending Save</span>
                      </div>
                      {r.review && <p className="text-xs text-slate-600 mt-0.5 truncate">{r.review}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditReview(r, idx)}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePendingReview(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      </form>

      {/* Interactive Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperModal.isOpen}
        imageSrc={cropperModal.imageSrc}
        aspectRatio={3 / 4}
        allowRatioSwitch={true}
        previewType="product"
        itemName={form.name || 'Sample Product'}
        price={form.offer_price || form.price || 999}
        originalPrice={form.price && form.offer_price ? form.price : null}
        fileNamePrefix={form.product_code || 'product'}
        onClose={() => setCropperModal({ isOpen: false, imageSrc: null, imageIndex: null })}
        onSkipCrop={() => setCropperModal({ isOpen: false, imageSrc: null, imageIndex: null })}
        onCropComplete={handleCroppedImageSave}
      />
    </div>
  );
}

