import React, { useState } from 'react';
import useForm from '../../utils/useForm';
import validationSchemas from '../../utils/validationSchemas';
import { MenuItem } from '../../services/menuService';
import { useMenuItems, useCategories } from '../../hooks/useMenu';

interface MenuItemFormProps {
  initialData?: Partial<MenuItem>;
  onSuccess?: (menuItem: MenuItem) => void;
  onCancel?: () => void;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  initialData = {},
  onSuccess,
  onCancel
}) => {
  const { createMenuItem, updateMenuItem, isCreating, isUpdating } = useMenuItems();
  const { categories } = useCategories();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const isEditMode = !!initialData.id;

  // Define initial form values
  const initialValues = {
    name: initialData.name || '',
    description: initialData.description || '',
    price: initialData.price !== undefined ? initialData.price : 0,
    category: initialData.category || (categories && categories.length > 0 ? categories[0].id : ''),
    ingredients: initialData.ingredients || [],
    isVegetarian: initialData.isVegetarian || false,
    isVegan: initialData.isVegan || false,
    isGlutenFree: initialData.isGlutenFree || false,
    isSpicy: initialData.isSpicy || false,
    preparationTime: initialData.preparationTime || 0,
    isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true,
  };

  // Initialize form with validation
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit: submitForm,
    setFieldValue,
    isSubmitting,
    isValid
  } = useForm({
    initialValues,
    validationRules: validationSchemas.menu.menuItem,
    onSubmit: handleSubmit
  });

  // Form submission handler
  async function handleSubmit(formValues: typeof initialValues) {
    try {
      console.log("Form submitted with values:", formValues);
      
      // Create the menu item data
      const menuItemData: Partial<MenuItem> = {
        ...formValues,
        price: Number(formValues.price),
        ...(formValues.preparationTime && { preparationTime: Number(formValues.preparationTime) })
      };
      
      console.log("Prepared menu item data:", menuItemData);

      let result: Partial<MenuItem> = {};
      if (isEditMode && initialData.id) {
        // Update existing menu item
        console.log("Updating existing menu item with ID:", initialData.id);
        try {
          // @ts-ignore - Waiting for the mutation to complete
          await updateMenuItem({
            id: initialData.id,
            data: menuItemData
          });
          console.log("Update successful");
        } catch (updateError) {
          console.error("Update failed:", updateError);
        }
      } else {
        // Create new menu item
        console.log("Creating new menu item");
        try {
          // @ts-ignore - Waiting for the mutation to complete
          await createMenuItem(menuItemData);
          console.log("Creation successful");
        } catch (createError) {
          console.error("Creation failed:", createError);
        }
      }

      // Handle image upload if needed
      // This is just a placeholder - you'll need to implement image upload separately
      if (imageFile) {
        // TODO: Implement image upload
        console.log('Image will be uploaded:', imageFile.name);
      }

      if (onSuccess) {
        // We're not returning anything here since we'll rely on 
        // React Query's cache updates
        console.log("Calling onSuccess callback");
        onSuccess({
          ...initialData,
          ...menuItemData,
          id: initialData.id || 'temp-id',
        } as MenuItem);
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert(`Error saving menu item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle ingredients input
  const handleIngredientsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ingredientsText = e.target.value;
    const ingredientsArray = ingredientsText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item !== '');
    
    setFieldValue('ingredients', ingredientsArray);
  };

  const getIngredientsText = () => {
    return Array.isArray(values.ingredients) 
      ? values.ingredients.join('\n') 
      : '';
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

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

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="price"
              name="price"
              value={values.price}
              onChange={handleChange}
              onBlur={handleBlur}
              min="0"
              step="0.01"
              className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                touched.price && errors.price ? 'border-red-500' : ''
              }`}
            />
          </div>
          {touched.price && errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price}</p>
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
            value={typeof values.category === 'string' ? values.category : values.category?.id || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.category && errors.category ? 'border-red-500' : ''
            }`}
          >
            {!categories || categories.length === 0 ? (
              <option value="">No categories available</option>
            ) : (
              categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            )}
          </select>
          {touched.category && errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Preparation Time */}
        <div>
          <label htmlFor="preparationTime" className="block text-sm font-medium text-gray-700">
            Preparation Time (minutes)
          </label>
          <input
            type="number"
            id="preparationTime"
            name="preparationTime"
            value={values.preparationTime}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0"
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              touched.preparationTime && errors.preparationTime ? 'border-red-500' : ''
            }`}
          />
          {touched.preparationTime && errors.preparationTime && (
            <p className="mt-1 text-sm text-red-600">{errors.preparationTime}</p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">
            Menu Item Image
          </label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {imageFile && (
            <p className="mt-1 text-sm text-gray-500">Selected: {imageFile.name}</p>
          )}
          {initialData.imageUrl && !imageFile && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">Current image:</p>
              <img 
                src={initialData.imageUrl} 
                alt={initialData.name} 
                className="h-20 w-20 object-cover rounded"
              />
            </div>
          )}
        </div>

        {/* Dietary Options */}
        <div className="space-y-3">
          <p className="block text-sm font-medium text-gray-700">Dietary Options</p>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isVegetarian"
              name="isVegetarian"
              checked={values.isVegetarian}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isVegetarian" className="ml-2 block text-sm text-gray-700">
              Vegetarian
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isVegan"
              name="isVegan"
              checked={values.isVegan}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isVegan" className="ml-2 block text-sm text-gray-700">
              Vegan
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGlutenFree"
              name="isGlutenFree"
              checked={values.isGlutenFree}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isGlutenFree" className="ml-2 block text-sm text-gray-700">
              Gluten Free
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isSpicy"
              name="isSpicy"
              checked={values.isSpicy}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isSpicy" className="ml-2 block text-sm text-gray-700">
              Spicy
            </label>
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center h-full">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAvailable"
              name="isAvailable"
              checked={values.isAvailable}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-700">
              Available for ordering
            </label>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={3}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            touched.description && errors.description ? 'border-red-500' : ''
          }`}
        />
        {touched.description && errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Ingredients */}
      <div>
        <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700">
          Ingredients (one per line)
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          value={getIngredientsText()}
          onChange={handleIngredientsChange}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Tomato&#10;Cheese&#10;Basil"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
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
          {isSubmitting 
            ? (isEditMode ? 'Updating...' : 'Creating...') 
            : (isEditMode ? 'Update Item' : 'Create Item')}
        </button>
      </div>
    </form>
  );
};

export default MenuItemForm; 