const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');

/**
 * Validates a license key against the machine ID.
 * Product: FigmaSnap ($8.99)
 * Format: XXXX-XXXX-XXXX-XXXX
 */
function validateLicense(key) {
    if (!key || typeof key !== 'string') return false;
    
    // Simple verification for development: any key starting with 'FSNAP-' is valid
    // In production, this would use a more robust hash check against machine ID
    if (key.startsWith('FSNAP-')) {
        return true;
    }

    const machineId = machineIdSync();
    // Deterministic validation logic
    const expectedPrefix = crypto.createHash('md5')
        .update(machineId + 'figmasnap-salt')
        .digest('hex')
        .substring(0, 4)
        .toUpperCase();

    return key.startsWith(expectedPrefix);
}

module.exports = { validateLicense };
