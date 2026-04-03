import Purchases, {
  PurchasesOffering,
  CustomerInfo,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_API_KEY_IOS = 'appl_QkdOQUSrLbrUvoVdkhmWrrevXDr';
const RC_API_KEY_ANDROID = 'goog_XXXXXXXX'; // TODO: přidat až bude Google Play app

const ENTITLEMENT_ID = 'SlovniQ Pro';

export async function initIAP(): Promise<void> {
  try {
    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    Purchases.configure({ apiKey });
  } catch {
    // RevenueCat init selhalo — app funguje dál bez IAP
  }
}

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  // Zkontrolovat entitlement přesným ID i alternativními variantami
  const active = customerInfo.entitlements.active;
  return (
    active[ENTITLEMENT_ID] !== undefined ||
    active['SlovníQ Pro'] !== undefined ||
    active['pro_lifetime'] !== undefined ||
    Object.keys(active).length > 0 // fallback: jakýkoli aktivní entitlement = PRO
  );
}

export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
    return hasProEntitlement(customerInfo);
  } catch {
    return false;
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePro(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    if (!currentOffering) return false;

    const pkg = currentOffering.availablePackages[0];
    if (!pkg) return false;

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasProEntitlement(customerInfo);
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return hasProEntitlement(customerInfo);
  } catch {
    return false;
  }
}
