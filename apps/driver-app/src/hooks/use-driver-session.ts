import { useEffect, useState } from "react";
import { getCurrentDriverProfile, normalizeError, type DriverProfile } from "../lib/driver-data";

export function useDriverSession() {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const nextDriver = await getCurrentDriverProfile();
      setDriver(nextDriver);
      return nextDriver;
    } catch (nextError) {
      setDriver(null);
      setError(normalizeError(nextError));
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    driver,
    loading,
    error,
    refresh,
  };
}
