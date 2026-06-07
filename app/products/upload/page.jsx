'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMode } from '@/lib/ModeContext';
import Papa from 'papaparse';

export default function ProductUploadPage() {
  const { service, config } = useMode();

  // Single product form
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [addMessage, setAddMessage] = useState(null);
  const [addError, setAddError] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // CSV upload
  const [csvMessage, setCsvMessage] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Add single product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddMessage(null);

    // Validate inputs
    if (!name.trim() || !barcode.trim() || !price.trim()) {
      setAddError('All fields are required');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setAddError('Price must be a positive number');
      return;
    }

    setIsAddingProduct(true);
    try {
      console.log('[POS] Uploading product:', { name, barcode, price: priceNum });
      await service.uploadProducts([
        {
          name: name.trim(),
          barcode: barcode.trim(),
          price: priceNum,
        },
      ]);
      console.log('[POS] Product uploaded successfully');
      setAddMessage(`✓ Product "${name}" added successfully!`);
      setName('');
      setBarcode('');
      setPrice('');
    } catch (err) {
      console.error('[POS] Upload error:', err);
      setAddError(err.message || err.toString() || 'Failed to add product');
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Validate CSV structure
  const validateCSV = (data) => {
    if (data.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = data[0];
    const expectedHeaders = ['Item Name', 'Barcode', 'Price'];

    // Check column count
    if (headers.length !== 3) {
      throw new Error(
        `CSV must have exactly 3 columns. Found ${headers.length}. ` +
        `Expected: Item Name, Barcode, Price`
      );
    }

    // Check column names (case-insensitive)
    const headersMapped = headers.map((h) => h.trim().toLowerCase());
    const expectedMapped = expectedHeaders.map((h) => h.toLowerCase());

    for (let i = 0; i < 3; i++) {
      if (headersMapped[i] !== expectedMapped[i]) {
        throw new Error(
          `Column ${i + 1} mismatch. Expected "${expectedHeaders[i]}", ` +
          `but got "${headers[i]}". Columns must be in order: Item Name, Barcode, Price`
        );
      }
    }

    // Validate data rows
    const products = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (row.every((cell) => !cell || cell.trim() === '')) {
        continue;
      }

      // Check row has exactly 3 columns
      if (row.length !== 3) {
        throw new Error(
          `Row ${i + 1} has ${row.length} columns, expected 3. ` +
          `Make sure no extra columns are present.`
        );
      }

      const itemName = row[0]?.trim();
      const itemBarcode = row[1]?.trim();
      const itemPrice = row[2]?.trim();

      // Validate required fields
      if (!itemName) {
        throw new Error(`Row ${i + 1}: Item Name is required`);
      }
      if (!itemBarcode) {
        throw new Error(`Row ${i + 1}: Barcode is required`);
      }
      if (!itemPrice) {
        throw new Error(`Row ${i + 1}: Price is required`);
      }

      // Validate price is numeric
      const priceNum = parseFloat(itemPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error(`Row ${i + 1}: Price must be a positive number. Got "${itemPrice}"`);
      }

      products.push({
        name: itemName,
        barcode: itemBarcode,
        price: priceNum,
      });
    }

    if (products.length === 0) {
      throw new Error('CSV file contains no valid product rows');
    }

    return products;
  };

  // Handle CSV file upload
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setCsvMessage(null);
    setUploadProgress(null);

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a .csv file');
      return;
    }

    // Parse CSV
    Papa.parse(file, {
      complete: async (results) => {
        try {
          const products = validateCSV(results.data);

          setIsUploadingCsv(true);
          setUploadProgress({ current: 0, total: products.length });

          // Upload products one by one to show progress
          for (let i = 0; i < products.length; i++) {
            await service.uploadProducts([products[i]]);
            setUploadProgress({ current: i + 1, total: products.length });
          }

          setCsvMessage(
            `✓ Successfully uploaded ${products.length} product(s) from CSV!`
          );
          e.target.value = ''; // Reset file input
        } catch (err) {
          setCsvError(err.message || 'Failed to parse CSV');
        } finally {
          setIsUploadingCsv(false);
          setUploadProgress(null);
        }
      },
      error: (err) => {
        setCsvError(`CSV parsing error: ${err.message}`);
      },
    });
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = 'Item Name,Barcode,Price\nSample Product,1234567890123,99.99';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_template.csv');
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-4 border-pos-primary shadow-md">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-pos-primary px-6 py-2 rounded font-bold text-white text-xl tracking-wide">
              CARTALOGUE
            </div>
            <div className="text-gray-700 font-semibold text-lg">Product Upload</div>
            <div className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded font-mono font-bold">
              {config.mode === 'online' ? 'FIREBASE' : 'LOCAL'}
            </div>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-5 py-2 rounded-lg text-sm uppercase tracking-wide transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-2 gap-8">
          {/* Left: Single Product Upload */}
          <div className="bg-white border-2 border-gray-300 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-100 border-b-2 border-gray-300 px-6 py-3">
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-sm">
                Add Single Product
              </h2>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Safeguard Soap"
                  disabled={isAddingProduct}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pos-primary font-mono text-sm disabled:bg-gray-100"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Barcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g., 4800014101016"
                  disabled={isAddingProduct}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pos-primary font-mono text-sm disabled:bg-gray-100"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 58.00"
                  disabled={isAddingProduct}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pos-primary font-mono text-sm disabled:bg-gray-100"
                />
              </div>

              {/* Messages */}
              {addError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-semibold">
                    <span className="mr-2">❌</span>
                    {addError}
                  </p>
                </div>
              )}
              {addMessage && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-green-700 text-sm font-semibold">{addMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isAddingProduct}
                className="w-full bg-pos-primary hover:bg-pos-primary-dark text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingProduct ? 'Adding...' : '+ Add Product'}
              </button>
            </form>
          </div>

          {/* Right: CSV Upload */}
          <div className="bg-white border-2 border-gray-300 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-100 border-b-2 border-gray-300 px-6 py-3">
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-sm">
                Upload CSV File
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <p className="text-blue-700 text-sm font-semibold mb-3">
                  📥 Need the correct format?
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg text-sm uppercase tracking-wide transition-colors"
                >
                  📄 Download CSV Template
                </button>
              </div>

              {/* CSV Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Upload CSV File <span className="text-red-500">*</span>
                </label>
                <div className="border-3 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pos-primary transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={isUploadingCsv}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer block"
                  >
                    <svg className="mx-auto w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <p className="text-gray-600 font-semibold">
                      Click to upload CSV or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      CSV with 3 columns: Item Name, Barcode, Price
                    </p>
                  </label>
                </div>
              </div>

              {/* Progress Bar */}
              {uploadProgress && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-2 font-mono">
                    {uploadProgress.current} / {uploadProgress.total} products uploaded
                  </p>
                </div>
              )}

              {/* Messages */}
              {csvError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-semibold">
                    <span className="mr-2">❌</span>
                    {csvError}
                  </p>
                </div>
              )}
              {csvMessage && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-green-700 text-sm font-semibold">{csvMessage}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-xs text-yellow-800">
                <p className="font-bold mb-2">📋 CSV Format Requirements:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Exactly 3 columns: Item Name, Barcode, Price</li>
                  <li>Column order must match the template</li>
                  <li>No extra columns allowed</li>
                  <li>Price must be numeric (e.g., 99.99)</li>
                  <li>All fields are required</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
