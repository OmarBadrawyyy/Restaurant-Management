import React from 'react';
import useForm from '../../utils/useForm';
import validationSchemas from '../../utils/validationSchemas';
import inventoryService, { InventoryItem, InventoryCategory } from '../../services/inventoryService';
import { useInventoryOperations } from '../../hooks/useInventory';

interface InventoryFormProps {
  initialData?: Partial<InventoryItem>;
  onSuccess?: (item: InventoryItem) => void;
  onCancel?: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({
  initialData = {},
  onSuccess,
  onCancel
}) => {
  const { createItem, updateItem, isCreating, isUpdating } = useInventoryOperations();
  const isEditMode = !!initialData.id;

  // Define initial form values
  const initialValues = {
    name: initialData.name || '',
    category: initialData.category || 'ingredient' as InventoryCategory,
    unit: initialData.unit || '',
    currentStock: initialData.currentStock !== undefined ? initialData.currentStock : 0,
    minStockLevel: initialData.minStockLevel !== undefined ? initialData.minStockLevel : 0,
    reorderPoint: initialData.reorderPoint !== undefined ? initialData.reorderPoint : 0,
    costPerUnit: initialData.costPerUnit !== undefined ? initialData.costPerUnit : 0,
    supplier: initialData.supplier || '',
    supplierContact: initialData.supplierContact || '',
    location: initialData.location || '',
    isActive: initialData.isActive !== undefined ? initialData.isActive : true
  };

  // Define form submission handler
  const handleSubmit = async (values: typeof initialValues) => {
    try {
      if (isEditMode && initialData.id) {
        // Update existing item
        await updateItem({
          id: initialData.id,
          data: values as Partial<InventoryItem>
        });
        
        if (onSuccess) {
          // For updates, we'll refetch the item manually via the service
          const updatedItem = await inventoryService.getItemById(initialData.id);
          onSuccess(updatedItem);
        }
      } else {
        // Create new item
        await createItem(values as Partial<InventoryItem>, {
          onSuccess: (newItem) => {
            if (onSuccess) {
              onSuccess(newItem);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error saving inventory item:', error);
    }
  };

  // Initialize form with validation
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit: submitForm,
    isSubmitting,
    isValid
  } = useForm({
    initialValues,
    validationRules: validationSchemas.inventory.inventoryItem,
    onSubmit: handleSubmit
  });

  // Category options
  const categoryOptions = [
    { value: 'ingredient', label: 'Ingredient' },
    { value: 'beverage', label: 'Beverage' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'equipment', label: 'Equipment' }
  ];

  return (
    <form onSubmit={submitForm} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.name && errors.name ? 'border-red-500' : ''
            }`}
          />
          {touched.name && errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={values.category}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.category && errors.category ? 'border-red-500' : ''
            }`}
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {touched.category && errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
            Unit of Measurement <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            value={values.unit}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g., kg, liters, pieces"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.unit && errors.unit ? 'border-red-500' : ''
            }`}
          />
          {touched.unit && errors.unit && (
            <p className="mt-1 text-sm text-red-600">{errors.unit}</p>
          )}
        </div>

        {/* Current Stock */}
        <div>
          <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700">
            Current Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="currentStock"
            name="currentStock"
            value={values.currentStock}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0"
            step="0.01"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.currentStock && errors.currentStock ? 'border-red-500' : ''
            }`}
          />
          {touched.currentStock && errors.currentStock && (
            <p className="mt-1 text-sm text-red-600">{errors.currentStock}</p>
          )}
        </div>

        {/* Min Stock Level */}
        <div>
          <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700">
            Minimum Stock Level <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="minStockLevel"
            name="minStockLevel"
            value={values.minStockLevel}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0"
            step="0.01"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.minStockLevel && errors.minStockLevel ? 'border-red-500' : ''
            }`}
          />
          {touched.minStockLevel && errors.minStockLevel && (
            <p className="mt-1 text-sm text-red-600">{errors.minStockLevel}</p>
          )}
        </div>

        {/* Reorder Point */}
        <div>
          <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700">
            Reorder Point
          </label>
          <input
            type="number"
            id="reorderPoint"
            name="reorderPoint"
            value={values.reorderPoint}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0"
            step="0.01"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.reorderPoint && errors.reorderPoint ? 'border-red-500' : ''
            }`}
          />
          {touched.reorderPoint && errors.reorderPoint && (
            <p className="mt-1 text-sm text-red-600">{errors.reorderPoint}</p>
          )}
        </div>

        {/* Cost Per Unit */}
        <div>
          <label htmlFor="costPerUnit" className="block text-sm font-medium text-gray-700">
            Cost per Unit
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="costPerUnit"
              name="costPerUnit"
              value={values.costPerUnit}
              onChange={handleChange}
              onBlur={handleBlur}
              min="0"
              step="0.01"
              className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                touched.costPerUnit && errors.costPerUnit ? 'border-red-500' : ''
              }`}
            />
          </div>
          {touched.costPerUnit && errors.costPerUnit && (
            <p className="mt-1 text-sm text-red-600">{errors.costPerUnit}</p>
          )}
        </div>

        {/* Supplier */}
        <div>
          <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
            Supplier
          </label>
          <input
            type="text"
            id="supplier"
            name="supplier"
            value={values.supplier}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.supplier && errors.supplier ? 'border-red-500' : ''
            }`}
          />
          {touched.supplier && errors.supplier && (
            <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>
          )}
        </div>

        {/* Supplier Contact */}
        <div>
          <label htmlFor="supplierContact" className="block text-sm font-medium text-gray-700">
            Supplier Contact
          </label>
          <input
            type="text"
            id="supplierContact"
            name="supplierContact"
            value={values.supplierContact}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.supplierContact && errors.supplierContact ? 'border-red-500' : ''
            }`}
          />
          {touched.supplierContact && errors.supplierContact && (
            <p className="mt-1 text-sm text-red-600">{errors.supplierContact}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Storage Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={values.location}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.location && errors.location ? 'border-red-500' : ''
            }`}
          />
          {touched.location && errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}
        </div>

        {/* Is Active */}
        <div className="flex items-center h-full">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={values.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active item
            </label>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 mt-8">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSubmitting || !isValid
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Item' : 'Create Item'}
        </button>
      </div>
    </form>
  );
};

export default InventoryForm; 