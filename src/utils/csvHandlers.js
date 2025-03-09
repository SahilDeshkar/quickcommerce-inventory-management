// Optimized CSV Handling Module

/**
 * Parses a CSV string into an array of objects.
 * @param {string} csvString - The CSV string to parse.
 * @returns {Array<Object>} - The parsed data as an array of objects.
 */
export const parseCSV = (csvString) => {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim());
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index] || "";
            return obj;
        }, {});
    }).filter(row => Object.values(row).some(val => val !== ""));
};

/**
 * Formats an array of objects into a CSV string.
 * @param {Array<Object>} data - The data to format as CSV.
 * @returns {string} - The formatted CSV string.
 */
export const formatCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header] !== undefined ? row[header] : '';
            return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(','))
    ];
    return csvRows.join('\n');
};

/**
 * Exports data to a CSV file and triggers a download.
 * @param {Array<Object>} data - The data to export.
 * @param {string} filename - The name of the file to download.
 */
export const exportToCSV = (data, filename = 'inventory_data.csv') => {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("No data available for export.");
        return;
    }
    
    const csvString = formatCSV(data);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Parses a CSV file into an array of objects.
 * @param {File} file - The CSV file to parse.
 * @returns {Promise<Array<Object>>} - A promise that resolves to the parsed data as an array of objects.
 */
export const parseImportedCSV = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject("No file provided.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvString = event.target.result;
                const parsedData = parseCSV(csvString);
                resolve(parsedData);
            } catch (error) {
                reject(`Error parsing CSV: ${error.message}`);
            }
        };
        reader.onerror = (error) => reject(`File reading error: ${error.message}`);
        reader.readAsText(file);
    });
};

/**
 * Validates the parsed CSV data.
 * @param {Array<Object>} data - The parsed CSV data.
 * @returns {Object} - An object containing the validation result, errors, and valid data.
 */
export const validateCSVData = (data) => {
    const requiredFields = ['name', 'quantity', 'unit', 'category', 'orderDate', 'replenishmentTime'];
    const errors = [];
    const validData = [];

    data.forEach((item, index) => {
        const missingFields = requiredFields.filter(field => !(field in item) || item[field].trim() === '');
        
        if (missingFields.length > 0) {
            errors.push(`Row ${index + 1} is missing required fields: ${missingFields.join(', ')}`);
        } else {
            validData.push({
                ...item,
                quantity: isNaN(item.quantity) ? 0 : parseInt(item.quantity, 10),
                replenishmentTime: isNaN(item.replenishmentTime) ? 0 : parseInt(item.replenishmentTime, 10)
            });
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        data: validData
    };
};
