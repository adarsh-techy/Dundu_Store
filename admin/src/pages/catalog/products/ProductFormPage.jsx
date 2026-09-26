import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackageX, Sparkles, Package } from 'lucide-react';
import { productApi } from '../../../api';
import Spinner from '../../../components/ui/Spinner';
import ProductForm from './ProductForm';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => productApi.getOne(id),
    enabled: isEdit,
  });
  const product = data?.data?.product;

  const backToList = () => navigate('/products');

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    if (isEdit) qc.invalidateQueries({ queryKey: ['admin-product', id] });
    backToList();
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Navigation & Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={backToList}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products Catalog
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEdit ? 'Edit Product Listing' : 'Create New Product Listing'}
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isEdit ? 'Catalog Revision' : 'New Listing Studio'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isEdit
              ? `Updating configuration, variants, and pricing for "${product?.name || 'Loading…'}"`
              : 'Configure merchandising, variants, stock units, images, and pricing for your Dundu catalog'}
          </p>
        </div>
      </div>

      {isEdit && isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Spinner />
          <p className="text-xs font-semibold text-slate-500">Loading product configuration...</p>
        </div>
      ) : isEdit && !product ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 text-center">
          <PackageX className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-800 font-bold text-base">Product Not Found</p>
          <p className="text-xs text-slate-400 mt-1">This product may have been removed or does not exist.</p>
          <button
            onClick={backToList}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Return to Products
          </button>
        </div>
      ) : (
        <ProductForm
          product={isEdit ? product : null}
          onCancel={backToList}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
