import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackageX } from 'lucide-react';
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
    <div className="space-y-5 pb-10">
      <button
        type="button"
        onClick={backToList}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isEdit
            ? `Editing "${product?.name || '…'}"`
            : 'Fill in the details below to list a new product on Dundu Online'}
        </p>
      </div>

      {isEdit && isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : isEdit && !product ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <PackageX className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-bold text-sm">Product not found</p>
          <p className="text-xs text-gray-400 mt-1">It may have been deleted. Go back and try again.</p>
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
