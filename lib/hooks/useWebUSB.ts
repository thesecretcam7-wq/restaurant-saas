'use client';

import { useState, useCallback, useEffect } from 'react';
import type { WebUSBDevice, PrinterRequestOptions } from '@/types/printer';

// Common thermal printer vendor/product IDs
const KNOWN_PRINTERS = [
  { vendor: 0x04b8, name: 'Epson' },        // Epson
  { vendor: 0x0519, name: 'Star Micronics' }, // Star Micronics
  { vendor: 0x03f0, name: 'HP' },             // HP
  { vendor: 0x1055, name: 'Microchip' },      // Microchip
];

export interface UseWebUSBReturn {
  devices: USBDevice[];
  isSupported: boolean;
  error: string | null;
  requestDevice: (options?: PrinterRequestOptions) => Promise<USBDevice | null>;
  connectDevice: (device: USBDevice) => Promise<void>;
  disconnectDevice: (device: USBDevice) => Promise<void>;
  sendData: (device: USBDevice, data: Uint8Array) => Promise<void>;
  getAuthorizedDevices: () => Promise<USBDevice[]>;
  forgetDevice: (device: USBDevice) => Promise<void>;
}

export function useWebUSB(): UseWebUSBReturn {
  const [devices, setDevices] = useState<USBDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return 'usb' in navigator;
  });

  // Get authorized devices on mount
  useEffect(() => {
    if (!isSupported) return;

    const loadDevices = async () => {
      try {
        const authorizedDevices = await navigator.usb.getDevices();
        setDevices(authorizedDevices);
      } catch (err) {
        console.error('Failed to get authorized devices:', err);
        setError('No se pudo cargar dispositivos autorizados');
      }
    };

    loadDevices();
  }, [isSupported]);

  // Request device from user via OS selector
  const requestDevice = useCallback(
    async (options?: PrinterRequestOptions): Promise<USBDevice | null> => {
      if (!isSupported) {
        setError('WebUSB no soportado en este navegador');
        return null;
      }

      try {
        setError(null);
        const filters = options?.filters || KNOWN_PRINTERS.map((p) => ({ vendorId: p.vendor }));

        const device = await navigator.usb.requestDevice({ filters });

        // Add to devices list
        setDevices((prev) => {
          const exists = prev.some(
            (d) => d.vendorId === device.vendorId && d.productId === device.productId
          );
          return exists ? prev : [...prev, device];
        });

        return device;
      } catch (err) {
        if ((err as any).name === 'NotFoundError') {
          setError('No se seleccionó ningún dispositivo');
        } else {
          setError(`Error: ${(err as any).message}`);
        }
        return null;
      }
    },
    [isSupported]
  );

  // Connect to device
  const connectDevice = useCallback(async (device: USBDevice) => {
    try {
      setError(null);
      if (!device.opened) {
        await device.open();
      }
    } catch (err) {
      const errorMsg = `No se pudo conectar: ${(err as any).message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Disconnect from device
  const disconnectDevice = useCallback(async (device: USBDevice) => {
    try {
      setError(null);
      if (device.opened) {
        await device.close();
      }
    } catch (err) {
      const errorMsg = `No se pudo desconectar: ${(err as any).message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Send data to device (ESC/POS commands)
  const sendData = useCallback(async (device: USBDevice, data: Uint8Array) => {
    try {
      setError(null);

      if (!device.opened) {
        await connectDevice(device);
      }

      // Find the first OUT endpoint (typically endpoint 1)
      const outEndpoint = device.configuration?.interfaces[0]?.alternates[0]?.endpoints.find(
        (e) => e.direction === 'out'
      );

      if (!outEndpoint) {
        throw new Error('No OUT endpoint found on device');
      }

      await device.transferOut(outEndpoint.endpointNumber, data);
    } catch (err) {
      const errorMsg = `Error enviando datos: ${(err as any).message}`;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [connectDevice]);

  // Get already authorized devices
  const getAuthorizedDevices = useCallback(async (): Promise<USBDevice[]> => {
    if (!isSupported) return [];

    try {
      const authorizedDevices = await navigator.usb.getDevices();
      setDevices(authorizedDevices);
      return authorizedDevices;
    } catch (err) {
      console.error('Failed to get authorized devices:', err);
      return [];
    }
  }, [isSupported]);

  // Forget device (revoke permission)
  const forgetDevice = useCallback(async (device: USBDevice) => {
    try {
      setError(null);
      if (device.opened) {
        await device.close();
      }
      // Note: WebUSB doesn't have a native forget method,
      // so we just remove it from local state
      setDevices((prev) =>
        prev.filter(
          (d) => !(d.vendorId === device.vendorId && d.productId === device.productId)
        )
      );
    } catch (err) {
      console.error('Error forgetting device:', err);
    }
  }, []);

  return {
    devices,
    isSupported,
    error,
    requestDevice,
    connectDevice,
    disconnectDevice,
    sendData,
    getAuthorizedDevices,
    forgetDevice,
  };
}
