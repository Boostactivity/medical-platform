/**
 * Script de vérification des exports
 * Permet de tester que tous les modules exportent correctement
 */

// Vérifier imports compliance-calculator
import {
  calculateCPAMCompliance,
  checkAllPatientsCompliance,
  generateComplianceAlerts,
  saveComplianceHistory,
  createComplianceAlertInQueue,
  runDailyComplianceCheck,
} from './compliance-calculator.ts';

// Vérifier imports stock-manager
import {
  registerEquipment,
  renewEquipment,
  checkUpcomingRenewals,
  generateRenewalAlerts,
  createRenewalAlertInQueue,
  setupPatientEquipment,
  EQUIPMENT_CATALOG,
} from './stock-manager.ts';

// Vérifier imports business-routes
import businessRoutes from './business-routes.ts';

console.log('✅ All exports verified successfully!');
console.log('');
console.log('Compliance Calculator exports:');
console.log('  - calculateCPAMCompliance:', typeof calculateCPAMCompliance);
console.log('  - checkAllPatientsCompliance:', typeof checkAllPatientsCompliance);
console.log('  - generateComplianceAlerts:', typeof generateComplianceAlerts);
console.log('  - saveComplianceHistory:', typeof saveComplianceHistory);
console.log('  - createComplianceAlertInQueue:', typeof createComplianceAlertInQueue);
console.log('  - runDailyComplianceCheck:', typeof runDailyComplianceCheck);
console.log('');
console.log('Stock Manager exports:');
console.log('  - registerEquipment:', typeof registerEquipment);
console.log('  - renewEquipment:', typeof renewEquipment);
console.log('  - checkUpcomingRenewals:', typeof checkUpcomingRenewals);
console.log('  - generateRenewalAlerts:', typeof generateRenewalAlerts);
console.log('  - createRenewalAlertInQueue:', typeof createRenewalAlertInQueue);
console.log('  - setupPatientEquipment:', typeof setupPatientEquipment);
console.log('  - EQUIPMENT_CATALOG:', typeof EQUIPMENT_CATALOG);
console.log('');
console.log('Business Routes exports:');
console.log('  - businessRoutes:', typeof businessRoutes);
console.log('');
console.log('🎉 All modules are correctly exported!');
