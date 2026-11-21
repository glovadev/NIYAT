import { getShiprocketConfig } from "./config";
import { ShiprocketClient } from "./client";
import { ShiprocketValidationError } from "./errors";

export interface ServiceabilityQuery {
  pickupPincode?: string;
  deliveryPincode: string;
  weightGrams: number;
  cod: boolean;
}

export interface AvailableCourier {
  courierCompanyId: number;
  courierName: string;
  rate: number;
  etd: string;
  estimatedDeliveryDays?: number;
  rating?: number;
  isSurface: boolean;
  isRecommended: boolean;
}

export interface ServiceabilityResponse {
  pickupPincode: string;
  deliveryPincode: string;
  weightGrams: number;
  isCod: boolean;
  couriers: AvailableCourier[];
}

interface ShiprocketRawCourier {
  courier_company_id: number;
  courier_name: string;
  rate: number | string;
  etd?: string;
  estimated_delivery_days?: string | number;
  rating?: number | string;
  is_surface?: boolean;
}

interface ShiprocketServiceabilityApiData {
  status?: number;
  data?: {
    available_courier_companies?: ShiprocketRawCourier[];
    recommended_courier_company_id?: number;
  };
}

export async function checkCourierServiceability(
  query: ServiceabilityQuery,
  client: ShiprocketClient = new ShiprocketClient()
): Promise<ServiceabilityResponse> {
  const config = getShiprocketConfig();
  const pickupPincode = query.pickupPincode?.trim() || config.warehousePin;

  if (!pickupPincode || !/^\d{6}$/.test(pickupPincode)) {
    throw new ShiprocketValidationError("Invalid warehouse pickup PIN code (must be 6 digits)", 400);
  }

  if (!query.deliveryPincode || !/^\d{6}$/.test(query.deliveryPincode)) {
    throw new ShiprocketValidationError("Invalid customer delivery PIN code (must be 6 digits)", 400);
  }

  if (!query.weightGrams || query.weightGrams < 10 || query.weightGrams > 50000) {
    throw new ShiprocketValidationError("Weight must be between 10 grams and 50,000 grams", 400);
  }

  const weightKg = (query.weightGrams / 1000).toFixed(3);

  const raw = await client.get<ShiprocketServiceabilityApiData>("/courier/serviceability", {
    params: {
      pickup_postcode: pickupPincode,
      delivery_postcode: query.deliveryPincode,
      weight: weightKg,
      cod: query.cod ? 1 : 0,
    },
  });

  const available = raw.data?.available_courier_companies || [];
  const recommendedId = raw.data?.recommended_courier_company_id;

  const couriers: AvailableCourier[] = available.map((c) => ({
    courierCompanyId: c.courier_company_id,
    courierName: c.courier_name,
    rate: typeof c.rate === "number" ? c.rate : parseFloat(String(c.rate)) || 0,
    etd: c.etd || "2-5 days",
    estimatedDeliveryDays:
      typeof c.estimated_delivery_days === "number"
        ? c.estimated_delivery_days
        : parseInt(String(c.estimated_delivery_days || "0"), 10) || undefined,
    rating: typeof c.rating === "number" ? c.rating : parseFloat(String(c.rating)) || undefined,
    isSurface: Boolean(c.is_surface),
    isRecommended: c.courier_company_id === recommendedId,
  }));

  // Sort: Recommended courier first, then lowest rate
  couriers.sort((a, b) => {
    if (a.isRecommended) return -1;
    if (b.isRecommended) return 1;
    return a.rate - b.rate;
  });

  return {
    pickupPincode,
    deliveryPincode: query.deliveryPincode,
    weightGrams: query.weightGrams,
    isCod: query.cod,
    couriers,
  };
}

