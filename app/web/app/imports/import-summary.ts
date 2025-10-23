export type ImportSummary = {
  message: string;
  detail?: string | null;
  counters: {
    vendors: number;
    locations: number;
    items: number;
    barcodes: number;
    inventoryRecords: number;
    customers: number;
    sales: number;
    purchaseOrders: number;
    receivings: number;
    warnings: string[];
  };
  importedAt: string;
  clearedSampleData: boolean;
};

const baseMockImportSummary: Omit<ImportSummary, 'importedAt'> = {
  message: 'Demo import completed successfully',
  detail: 'Start the FastAPI server to import live STORIS exports.',
  counters: {
    vendors: 12,
    locations: 5,
    items: 86,
    barcodes: 132,
    inventoryRecords: 243,
    customers: 57,
    sales: 18,
    purchaseOrders: 9,
    receivings: 6,
    warnings: [
      '6 vendor phone numbers were normalised to E.164 format.',
      '3 item records were merged based on shared SKU and UPC matches.'
    ]
  },
  clearedSampleData: true
};

export const createMockImportSummary = (): ImportSummary => ({
  ...baseMockImportSummary,
  counters: {
    ...baseMockImportSummary.counters,
    warnings: [...baseMockImportSummary.counters.warnings]
  },
  importedAt: new Date().toISOString()
});
